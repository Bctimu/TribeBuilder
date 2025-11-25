import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/contexts/RealtimeContext';
import { Download, Crop, RotateCw, Palette, Sparkles, Upload, Check, X, Sliders, Filter } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

const ImageEditor = () => {
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedForEdit, setUploadedForEdit] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [cropRect, setCropRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragType, setDragType] = useState<'move' | 'resize-nw' | 'resize-ne' | 'resize-sw' | 'resize-se' | 'resize-n' | 'resize-s' | 'resize-e' | 'resize-w' | null>(null);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [originalImageData, setOriginalImageData] = useState<ImageData | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateImage = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: { 
          prompt: prompt.trim(),
          width: 1024,
          height: 1024
        }
      });

      if (error) throw error;

      setGeneratedImage(data.imageUrl);
      // Automatically load the generated image to canvas for immediate editing
      loadImageToCanvas(data.imageUrl);
      toast.success('Image generated and loaded to canvas!');
    } catch (error) {
      console.error('Error generating image:', error);
      toast.error('Failed to generate image. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUploadForEdit = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setUploadedForEdit(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const editUploadedImage = async () => {
    if (!uploadedForEdit) {
      toast.error('Please upload an image first');
      return;
    }
    if (!editPrompt.trim()) {
      toast.error('Please enter editing instructions');
      return;
    }

    setIsEditing(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: { 
          prompt: editPrompt.trim(),
          imageUrl: uploadedForEdit,
          mode: 'edit'
        }
      });

      if (error) throw error;

      setGeneratedImage(data.imageUrl);
      loadImageToCanvas(data.imageUrl);
      toast.success('Image edited successfully!');
    } catch (error) {
      console.error('Error editing image:', error);
      toast.error('Failed to edit image. Please try again.');
    } finally {
      setIsEditing(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setUploadedImage(result);
        loadImageToCanvas(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const loadImageToCanvas = (imageSrc: string) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.error('Canvas ref is null');
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Could not get canvas context');
      return;
    }

    // Clear crop state when loading new image
    setIsCropping(false);
    setCropRect(null);

    console.log('Loading image to canvas:', imageSrc.substring(0, 50) + '...');
    const img = new Image();
    img.onload = () => {
      console.log('Image loaded successfully, dimensions:', img.width, 'x', img.height);
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      // Store original image data for filters and adjustments
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setOriginalImageData(imageData);
      
      // Reset adjustments
      setBrightness(0);
      setContrast(0);
      setActiveFilter(null);
      
      toast.success('Image loaded to canvas');
    };
    img.onerror = (error) => {
      console.error('Failed to load image:', error);
      toast.error('Failed to load image to canvas');
    };
    img.src = imageSrc;
  };

  const startCrop = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Initialize crop rectangle in the center
    const initialSize = Math.min(canvas.width, canvas.height) * 0.5;
    setCropRect({
      x: (canvas.width - initialSize) / 2,
      y: (canvas.height - initialSize) / 2,
      width: initialSize,
      height: initialSize
    });
    setIsCropping(true);
    toast.info('Drag to move crop area, use handles to resize');
  };

  const cancelCrop = () => {
    setIsCropping(false);
    setCropRect(null);
    setAspectRatio(null);
    setIsDragging(false);
    setDragStart(null);
    setDragType(null);
    
    // Immediately redraw the clean image
    const currentImage = generatedImage || uploadedImage;
    if (currentImage) {
      loadImageToCanvas(currentImage);
    }
    
    toast.info('Crop cancelled');
  };

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const currentImage = generatedImage || uploadedImage;
    if (currentImage) {
      loadImageToCanvas(currentImage);
    }
  };

  const confirmCrop = () => {
    if (!cropRect) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get the current image from canvas BEFORE making any changes
    const currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Extract just the cropped portion
    const croppedData = ctx.getImageData(cropRect.x, cropRect.y, cropRect.width, cropRect.height);
    
    // Immediately clear all crop state to prevent any overlays
    setIsCropping(false);
    setCropRect(null);
    setAspectRatio(null);
    setIsDragging(false);
    setDragStart(null);
    setDragType(null);
    
    // Create a fresh canvas for the cropped image
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = cropRect.width;
    tempCanvas.height = cropRect.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    if (tempCtx) {
      tempCtx.putImageData(croppedData, 0, 0);
      
      // Now update the main canvas with the clean cropped image
      canvas.width = cropRect.width;
      canvas.height = cropRect.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(tempCanvas, 0, 0);
      
      // Store for filters
      const finalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setOriginalImageData(finalImageData);
    }
    
    toast.success('Image cropped successfully');
  };

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const getDragType = (mouseX: number, mouseY: number) => {
    if (!cropRect) return null;

    const handleSize = 15; // Larger hit area for better usability
    const { x, y, width, height } = cropRect;

    // Check corners first (most specific)
    if (mouseX >= x - handleSize && mouseX <= x + handleSize && mouseY >= y - handleSize && mouseY <= y + handleSize) return 'resize-nw';
    if (mouseX >= x + width - handleSize && mouseX <= x + width + handleSize && mouseY >= y - handleSize && mouseY <= y + handleSize) return 'resize-ne';
    if (mouseX >= x - handleSize && mouseX <= x + handleSize && mouseY >= y + height - handleSize && mouseY <= y + height + handleSize) return 'resize-sw';
    if (mouseX >= x + width - handleSize && mouseX <= x + width + handleSize && mouseY >= y + height - handleSize && mouseY <= y + height + handleSize) return 'resize-se';

    // Check edges
    if (mouseX >= x + width/2 - handleSize && mouseX <= x + width/2 + handleSize && mouseY >= y - handleSize && mouseY <= y + handleSize) return 'resize-n';
    if (mouseX >= x + width/2 - handleSize && mouseX <= x + width/2 + handleSize && mouseY >= y + height - handleSize && mouseY <= y + height + handleSize) return 'resize-s';
    if (mouseX >= x - handleSize && mouseX <= x + handleSize && mouseY >= y + height/2 - handleSize && mouseY <= y + height/2 + handleSize) return 'resize-w';
    if (mouseX >= x + width - handleSize && mouseX <= x + width + handleSize && mouseY >= y + height/2 - handleSize && mouseY <= y + height/2 + handleSize) return 'resize-e';

    // Check if inside crop area (move)
    if (mouseX >= x + handleSize && mouseX <= x + width - handleSize && mouseY >= y + handleSize && mouseY <= y + height - handleSize) return 'move';

    return null;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isCropping || !cropRect) return;

    const mousePos = getMousePos(e);
    const dragTypeResult = getDragType(mousePos.x, mousePos.y);
    
    if (dragTypeResult) {
      setIsDragging(true);
      setDragStart(mousePos);
      setDragType(dragTypeResult);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isCropping || !cropRect) return;

    const mousePos = getMousePos(e);

    if (isDragging && dragStart && dragType) {
      const deltaX = mousePos.x - dragStart.x;
      const deltaY = mousePos.y - dragStart.y;
      let newRect = { ...cropRect };

      const canvas = canvasRef.current;
      if (!canvas) return;

      switch (dragType) {
        case 'move':
          newRect.x = Math.max(0, Math.min(canvas.width - cropRect.width, cropRect.x + deltaX));
          newRect.y = Math.max(0, Math.min(canvas.height - cropRect.height, cropRect.y + deltaY));
          break;
          
        case 'resize-nw':
          const newWidth = cropRect.width - deltaX;
          const newHeight = cropRect.height - deltaY;
          if (newWidth > 20 && newHeight > 20 && cropRect.x + deltaX >= 0 && cropRect.y + deltaY >= 0) {
            if (aspectRatio) {
              const avgDelta = (deltaX + deltaY) / 2;
              newRect.x = cropRect.x + avgDelta;
              newRect.y = cropRect.y + avgDelta;
              newRect.width = Math.max(20, cropRect.width - avgDelta);
              newRect.height = Math.max(20, cropRect.height - avgDelta);
            } else {
              newRect.x = cropRect.x + deltaX;
              newRect.y = cropRect.y + deltaY;
              newRect.width = newWidth;
              newRect.height = newHeight;
            }
          }
          break;
          
        case 'resize-ne':
          const neWidth = cropRect.width + deltaX;
          const neHeight = cropRect.height - deltaY;
          if (neWidth > 20 && neHeight > 20 && cropRect.x + neWidth <= canvas.width && cropRect.y + deltaY >= 0) {
            if (aspectRatio) {
              const avgDelta = (deltaX - deltaY) / 2;
              newRect.y = cropRect.y - avgDelta;
              newRect.width = Math.max(20, cropRect.width + avgDelta);
              newRect.height = Math.max(20, cropRect.height + avgDelta);
            } else {
              newRect.y = cropRect.y + deltaY;
              newRect.width = neWidth;
              newRect.height = neHeight;
            }
          }
          break;
          
        case 'resize-sw':
          const swWidth = cropRect.width - deltaX;
          const swHeight = cropRect.height + deltaY;
          if (swWidth > 20 && swHeight > 20 && cropRect.x + deltaX >= 0 && cropRect.y + swHeight <= canvas.height) {
            if (aspectRatio) {
              const avgDelta = (-deltaX + deltaY) / 2;
              newRect.x = cropRect.x - avgDelta;
              newRect.width = Math.max(20, cropRect.width + avgDelta);
              newRect.height = Math.max(20, cropRect.height + avgDelta);
            } else {
              newRect.x = cropRect.x + deltaX;
              newRect.width = swWidth;
              newRect.height = swHeight;
            }
          }
          break;
          
        case 'resize-se':
          const seWidth = cropRect.width + deltaX;
          const seHeight = cropRect.height + deltaY;
          if (seWidth > 20 && seHeight > 20 && cropRect.x + seWidth <= canvas.width && cropRect.y + seHeight <= canvas.height) {
            if (aspectRatio) {
              const avgDelta = (deltaX + deltaY) / 2;
              newRect.width = Math.max(20, cropRect.width + avgDelta);
              newRect.height = Math.max(20, cropRect.height + avgDelta);
            } else {
              newRect.width = seWidth;
              newRect.height = seHeight;
            }
          }
          break;
          
        case 'resize-n':
          const nHeight = cropRect.height - deltaY;
          if (nHeight > 20 && cropRect.y + deltaY >= 0) {
            newRect.y = cropRect.y + deltaY;
            newRect.height = nHeight;
            if (aspectRatio) {
              newRect.width = nHeight * aspectRatio;
              newRect.x = cropRect.x + (cropRect.width - newRect.width) / 2;
            }
          }
          break;
          
        case 'resize-s':
          const sHeight = cropRect.height + deltaY;
          if (sHeight > 20 && cropRect.y + sHeight <= canvas.height) {
            newRect.height = sHeight;
            if (aspectRatio) {
              newRect.width = sHeight * aspectRatio;
              newRect.x = cropRect.x + (cropRect.width - newRect.width) / 2;
            }
          }
          break;
          
        case 'resize-w':
          const wWidth = cropRect.width - deltaX;
          if (wWidth > 20 && cropRect.x + deltaX >= 0) {
            newRect.x = cropRect.x + deltaX;
            newRect.width = wWidth;
            if (aspectRatio) {
              newRect.height = wWidth / aspectRatio;
              newRect.y = cropRect.y + (cropRect.height - newRect.height) / 2;
            }
          }
          break;
          
        case 'resize-e':
          const eWidth = cropRect.width + deltaX;
          if (eWidth > 20 && cropRect.x + eWidth <= canvas.width) {
            newRect.width = eWidth;
            if (aspectRatio) {
              newRect.height = eWidth / aspectRatio;
              newRect.y = cropRect.y + (cropRect.height - newRect.height) / 2;
            }
          }
          break;
      }

      // Ensure the crop rect stays within canvas bounds
      newRect.x = Math.max(0, Math.min(canvas.width - newRect.width, newRect.x));
      newRect.y = Math.max(0, Math.min(canvas.height - newRect.height, newRect.y));
      newRect.width = Math.min(canvas.width - newRect.x, newRect.width);
      newRect.height = Math.min(canvas.height - newRect.y, newRect.height);

      setCropRect(newRect);
      setDragStart(mousePos);
    } else {
      // Update cursor based on hover area
      const dragTypeResult = getDragType(mousePos.x, mousePos.y);
      const canvas = canvasRef.current;
      if (canvas) {
        if (dragTypeResult?.includes('resize-nw') || dragTypeResult?.includes('resize-se')) {
          canvas.style.cursor = 'nw-resize';
        } else if (dragTypeResult?.includes('resize-ne') || dragTypeResult?.includes('resize-sw')) {
          canvas.style.cursor = 'ne-resize';
        } else if (dragTypeResult?.includes('resize-n') || dragTypeResult?.includes('resize-s')) {
          canvas.style.cursor = 'ns-resize';
        } else if (dragTypeResult?.includes('resize-e') || dragTypeResult?.includes('resize-w')) {
          canvas.style.cursor = 'ew-resize';
        } else if (dragTypeResult === 'move') {
          canvas.style.cursor = 'move';
        } else {
          canvas.style.cursor = 'crosshair';
        }
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStart(null);
    setDragType(null);
  };

  const drawCropOverlay = () => {
    if (!isCropping || !cropRect || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear the canvas and redraw the original image
    const currentImage = generatedImage || uploadedImage;
    if (currentImage) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        
        const { x, y, width, height } = cropRect;

        // Only draw the white border outline
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);
      };
      img.src = currentImage;
    }
  };

  const rotateImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d')!;
    
    tempCanvas.width = canvas.height;
    tempCanvas.height = canvas.width;
    
    tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
    tempCtx.rotate(Math.PI / 2);
    tempCtx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
    
    canvas.width = tempCanvas.width;
    canvas.height = tempCanvas.height;
    ctx.drawImage(tempCanvas, 0, 0);
    toast.success('Image rotated successfully');
  };

  const downloadGeneratedImage = () => {
    if (!generatedImage) return;

    const link = document.createElement('a');
    link.download = 'generated-image.png';
    link.href = generatedImage;
    link.click();
    toast.success('Image downloaded successfully');
  };

  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = 'edited-image.png';
    link.href = canvas.toDataURL();
    link.click();
    toast.success('Image downloaded successfully');
  };

  const applyBrightnessContrast = (imageData: ImageData, brightness: number, contrast: number): ImageData => {
    const data = new Uint8ClampedArray(imageData.data.length);
    const brightnessFactor = brightness;
    const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));

    for (let i = 0; i < imageData.data.length; i += 4) {
      // Apply brightness and contrast to RGB channels
      for (let j = 0; j < 3; j++) {
        let pixel = imageData.data[i + j];
        
        // Apply brightness
        pixel += brightnessFactor;
        
        // Apply contrast
        pixel = contrastFactor * (pixel - 128) + 128;
        
        // Clamp values
        data[i + j] = Math.max(0, Math.min(255, pixel));
      }
      
      // Keep alpha channel unchanged
      data[i + 3] = imageData.data[i + 3];
    }

    return new ImageData(data, imageData.width, imageData.height);
  };

  const applyFilter = (imageData: ImageData, filterType: string): ImageData => {
    const data = new Uint8ClampedArray(imageData.data.length);

    for (let i = 0; i < imageData.data.length; i += 4) {
      const r = imageData.data[i];
      const g = imageData.data[i + 1];
      const b = imageData.data[i + 2];
      const a = imageData.data[i + 3];

      switch (filterType) {
        case 'grayscale':
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          data[i] = gray;
          data[i + 1] = gray;
          data[i + 2] = gray;
          break;
        
        case 'sepia':
          data[i] = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
          data[i + 1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
          data[i + 2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
          break;
        
        case 'vintage':
          data[i] = Math.min(255, r * 1.2 + 20);
          data[i + 1] = Math.min(255, g * 1.1 + 10);
          data[i + 2] = Math.max(0, b * 0.8 - 10);
          break;
        
        case 'cool':
          data[i] = Math.max(0, r * 0.8);
          data[i + 1] = Math.min(255, g * 1.1);
          data[i + 2] = Math.min(255, b * 1.3);
          break;
        
        case 'warm':
          data[i] = Math.min(255, r * 1.2);
          data[i + 1] = Math.min(255, g * 1.1);
          data[i + 2] = Math.max(0, b * 0.7);
          break;
        
        default:
          data[i] = r;
          data[i + 1] = g;
          data[i + 2] = b;
      }
      
      data[i + 3] = a; // Keep alpha channel
    }

    return new ImageData(data, imageData.width, imageData.height);
  };

  const applyImageAdjustments = () => {
    const canvas = canvasRef.current;
    if (!canvas || !originalImageData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let processedData = new ImageData(
      new Uint8ClampedArray(originalImageData.data),
      originalImageData.width,
      originalImageData.height
    );

    // Apply brightness and contrast
    if (brightness !== 0 || contrast !== 0) {
      processedData = applyBrightnessContrast(processedData, brightness, contrast);
    }

    // Apply filter
    if (activeFilter) {
      processedData = applyFilter(processedData, activeFilter);
    }

    // Clear canvas and put processed image data
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.putImageData(processedData, 0, 0);
  };

  const handleBrightnessChange = (value: number[]) => {
    setBrightness(value[0]);
  };

  const handleContrastChange = (value: number[]) => {
    setContrast(value[0]);
  };

  const handleFilterChange = (filterType: string) => {
    setActiveFilter(activeFilter === filterType ? null : filterType);
  };

  const resetAdjustments = () => {
    setBrightness(0);
    setContrast(0);
    setActiveFilter(null);
    
    // Restore original image
    const canvas = canvasRef.current;
    if (canvas && originalImageData) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.putImageData(originalImageData, 0, 0);
      }
    }
    
    toast.success('Adjustments reset');
  };

  useEffect(() => {
    if (generatedImage) {
      loadImageToCanvas(generatedImage);
    }
  }, [generatedImage]);

  useEffect(() => {
    if (originalImageData) {
      applyImageAdjustments();
    }
  }, [brightness, contrast, activeFilter, originalImageData]);

  useEffect(() => {
    // ONLY draw overlay if actively cropping
    if (isCropping && cropRect) {
      drawCropOverlay();
    }
  }, [cropRect]);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Image Editor</h1>
          <p className="text-muted-foreground">Generate AI images and edit them with powerful tools</p>
        </div>

        <Tabs defaultValue="generate" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="generate" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Generate
            </TabsTrigger>
            <TabsTrigger value="edit" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Edit
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="space-y-6">
            <Card className="bg-gradient-card shadow-card border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  AI Image Generation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Image Prompt</label>
                  <Textarea
                    placeholder="Describe the image you want to generate..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </div>
                <Button 
                  onClick={generateImage} 
                  disabled={isGenerating}
                  className="w-full"
                  size="lg"
                >
                  {isGenerating ? 'Generating...' : 'Generate Image'}
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card shadow-card border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-primary" />
                  Edit Your Own Image
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Upload Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadForEdit}
                    className="block w-full text-sm text-muted-foreground
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-md file:border-0
                      file:text-sm file:font-medium
                      file:bg-primary file:text-primary-foreground
                      hover:file:bg-primary/90 file:cursor-pointer"
                  />
                </div>
                
                {uploadedForEdit && (
                  <div className="border border-border rounded-lg p-4">
                    <img 
                      src={uploadedForEdit} 
                      alt="Uploaded for editing" 
                      className="max-w-full h-48 object-contain mx-auto rounded"
                    />
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium mb-2 block">Edit Instructions</label>
                  <Textarea
                    placeholder="Tell AI how to modify your image (e.g., 'add text saying Concert Tonight at 8PM' or 'make it more vibrant and add sparkles')"
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </div>
                
                <Button 
                  onClick={editUploadedImage} 
                  disabled={isEditing || !uploadedForEdit}
                  className="w-full"
                  size="lg"
                >
                  {isEditing ? 'Editing Image...' : 'Edit Image with AI'}
                </Button>
              </CardContent>
            </Card>

            {generatedImage && (
              <Card className="bg-gradient-card shadow-card border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Generated Image</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadGeneratedImage}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-center">
                    <img 
                      src={generatedImage} 
                      alt="Generated" 
                      className="max-w-full h-auto rounded-lg shadow-lg"
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="edit" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card className="bg-gradient-card shadow-card border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Canvas Editor</span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={downloadImage}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-center mb-4">
                      <canvas
                        ref={canvasRef}
                        className="border border-border rounded-lg max-w-full max-h-96 cursor-crosshair"
                        style={{ 
                          backgroundColor: '#f9f9f9',
                          cursor: isCropping ? 'crosshair' : 'default'
                        }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                      />
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <Card className="bg-gradient-card shadow-card border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sliders className="h-5 w-5 text-primary" />
                      Adjustments
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-3 block">
                          Brightness: {brightness}
                        </label>
                        <Slider
                          value={[brightness]}
                          onValueChange={handleBrightnessChange}
                          max={100}
                          min={-100}
                          step={1}
                          className="w-full"
                          disabled={!uploadedImage && !generatedImage}
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium mb-3 block">
                          Contrast: {contrast}
                        </label>
                        <Slider
                          value={[contrast]}
                          onValueChange={handleContrastChange}
                          max={100}
                          min={-100}
                          step={1}
                          className="w-full"
                          disabled={!uploadedImage && !generatedImage}
                        />
                      </div>
                      
                      <Button 
                        onClick={resetAdjustments} 
                        variant="outline"
                        size="sm"
                        className="w-full"
                        disabled={!uploadedImage && !generatedImage}
                      >
                        Reset Adjustments
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-card shadow-card border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Filter className="h-5 w-5 text-primary" />
                      Filter Presets
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        onClick={() => handleFilterChange('grayscale')}
                        variant={activeFilter === 'grayscale' ? "default" : "outline"}
                        size="sm"
                        disabled={!uploadedImage && !generatedImage}
                      >
                        B&W
                      </Button>
                      <Button
                        onClick={() => handleFilterChange('sepia')}
                        variant={activeFilter === 'sepia' ? "default" : "outline"}
                        size="sm"
                        disabled={!uploadedImage && !generatedImage}
                      >
                        Sepia
                      </Button>
                      <Button
                        onClick={() => handleFilterChange('vintage')}
                        variant={activeFilter === 'vintage' ? "default" : "outline"}
                        size="sm"
                        disabled={!uploadedImage && !generatedImage}
                      >
                        Vintage
                      </Button>
                      <Button
                        onClick={() => handleFilterChange('cool')}
                        variant={activeFilter === 'cool' ? "default" : "outline"}
                        size="sm"
                        disabled={!uploadedImage && !generatedImage}
                      >
                        Cool
                      </Button>
                      <Button
                        onClick={() => handleFilterChange('warm')}
                        variant={activeFilter === 'warm' ? "default" : "outline"}
                        size="sm"
                        className="col-span-2"
                        disabled={!uploadedImage && !generatedImage}
                      >
                        Warm
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-card shadow-card border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Crop className="h-5 w-5 text-primary" />
                      Crop Tools
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={startCrop}
                      disabled={isCropping || (!uploadedImage && !generatedImage)}
                    >
                      <Crop className="h-4 w-4 mr-2" />
                      {isCropping ? 'Select Area' : 'Free Crop'}
                    </Button>
                    {isCropping && (
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Aspect Ratio</label>
                          <div className="flex flex-wrap gap-1">
                            <Button
                              variant={aspectRatio === null ? "default" : "outline"}
                              size="sm"
                              onClick={() => setAspectRatio(null)}
                            >
                              Free
                            </Button>
                            <Button
                              variant={aspectRatio === 1 ? "default" : "outline"}
                              size="sm"
                              onClick={() => setAspectRatio(1)}
                            >
                              1:1
                            </Button>
                            <Button
                              variant={aspectRatio === 4/3 ? "default" : "outline"}
                              size="sm"
                              onClick={() => setAspectRatio(4/3)}
                            >
                              4:3
                            </Button>
                            <Button
                              variant={aspectRatio === 16/9 ? "default" : "outline"}
                              size="sm"
                              onClick={() => setAspectRatio(16/9)}
                            >
                              16:9
                            </Button>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="default"
                            size="sm"
                            className="flex-1"
                            onClick={confirmCrop}
                            disabled={!cropRect}
                          >
                            <Check className="h-4 w-4 mr-2" />
                            Apply
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={cancelCrop}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={rotateImage}
                      disabled={!uploadedImage && !generatedImage}
                    >
                      <RotateCw className="h-4 w-4 mr-2" />
                      Rotate 90°
                    </Button>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-card shadow-card border-border/50">
                  <CardHeader>
                    <CardTitle>Export Options</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <Badge variant="secondary">PNG</Badge>
                      <Badge variant="outline">JPG</Badge>
                      <Badge variant="outline">WebP</Badge>
                    </div>
                    <Button
                      variant="default"
                      className="w-full"
                      onClick={downloadImage}
                      disabled={!uploadedImage && !generatedImage}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Save as PNG
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ImageEditor;