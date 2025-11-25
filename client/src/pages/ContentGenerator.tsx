import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { apiClient, GeneratedContent } from '@/lib/api';
import { useRealtime } from '@/contexts/RealtimeContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Sparkles, Copy, Check, Twitter } from 'lucide-react';

const RedditIcon = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
  >
    <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.25-1.25-1.25zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
  </svg>
);

const formSchema = z.object({
  content_type: z.enum(['announcement', 'release', 'news', 'social_post', 'story']),
  context: z.string().min(5, 'Context must be at least 5 characters').max(500),
  max_length: z.number().min(50).max(500).optional(),
  variations: z.number().min(1).max(5).optional(),
  provider: z.enum(['groq', 'openai', 'huggingface', 'auto']).optional(),
});

type FormData = z.infer<typeof formSchema>;

const ContentGenerator = () => {
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { subscribeToChannel, unsubscribeFromChannel, isConnected } = useRealtime();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      content_type: 'social_post',
      context: '',
      max_length: 150,
      variations: 3,
      provider: 'auto',
    },
  });

  useEffect(() => {
    const channel = subscribeToChannel('content-generator-updates', (payload) => {
      const { eventType, new: newRecord } = payload;
      if (eventType === 'INSERT' && newRecord.table === 'generated_content') {
        console.log('New content generated:', newRecord);
      }
    });

    return () => {
      unsubscribeFromChannel(channel);
    };
  }, [subscribeToChannel, unsubscribeFromChannel]);

  const onSubmit = async (values: FormData) => {
    setIsGenerating(true);
    setGeneratedContent([]);

    try {
      const response = await apiClient.generateContent({
        content_type: values.content_type,
        context: values.context,
        max_length: values.max_length,
        variations: values.variations,
        provider: values.provider,
      });

      setGeneratedContent(response.generated_content);

      toast.success('Content generated successfully!', {
        description: `Generated ${response.generation_metadata.variations_generated} variations`,
      });
    } catch (error: any) {
      toast.error('Content generation failed', {
        description: error.message || 'Please try again. Make sure you have an active persona.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const postToX = (content: string) => {
    const tweetText = encodeURIComponent(content);
    window.open(`https://twitter.com/intent/tweet?text=${tweetText}`, '_blank');
  };

  const postToReddit = (content: string) => {
    // [CHANGE] Use a placeholder title instead of generating one
    const title = "*insert title*";
    
    const encodedTitle = encodeURIComponent(title);
    const encodedText = encodeURIComponent(content);
    
    // Safety Net: Copy to clipboard anyway
    navigator.clipboard.writeText(content);
    
    // Use 'old.reddit.com' to ensure body text is populated
    window.open(`https://old.reddit.com/submit?title=${encodedTitle}&text=${encodedText}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <div className="bg-gradient-primary p-3 rounded-full w-16 h-16 mx-auto mb-4 shadow-glow">
            <Sparkles className="h-10 w-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold mb-2">AI Content Generator</h1>
          <p className="text-muted-foreground">
            Generate personalized content using AI based on your artist persona
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-gradient-card shadow-creative border-border/50 h-fit">
            <CardHeader>
              <CardTitle>Content Parameters</CardTitle>
              <CardDescription>
                Configure the type and context for AI-generated content
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="content_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Content Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select content type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="social_post">Social Post</SelectItem>
                            <SelectItem value="announcement">Announcement</SelectItem>
                            <SelectItem value="release">Release</SelectItem>
                            <SelectItem value="news">News</SelectItem>
                            <SelectItem value="story">Story</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="context"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Context</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe what you want to post about... (e.g., 'new single dropping Friday', 'upcoming tour dates')"
                            className="resize-none h-24"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Provide context for the AI to generate relevant content
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="provider"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>AI Provider</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select AI provider" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="auto">Auto (Recommended)</SelectItem>
                            <SelectItem value="groq">Groq (Fast)</SelectItem>
                            <SelectItem value="openai">OpenAI (Premium)</SelectItem>
                            <SelectItem value="huggingface">HuggingFace</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="variations"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Variations</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              max={5}
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="max_length"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max Length</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={50}
                              max={500}
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-primary shadow-creative hover:shadow-glow transition-all duration-300"
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <>
                        <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate Content
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Generated Content</h2>

            {generatedContent.length === 0 && !isGenerating && (
              <Card className="bg-gradient-card shadow-card border-border/50">
                <CardContent className="py-12 text-center">
                  <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No content generated yet. Fill out the form and click "Generate Content" to get started.
                  </p>
                </CardContent>
              </Card>
            )}

            {isGenerating && (
              <Card className="bg-gradient-card shadow-card border-border/50">
                <CardContent className="py-12 text-center">
                  <Sparkles className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
                  <p className="text-muted-foreground">Generating content with AI...</p>
                </CardContent>
              </Card>
            )}

            {generatedContent.map((content, index) => (
              <Card
                key={content.id || index}
                className="bg-gradient-card shadow-creative border-border/50 hover:shadow-glow transition-all duration-300"
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      Variation {content.variation_id}
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">
                        Score: {(content.quality_score * 100).toFixed(0)}%
                      </Badge>
                      <Badge variant="secondary" className="capitalize">
                        {content.model_used}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed mb-4">{content.content}</p>
                  
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(content.content, content.id)}
                      className="flex-1"
                    >
                      {copiedId === content.id ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy
                        </>
                      )}
                    </Button>
                    
                    <Button
                      variant="default" 
                      size="sm"
                      onClick={() => postToX(content.content)}
                      className="flex-1 bg-black text-white hover:bg-black/90"
                    >
                      <Twitter className="h-4 w-4 mr-2" />
                      Post to X
                    </Button>

                    <Button
                      variant="default" 
                      size="sm"
                      onClick={() => postToReddit(content.content)}
                      className="flex-1 bg-[#FF4500] text-white hover:bg-[#FF4500]/90"
                    >
                      <RedditIcon className="h-4 w-4 mr-2" />
                      Post to Reddit
                    </Button>
                  </div>

                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentGenerator;