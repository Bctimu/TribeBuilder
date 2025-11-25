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
  Camera,
  SkipBack,
  SkipForward
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Auto-load FFmpeg when component mounts
  useEffect(() => {
    load();
  }, []);

  // Track video time
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => setCurrentTime(video.currentTime);
    const updateDuration = () => setDuration(video.duration);
    const updatePlayState = () => setIsPlaying(!video.paused);

    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('loadedmetadata', updateDuration);
    video.addEventListener('play', updatePlayState);
    video.addEventListener('pause', updatePlayState);

    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('loadedmetadata', updateDuration);
      video.removeEventListener('play', updatePlayState);
      video.removeEventListener('pause', updatePlayState);
    };
  }, [videoUrl]);

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const skipBackward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
    }
  };

  const skipForward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 5);
    }
  };

  const seekToTime = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || !duration) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const time = percentage * duration;
    
    seekToTime(time);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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

      const data = await instance.readFile('output.mp4') as Uint8Array;
      const url = URL.createObjectURL(new Blob([new Uint8Array(data)], { type: 'video/mp4' }));
      
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
        // Fast muting: just remove audio without re-encoding video
        codecArgs = [
          '-i', 'input.mp4',
          '-c:v', 'copy', // Copy video stream without re-encoding (much faster)
          '-an', // Remove audio
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

      const data = await instance.readFile('output.mp4') as Uint8Array;
      const url = URL.createObjectURL(new Blob([new Uint8Array(data)], { type: 'video/mp4' }));
      
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

    // Validate thumbnail time
    const time = parseFloat(thumbnailTime);
    if (isNaN(time) || time < 0) {
      toast.error('Please enter a valid time in seconds');
      return;
    }

    // Check video duration if available
    if (videoRef.current && videoRef.current.duration) {
      if (time > videoRef.current.duration) {
        toast.error(`Capture time (${time}s) exceeds video duration (${Math.floor(videoRef.current.duration)}s)`);
        return;
      }
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
      console.log(`Capturing thumbnail at ${thumbnailTime}s...`);
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

      const data = await instance.readFile('thumbnail.jpg') as Uint8Array;
      
      if (!data || data.length === 0) {
        throw new Error('No thumbnail data generated');
      }
      
      const url = URL.createObjectURL(new Blob([new Uint8Array(data)], { type: 'image/jpeg' }));
      
      // Download the thumbnail
      const link = document.createElement('a');
      link.href = url;
      link.download = `thumbnail-${thumbnailTime}s.jpg`;
      link.click();
      
      console.log('Thumbnail captured successfully');
      toast.success('Thumbnail captured and downloaded successfully');
    } catch (error) {
      console.error('Error capturing thumbnail:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to capture thumbnail: ${errorMessage}. Try a different time or check the video format.`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {!videoUrl ? (
        // Upload Screen
        <div className="flex items-center justify-center min-h-screen p-6">
          <Card className="max-w-2xl w-full bg-gradient-card shadow-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Video className="h-6 w-6 text-primary" />
                Video Editor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div 
                className="border-2 border-dashed border-border rounded-lg p-12 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-xl font-medium mb-2">Upload Video File</p>
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
        </div>
      ) : (
        // Timeline Editor Layout
        <div className="flex flex-col h-screen">
          {/* Top Bar */}
          <div className="bg-card border-b border-border p-4">
            <div className="flex items-center justify-between max-w-7xl mx-auto">
              <div className="flex items-center gap-3">
                <Video className="h-5 w-5 text-primary" />
                <h1 className="text-lg font-semibold">Video Editor</h1>
              </div>
              <div className="flex items-center gap-2">
                {loaded && (
                  <Badge variant="outline" className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                    <span className="text-green-700 dark:text-green-300">Engine Ready</span>
                  </Badge>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setVideoUrl(null);
                    setVideoFile(null);
                    setCurrentTime(0);
                    setDuration(0);
                  }}
                >
                  New Video
                </Button>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex overflow-hidden">
            {/* Preview and Timeline Container */}
            <div className="flex-1 flex flex-col">
              {/* Video Preview */}
              <div className="flex-1 bg-muted/30 flex items-center justify-center p-6">
                <div className="relative max-w-4xl w-full">
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    className="w-full h-auto max-h-[60vh] rounded-lg bg-black"
                  />
                </div>
              </div>

              {/* Playback Controls */}
              <div className="bg-card border-t border-border p-4">
                <div className="max-w-4xl mx-auto space-y-4">
                  {/* Timeline */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                    <div
                      ref={timelineRef}
                      className="relative h-16 bg-muted rounded-lg cursor-pointer overflow-hidden group"
                      onClick={handleTimelineClick}
                    >
                      {/* Timeline track */}
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full h-2 bg-muted-foreground/20 rounded-full mx-4">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                      
                      {/* Playhead */}
                      {duration > 0 && (
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-primary shadow-lg"
                          style={{ left: `${(currentTime / duration) * 100}%` }}
                        >
                          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 bg-primary rounded-full border-2 border-background" />
                        </div>
                      )}
                      
                      {/* Hover effect */}
                      <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>

                  {/* Control Buttons */}
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={skipBackward}
                    >
                      <SkipBack className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      onClick={togglePlayPause}
                      className="h-12 w-12"
                    >
                      {isPlaying ? (
                        <Pause className="h-5 w-5" />
                      ) : (
                        <Play className="h-5 w-5" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={skipForward}
                    >
                      <SkipForward className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Tools Panel */}
            <div className="w-80 border-l border-border bg-card overflow-y-auto">
              <div className="p-4 space-y-4">
                <h2 className="font-semibold text-lg mb-4">Tools</h2>

                {/* Trim Tool */}
                <Card className="bg-gradient-card shadow-sm border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Scissors className="h-4 w-4 text-primary" />
                      Trim
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-xs font-medium mb-1 block">Start (s)</label>
                      <Input
                        type="number"
                        value={trimStart}
                        onChange={(e) => setTrimStart(e.target.value)}
                        placeholder="0"
                        className="h-8"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block">End (s)</label>
                      <Input
                        type="number"
                        value={trimEnd}
                        onChange={(e) => setTrimEnd(e.target.value)}
                        placeholder="10"
                        className="h-8"
                      />
                    </div>
                    <Button 
                      onClick={trimVideo} 
                      disabled={isProcessing || !loaded}
                      className="w-full h-8 text-xs"
                      size="sm"
                    >
                      {isProcessing ? 'Trimming...' : 'Apply Trim'}
                    </Button>
                  </CardContent>
                </Card>

                {/* Audio Tool */}
                <Card className="bg-gradient-card shadow-sm border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <VolumeX className="h-4 w-4 text-primary" />
                      Audio
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="muteAudio"
                        checked={muteAudio}
                        onChange={(e) => setMuteAudio(e.target.checked)}
                        className="rounded"
                      />
                      <label htmlFor="muteAudio" className="text-sm">
                        Mute Audio Track
                      </label>
                    </div>
                  </CardContent>
                </Card>

                {/* Process Tool */}
                <Card className="bg-gradient-card shadow-sm border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Settings className="h-4 w-4 text-primary" />
                      Process
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Optimize and convert to MP4 format with H.264 compression.
                    </p>
                    <Button 
                      onClick={convertVideo} 
                      disabled={isProcessing || !loaded}
                      className="w-full h-8 text-xs"
                      size="sm"
                    >
                      {isProcessing ? 'Processing...' : 'Process Video'}
                    </Button>
                  </CardContent>
                </Card>

                {/* Thumbnail Tool */}
                <Card className="bg-gradient-card shadow-sm border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Camera className="h-4 w-4 text-primary" />
                      Thumbnail
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-xs font-medium mb-1 block">Time (s)</label>
                      <Input
                        type="number"
                        value={thumbnailTime}
                        onChange={(e) => setThumbnailTime(e.target.value)}
                        placeholder="5"
                        min="0"
                        step="0.1"
                        className="h-8"
                      />
                    </div>
                    <Button 
                      onClick={captureThumbnail} 
                      disabled={isProcessing || !loaded}
                      className="w-full h-8 text-xs"
                      size="sm"
                    >
                      {isProcessing ? 'Capturing...' : 'Capture Frame'}
                    </Button>
                  </CardContent>
                </Card>

                {/* Export Info */}
                <Card className="bg-gradient-card shadow-sm border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Download className="h-4 w-4 text-primary" />
                      Export
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>• Format: MP4 (H.264/AAC)</p>
                      <p>• Quality: High</p>
                      <p>• Processing: Local</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoEditor;