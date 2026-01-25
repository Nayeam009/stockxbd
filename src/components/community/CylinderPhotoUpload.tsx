import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Camera, 
  Upload, 
  Trash2, 
  Loader2,
  ImageIcon,
  ZoomIn
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface CylinderPhotoUploadProps {
  currentPhotoUrl: string | null;
  onPhotoChange: (url: string | null) => void;
  disabled?: boolean;
  className?: string;
}

export const CylinderPhotoUpload = ({ 
  currentPhotoUrl, 
  onPhotoChange,
  disabled = false,
  className
}: CylinderPhotoUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({ 
        title: "Invalid file type", 
        description: "Please upload an image file",
        variant: "destructive" 
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({ 
        title: "File too large", 
        description: "Maximum file size is 5MB",
        variant: "destructive" 
      });
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Delete old photo if exists
      if (currentPhotoUrl) {
        const oldPath = currentPhotoUrl.split('/').pop();
        if (oldPath) {
          await supabase.storage
            .from('cylinder-photos')
            .remove([`${user.id}/${oldPath}`]);
        }
      }

      // Upload new photo
      const fileExt = file.name.split('.').pop();
      const fileName = `cylinder-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('cylinder-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get signed URL (bucket is now private for security)
      // Store the file path instead of URL - we'll generate signed URLs when displaying
      const { data: signedData, error: signedError } = await supabase.storage
        .from('cylinder-photos')
        .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year expiry

      if (signedError) throw signedError;

      onPhotoChange(signedData.signedUrl);
      toast({ title: "Photo uploaded successfully!" });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({ 
        title: "Upload failed", 
        description: error.message,
        variant: "destructive" 
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!currentPhotoUrl) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const urlParts = currentPhotoUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const filePath = `${user.id}/${fileName}`;

      await supabase.storage
        .from('cylinder-photos')
        .remove([filePath]);

      onPhotoChange(null);
      toast({ title: "Photo removed" });
    } catch (error: any) {
      console.error('Delete error:', error);
      toast({ 
        title: "Failed to remove photo", 
        description: error.message,
        variant: "destructive" 
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Photo Display/Upload Area */}
      <Card className={cn(
        "border-2 border-dashed overflow-hidden transition-colors",
        currentPhotoUrl ? "border-primary/30" : "border-muted-foreground/30",
        disabled && "opacity-50 pointer-events-none"
      )}>
        <CardContent className="p-0">
          {currentPhotoUrl ? (
            <div className="relative aspect-square max-h-[200px] w-full">
              <img 
                src={currentPhotoUrl} 
                alt="Cylinder" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 hover:opacity-100 transition-opacity flex items-end justify-center pb-3 gap-2">
                <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="secondary" className="h-8">
                      <ZoomIn className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg p-2">
                    <DialogHeader className="sr-only">
                      <DialogTitle>Cylinder Photo</DialogTitle>
                    </DialogHeader>
                    <img 
                      src={currentPhotoUrl} 
                      alt="Cylinder Full View" 
                      className="w-full h-auto rounded-lg"
                    />
                  </DialogContent>
                </Dialog>
                <Button 
                  size="sm" 
                  variant="destructive" 
                  className="h-8"
                  onClick={handleDelete}
                  disabled={uploading}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Remove
                </Button>
              </div>
              <Badge className="absolute top-2 right-2 bg-emerald-500">
                ✓ Photo Added
              </Badge>
            </div>
          ) : (
            <div className="aspect-square max-h-[200px] flex flex-col items-center justify-center p-6 text-center">
              {uploading ? (
                <>
                  <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
                  <p className="text-sm text-muted-foreground">Uploading...</p>
                </>
              ) : (
                <>
                  <ImageIcon className="h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-sm font-medium mb-1">Cylinder Photo</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Upload a clear photo of your cylinder
                  </p>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Buttons */}
      {!currentPhotoUrl && !uploading && (
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-12 flex-col gap-1"
            onClick={() => cameraInputRef.current?.click()}
            disabled={disabled}
          >
            <Camera className="h-5 w-5" />
            <span className="text-xs">Camera</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-12 flex-col gap-1"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
          >
            <Upload className="h-5 w-5" />
            <span className="text-xs">Gallery</span>
          </Button>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file);
          e.target.value = '';
        }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file);
          e.target.value = '';
        }}
      />
    </div>
  );
};
