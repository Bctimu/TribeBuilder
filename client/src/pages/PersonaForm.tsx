import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useArtistStore, ArtistData } from '@/stores/artistStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { User, Palette, FileText } from 'lucide-react';

const formSchema = z.object({
  artistName: z.string().min(2, 'Artist name must be at least 2 characters'),
  genre: z.string().min(1, 'Please select a genre'),
  bio: z.string().min(10, 'Bio must be at least 10 characters').max(500, 'Bio must be less than 500 characters'),
});

const PersonaForm = () => {
  const { artistData, updateArtistData } = useArtistStore();

  const form = useForm<ArtistData>({
    resolver: zodResolver(formSchema),
    defaultValues: artistData,
  });

  const onSubmit = (values: ArtistData) => {
    updateArtistData(values);
    toast.success('Artist persona updated successfully!', {
      description: 'Your profile information has been saved.',
    });
  };

  const genres = [
    'Pop', 'Rock', 'Hip Hop', 'R&B', 'Country', 'Jazz', 'Blues', 'Classical',
    'Electronic', 'Folk', 'Reggae', 'Punk', 'Metal', 'Indie', 'Alternative',
    'Gospel', 'Latin', 'World Music', 'Other'
  ];

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <div className="bg-gradient-primary p-3 rounded-full w-16 h-16 mx-auto mb-4 shadow-glow">
            <User className="h-10 w-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Music Artist Profile</h1>
          <p className="text-muted-foreground">
            Tell us about yourself and your musical journey
          </p>
        </div>

        <Card className="bg-gradient-card shadow-creative border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Palette className="h-5 w-5 text-primary" />
              <span>Your Musical Identity</span>
            </CardTitle>
            <CardDescription>
              This information will be used to personalize your dashboard and help showcase your music.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="artistName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center space-x-2">
                        <User className="h-4 w-4" />
                        <span>Artist Name</span>
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter your artist name or pseudonym" 
                          className="transition-all duration-300 focus:shadow-card focus:border-primary/50"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        This is how you'll be known in the music community.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="genre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center space-x-2">
                        <Palette className="h-4 w-4" />
                        <span>Primary Genre</span>
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="transition-all duration-300 focus:shadow-card focus:border-primary/50">
                            <SelectValue placeholder="Select your primary musical genre" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {genres.map((genre) => (
                            <SelectItem key={genre} value={genre}>
                              {genre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Choose the genre that best represents your musical style.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center space-x-2">
                        <FileText className="h-4 w-4" />
                        <span>Musical Bio</span>
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Tell us about your musical journey, influences, and what inspires your sound..."
                          className="resize-none h-32 transition-all duration-300 focus:shadow-card focus:border-primary/50"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Share your musical story, influences, and what makes your sound unique. ({field.value?.length || 0}/500 characters)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="pt-4">
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-primary shadow-creative hover:shadow-glow transition-all duration-300 hover:scale-105"
                    size="lg"
                  >
                    Save Music Profile
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Preview Card */}
        {artistData.artistName && (
          <Card className="mt-8 bg-gradient-card shadow-card border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Preview</CardTitle>
              <CardDescription>
                This is how your persona will appear on your dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Artist Name</p>
                  <p className="font-medium">{artistData.artistName}</p>
                </div>
                {artistData.genre && (
                  <div>
                    <p className="text-sm text-muted-foreground">Genre</p>
                    <span className="inline-block bg-primary/10 text-primary px-2 py-1 rounded-md text-sm">
                      {artistData.genre}
                    </span>
                  </div>
                )}
                {artistData.bio && (
                  <div>
                    <p className="text-sm text-muted-foreground">Bio</p>
                    <p className="text-sm leading-relaxed">{artistData.bio}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PersonaForm;