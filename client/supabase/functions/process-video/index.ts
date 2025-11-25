import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Replicate from "https://esm.sh/replicate@0.25.2"

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
    const { videoUrl, operation, startTime, endTime, format = 'mp4' } = await req.json()

    if (!videoUrl || !operation) {
      return new Response(
        JSON.stringify({ error: 'Video URL and operation are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const REPLICATE_API_KEY = Deno.env.get('REPLICATE_API_KEY')
    if (!REPLICATE_API_KEY) {
      throw new Error('REPLICATE_API_KEY is not configured')
    }

    const replicate = new Replicate({
      auth: REPLICATE_API_KEY,
    })

    console.log(`Processing video with operation: ${operation}`)

    let output

    switch (operation) {
      case 'trim':
        if (!startTime || !endTime) {
          throw new Error('Start time and end time are required for trimming')
        }
        
        output = await replicate.run(
          "anotherjesse/ffmpeg",
          {
            input: {
              input_video: videoUrl,
              start_time: startTime,
              end_time: endTime,
              output_format: format
            }
          }
        )
        break

      case 'convert':
        output = await replicate.run(
          "anotherjesse/ffmpeg",
          {
            input: {
              input_video: videoUrl,
              output_format: format
            }
          }
        )
        break

      default:
        throw new Error(`Unsupported operation: ${operation}`)
    }

    console.log('Video processed successfully')

    return new Response(
      JSON.stringify({ 
        processedVideoUrl: output,
        operation,
        format
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error processing video:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process video', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})