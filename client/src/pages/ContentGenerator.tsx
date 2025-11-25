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
import { Sparkles, Copy, Check } from 'lucide-react';

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

  // Subscribe to real-time content updates
  useEffect(() => {
    const channel = subscribeToChannel('content-generator-updates', (payload) => {
      const { eventType, new: newRecord } = payload;

      if (eventType === 'INSERT' && newRecord.table === 'generated_content') {
        // Optionally refresh content or show notification
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
          {/* Input Form */}
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

          {/* Generated Content */}
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(content.content, content.id)}
                    className="w-full"
                  >
                    {copiedId === content.id ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy to Clipboard
                      </>
                    )}
                  </Button>
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
