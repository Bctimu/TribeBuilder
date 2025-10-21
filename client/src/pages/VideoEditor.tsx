import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

import { 
  Upload, 
  Download, 
  Scissors, 
  RotateCw, 
  Play, 
  Pause,
  Video,
  Settings,
  VolumeX,
  Camera
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

const VideoEditor = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ffmpeg, setFfmpeg] = useState<FFmpeg | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [trimStart, setTrimStart] = useState<string>('0');
  const [trimEnd, setTrimEnd] = useState<string>('10');
  const [muteAudio, setMuteAudio] = useState(false);
  const [thumbnailTime, setThumbnailTime] = useState<string>('5');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Auto-load FFmpeg when component mounts
  useEffect(() => {
    load();
  }, []);

  const load = async (): Promise<FFmpeg | null> => {
    if (loaded || isLoading) {
      return ffmpeg;
    }
    
    console.log('Loading FFmpeg...');
    setIsLoading(true);
    const ffmpegInstance = new FFmpeg();
    
    ffmpegInstance.on('log', ({ message }) => {
      console.log(message);
    });

    try {
      // Try jsdelivr CDN with a stable version
      console.log('Loading FFmpeg from jsdelivr...');
      const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm';
      
      await ffmpegInstance.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      
      setFfmpeg(ffmpegInstance);
      setLoaded(true);
      console.log('FFmpeg loaded successfully');
      toast.success('FFmpeg loaded successfully');
      return ffmpegInstance;
    } catch (error) {
      console.error('Failed to load FFmpeg:', error);
      
      // Final fallback: try unpkg with simpler approach
      try {
        console.log('Trying unpkg fallback...');
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
        
        await ffmpegInstance.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });
        
        setFfmpeg(ffmpegInstance);
        setLoaded(true);
        console.log('FFmpeg loaded successfully with unpkg fallback');
        toast.success('FFmpeg loaded successfully');
        return ffmpegInstance;
      } catch (fallbackError) {
        console.error('All FFmpeg loading methods failed:', fallbackError);
        toast.error('Failed to load video processing engine. This feature requires a stable internet connection.');
        return null;
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      
      toast.success('Video uploaded successfully');
    }
  };


  const trimVideo = async () => {
    if (!videoFile) {
      toast.error('Please upload a video first');
      return;
    }

    console.log('Trim video started - loaded:', loaded, 'ffmpeg:', !!ffmpeg);

    let instance = ffmpeg;
    if (!instance) {
      toast.info('Loading video engine...');
      instance = await load();
    }
    if (!instance) {
      toast.error('Video engine failed to load');
      return;
    }

    setIsProcessing(true);
    try {
      console.log('Starting trim process...');
      await instance.writeFile('input.mp4', await fetchFile(videoFile));
      
      // Trim video and save as MP4 with optional audio removal
      let trimArgs: string[];
      if (muteAudio) {
        trimArgs = [
          '-i', 'input.mp4',
          '-ss', trimStart,
          '-to', trimEnd,
          '-c:v', 'copy',
          '-an', // Remove audio
          'output.mp4'
        ];
      } else {
        trimArgs = [
          '-i', 'input.mp4',
          '-ss', trimStart,
          '-to', trimEnd,
          '-c', 'copy',
          'output.mp4'
        ];
      }
      
      await instance.exec(trimArgs);

      const data = await instance.readFile('output.mp4');
      const url = URL.createObjectURL(new Blob([data], { type: 'video/mp4' }));
      
      // Download the processed video
      const link = document.createElement('a');
      link.href = url;
      link.download = `trimmed-video${muteAudio ? '-muted' : ''}.mp4`;
      link.click();
      
      toast.success(`Video trimmed${muteAudio ? ' and muted' : ''} successfully`);
    } catch (error) {
      console.error('Error trimming video:', error);
      toast.error('Failed to trim video');
    } finally {
      setIsProcessing(false);
    }
  };
  const convertVideo = async () => {
    if (!videoFile) {
      toast.error('Please upload a video first');
      return;
    }

    let instance = ffmpeg;
    if (!instance) {
      toast.info('Loading video engine...');
      instance = await load();
    }
    if (!instance) {
      toast.error('Video engine failed to load');
      return;
    }

    setIsProcessing(true);
    try {
      await instance.writeFile('input.mp4', await fetchFile(videoFile));
      
      // Convert video to MP4 format with optional audio removal
      let codecArgs: string[];
      if (muteAudio) {
        codecArgs = [
          '-i', 'input.mp4',
          '-c:v', 'libx264',
          '-an', // Remove audio
          '-b:v', '2M',
          'output.mp4'
        ];
      } else {
        codecArgs = [
          '-i', 'input.mp4',
          '-c:v', 'libx264',
          '-c:a', 'aac',
          '-b:v', '2M',
          '-b:a', '128k',
          'output.mp4'
        ];
      }
      
      await instance.exec(codecArgs);

      const data = await instance.readFile('output.mp4');
      const url = URL.createObjectURL(new Blob([data], { type: 'video/mp4' }));
      
      // Download the converted video
      const link = document.createElement('a');
      link.href = url;
      link.download = `processed-video${muteAudio ? '-muted' : ''}.mp4`;
      link.click();
      
      toast.success(`Video ${muteAudio ? 'muted and ' : ''}processed successfully`);
    } catch (error) {
      console.error('Error converting video:', error);
      toast.error('Failed to process video');
    } finally {
      setIsProcessing(false);
    }
  };

  const captureThumbnail = async () => {
    if (!videoFile) {
      toast.error('Please upload a video first');
      return;
    }

    let instance = ffmpeg;
    if (!instance) {
      toast.info('Loading video engine...');
      instance = await load();
    }
    if (!instance) {
      toast.error('Video engine failed to load');
      return;
    }

    setIsProcessing(true);
    try {
      await instance.writeFile('input.mp4', await fetchFile(videoFile));
      
      // Capture thumbnail at specific time
      const thumbnailArgs = [
        '-i', 'input.mp4',
        '-ss', thumbnailTime,
        '-vframes', '1',
        '-q:v', '2',
        'thumbnail.jpg'
      ];
      
      await instance.exec(thumbnailArgs);

      const data = await instance.readFile('thumbnail.jpg');
      const url = URL.createObjectURL(new Blob([data], { type: 'image/jpeg' }));
      
      // Download the thumbnail
      const link = document.createElement('a');
      link.href = url;
      link.download = `thumbnail-${thumbnailTime}s.jpg`;
      link.click();
      
      toast.success('Thumbnail captured and downloaded successfully');
    } catch (error) {
      console.error('Error capturing thumbnail:', error);
      toast.error('Failed to capture thumbnail');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Video Editor</h1>
          <p className="text-muted-foreground">Upload, trim, and convert videos with powerful processing tools</p>
        </div>

        <div className="space-y-8">
          {/* Upload Section */}
          <div className="space-y-6">
            <Card className="bg-gradient-card shadow-card border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5 text-primary" />
                  Video Upload
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div 
                  className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium mb-2">Upload Video File</p>
                  <p className="text-muted-foreground">Click to browse or drag and drop</p>
                  <p className="text-sm text-muted-foreground mt-2">Supports MP4, MOV, AVI, WebM</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                
                {loaded && (
                  <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <p className="text-sm font-medium text-green-700 dark:text-green-300">
                      ✅ Video processing engine is ready!
                    </p>
                  </div>
                )}

                {!loaded && (
                  <div className="space-y-2">
                    <Button 
                      onClick={load} 
                      className="w-full" 
                      size="lg" 
                      disabled={isLoading}
                    >
                      {isLoading ? 'Loading Video Engine...' : 'Load Video Processing Engine'}
                    </Button>
                    {isLoading && (
                      <p className="text-center text-sm text-muted-foreground">
                        Initializing video processing engine, please wait...
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {videoUrl && (
              <Card className="bg-gradient-card shadow-card border-border/50">
                <CardHeader>
                  <CardTitle>Video Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    controls
                    className="w-full max-h-96 rounded-lg"
                  />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Edit Section */}
          {videoUrl && (
            <>
              <Separator />
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-bold mb-2">Edit Your Video</h2>
                  <p className="text-muted-foreground">Choose how you want to process your video</p>
                </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-gradient-card shadow-card border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Scissors className="h-5 w-5 text-primary" />
                    Trim Video
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Start Time (seconds)</label>
                      <Input
                        type="number"
                        value={trimStart}
                        onChange={(e) => setTrimStart(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">End Time (seconds)</label>
                      <Input
                        type="number"
                        value={trimEnd}
                        onChange={(e) => setTrimEnd(e.target.value)}
                        placeholder="10"
                      />
                    </div>
                  </div>
                  <Button 
                    onClick={trimVideo} 
                    disabled={isProcessing || !loaded}
                    className="w-full"
                  >
                    {isProcessing ? 'Trimming...' : `Trim Video${muteAudio ? ' (Muted)' : ''}`}
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-gradient-card shadow-card border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-primary" />
                    Video Processing
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="muteAudio"
                        checked={muteAudio}
                        onChange={(e) => setMuteAudio(e.target.checked)}
                        className="rounded"
                      />
                      <label htmlFor="muteAudio" className="text-sm font-medium flex items-center gap-2">
                        <VolumeX className="h-4 w-4" />
                        Mute Audio Track
                      </label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Process and optimize your video in MP4 format with H.264 compression.
                    </p>
                  </div>
                  <Button 
                    onClick={convertVideo} 
                    disabled={isProcessing || !loaded}
                    className="w-full"
                  >
                    {isProcessing ? 'Processing...' : `Process Video${muteAudio ? ' (Muted)' : ''}`}
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <Card className="bg-gradient-card shadow-card border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="h-5 w-5 text-primary" />
                    Thumbnail Capture
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Capture Time (seconds)</label>
                    <Input
                      type="number"
                      value={thumbnailTime}
                      onChange={(e) => setThumbnailTime(e.target.value)}
                      placeholder="5"
                      min="0"
                      step="0.1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Time in the video to capture as thumbnail
                    </p>
                  </div>
                  <Button 
                    onClick={captureThumbnail} 
                    disabled={isProcessing || !loaded}
                    className="w-full"
                  >
                    {isProcessing ? 'Capturing...' : 'Capture Thumbnail'}
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-gradient-card shadow-card border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Video className="h-5 w-5 text-primary" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p>• Trim: Cut specific segments from your video</p>
                    <p>• Process: Optimize and convert to MP4</p>
                    <p>• Mute: Remove audio track completely</p>
                    <p>• Thumbnail: Extract still frame as image</p>
                  </div>
                </CardContent>
              </Card>
            </div>

              </div>
            </>
          )}

          {/* Export Section */}
          {videoUrl && (
            <>
              <Separator />
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-bold mb-2">Export Information</h2>
                  <p className="text-muted-foreground">Learn about available formats and processing options</p>
                </div>

                <Card className="bg-gradient-card shadow-card border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Download className="h-5 w-5 text-primary" />
                      Export Options
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h3 className="font-medium mb-2">Video Format</h3>
                        <div className="space-y-2">
                          <Badge variant="secondary">MP4 (H.264/AAC)</Badge>
                        </div>
                      </div>
                      <div>
                        <h3 className="font-medium mb-2">Quality Options</h3>
                        <div className="space-y-2">
                          <Badge variant="secondary">High Quality</Badge>
                          <Badge variant="outline">Optimized Size</Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t border-border">
                      <p className="text-sm text-muted-foreground mb-4">
                        Your processed videos will be automatically downloaded when ready.
                      </p>
                      <div className="text-sm text-muted-foreground">
                        <p>• Local processing uses your device's resources</p>
                        <p>• Cloud processing is faster but requires internet</p>
                        <p>• All processing is done securely</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoEditor;