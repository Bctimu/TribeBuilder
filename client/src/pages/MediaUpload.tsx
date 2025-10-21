import { useState, useRef } from 'react';
import { useArtistStore } from '@/stores/artistStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Upload, Image, Video, Music, FileText, X, Cloud } from 'lucide-react';
import { cn } from '@/lib/utils';

const MediaUpload = () => {
  const { mediaFiles, addMediaFile, removeMediaFile } = useArtistStore();
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileType = (file: File): 'image' | 'video' | 'audio' => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    return 'image'; // default fallback
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image': return Image;
      case 'video': return Video;
      case 'audio': return Music;
      default: return FileText;
    }
  };

  const handleFiles = async (files: FileList) => {
    setUploading(true);
    const acceptedTypes = ['image/', 'video/', 'audio/'];
    
    for (const file of Array.from(files)) {
      if (!acceptedTypes.some(type => file.type.startsWith(type))) {
        toast.error(`File type not supported: ${file.name}`, {
          description: 'Please upload images, videos, or audio files only.',
        });
        continue;
      }

      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 500));

      const mediaFile = {
        id: crypto.randomUUID(),
        name: file.name,
        type: getFileType(file),
        url: URL.createObjectURL(file),
        uploadedAt: new Date(),
      };

      addMediaFile(mediaFile);
      toast.success(`Successfully uploaded: ${file.name}`);
    }
    setUploading(false);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <div className="bg-gradient-primary p-3 rounded-full w-16 h-16 mx-auto mb-4 shadow-glow">
            <Cloud className="h-10 w-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Media Upload</h1>
          <p className="text-muted-foreground">
            Upload your creative works - images, videos, and audio files
          </p>
        </div>

        {/* Upload Area */}
        <Card className="bg-gradient-card shadow-creative border-border/50 mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Upload className="h-5 w-5 text-primary" />
              <span>Upload Files</span>
            </CardTitle>
            <CardDescription>
              Drag and drop your files here, or click to browse. Supports images, videos, and audio files.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-8 transition-all duration-300 cursor-pointer",
                dragActive 
                  ? "border-primary bg-primary/5 shadow-glow" 
                  : "border-border hover:border-primary/50 hover:bg-primary/2"
              )}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={openFileDialog}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*,audio/*"
                onChange={handleFileInput}
                className="hidden"
              />
              
              <div className="text-center">
                <div className="bg-primary/10 p-4 rounded-full w-20 h-20 mx-auto mb-4">
                  <Upload className="h-12 w-12 text-primary mx-auto" />
                </div>
                
                {uploading ? (
                  <div>
                    <p className="text-lg font-medium mb-2">Uploading files...</p>
                    <div className="w-32 h-2 bg-muted rounded-full mx-auto overflow-hidden">
                      <div className="h-full bg-gradient-primary animate-pulse"></div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-lg font-medium mb-2">
                      Drop your files here or click to browse
                    </p>
                    <p className="text-muted-foreground text-sm mb-4">
                      Supports: JPG, PNG, GIF, MP4, MOV, MP3, WAV
                    </p>
                    <Button variant="outline" className="hover:shadow-card transition-all duration-300">
                      Choose Files
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Media Library */}
        <Card className="bg-gradient-card shadow-creative border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="text-xl">Your Media Library</CardTitle>
              <CardDescription>
                {mediaFiles.length} file{mediaFiles.length !== 1 ? 's' : ''} uploaded
              </CardDescription>
            </div>
            {mediaFiles.length > 0 && (
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                {mediaFiles.length} files
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            {mediaFiles.length === 0 ? (
              <div className="text-center py-12">
                <div className="bg-muted/30 p-4 rounded-full w-20 h-20 mx-auto mb-4">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
                </div>
                <p className="text-muted-foreground">
                  No files uploaded yet. Start by uploading your first creative work!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mediaFiles.map((file) => {
                  const Icon = getFileIcon(file.type);
                  return (
                    <div
                      key={file.id}
                      className="group relative bg-gradient-card border border-border/50 rounded-lg p-4 hover:shadow-card transition-all duration-300"
                    >
                      <button
                        onClick={() => {
                          removeMediaFile(file.id);
                          toast.success('File removed successfully');
                        }}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-destructive text-destructive-foreground rounded-full p-1 hover:scale-110"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      
                      <div className="flex items-start space-x-3">
                        <div className="bg-primary/10 p-2 rounded-lg shrink-0">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate mb-1">{file.name}</p>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="text-xs capitalize">
                              {file.type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {file.uploadedAt.toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {file.type === 'image' && (
                        <div className="mt-3 rounded-md overflow-hidden">
                          <img
                            src={file.url}
                            alt={file.name}
                            className="w-full h-32 object-cover"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MediaUpload;