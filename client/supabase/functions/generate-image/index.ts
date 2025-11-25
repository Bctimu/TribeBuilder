import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { HfInference } from 'https://esm.sh/@huggingface/inference@2.3.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { prompt, width = 1024, height = 1024, steps = 30 } = await req.json()

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const STABILITY_API_KEY = Deno.env.get('STABILITY_API_KEY')
    const HUGGING_FACE_ACCESS_TOKEN = Deno.env.get('HUGGING_FACE_ACCESS_TOKEN')

    // Enhance prompt for better quality
    const enhancedPrompt = `${prompt}, ultra high quality, 8k resolution, highly detailed, professional photography, sharp focus, vibrant colors, perfect composition, masterpiece`
    
    console.log('Attempting image generation with enhanced prompt:', enhancedPrompt)

    // Try Stability AI first
    if (STABILITY_API_KEY) {
      try {
        console.log('Trying Stability AI...')
        const response = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${STABILITY_API_KEY}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            text_prompts: [
              {
                text: enhancedPrompt,
                weight: 1
              }
            ],
            cfg_scale: 7,
            height: height,
            width: width,
            steps: steps,
            samples: 1,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          
          if (data.artifacts && data.artifacts.length > 0) {
            const imageBase64 = data.artifacts[0].base64
            const imageUrl = `data:image/png;base64,${imageBase64}`

            console.log('Image generated successfully with Stability AI')

            return new Response(
              JSON.stringify({ 
                imageUrl,
                prompt,
                width,
                height,
                provider: 'stability'
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
        } else {
          const errorData = await response.json()
          console.log('Stability API failed:', errorData.message)
          
          // Check if it's a credit/balance issue, then fallback to Hugging Face
          if (errorData.message && errorData.message.includes('balance')) {
            console.log('Credit issue detected, falling back to Hugging Face...')
          } else {
            throw new Error(`Stability API error: ${errorData.message}`)
          }
        }
      } catch (error) {
        console.log('Stability AI failed, trying fallback:', error.message)
      }
    }

    // Fallback to Hugging Face
    if (HUGGING_FACE_ACCESS_TOKEN) {
      console.log('Using Hugging Face as fallback...')
      const hf = new HfInference(HUGGING_FACE_ACCESS_TOKEN)

      const image = await hf.textToImage({
        inputs: enhancedPrompt,
        model: 'black-forest-labs/FLUX.1-schnell',
      })

      // Convert the blob to a base64 string
      const arrayBuffer = await image.arrayBuffer()
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
      const imageUrl = `data:image/png;base64,${base64}`

      console.log('Image generated successfully with Hugging Face')

      return new Response(
        JSON.stringify({ 
          imageUrl,
          prompt,
          width,
          height,
          provider: 'huggingface'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    throw new Error('No API keys configured for image generation')

  } catch (error) {
    console.error('Error generating image:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate image', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})