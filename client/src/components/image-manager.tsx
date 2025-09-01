import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ObjectUploader } from "@/components/ObjectUploader";

interface ImageManagerProps {
  mainImage: string;
  additionalImages: string[];
  onMainImageChange: (url: string) => void;
  onAdditionalImagesChange: (images: string[]) => void;
  maxAdditionalImages?: number;
}

export function ImageManager({ 
  mainImage, 
  additionalImages, 
  onMainImageChange, 
  onAdditionalImagesChange,
  maxAdditionalImages = 10 
}: ImageManagerProps) {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleMainImageUpload = async () => {
    return {
      method: "PUT" as const,
      url: await getUploadURL(),
    };
  };

  const handleAdditionalImageUpload = async () => {
    return {
      method: "PUT" as const,
      url: await getUploadURL(),
    };
  };

  const getUploadURL = async (): Promise<string> => {
    const response = await apiRequest("POST", "/api/objects/upload");
    const data = await response.json();
    return data.uploadURL;
  };

  const normalizeImagePath = (uploadURL: string): string => {
    if (uploadURL.startsWith("https://storage.googleapis.com/")) {
      const url = new URL(uploadURL);
      const pathParts = url.pathname.split("/");
      if (pathParts.length >= 4) {
        const objectId = pathParts.slice(3).join("/");
        return `/objects/${objectId}`;
      }
    }
    return uploadURL;
  };

  const handleMainImageComplete = (uploadedUrls: string[]) => {
    if (uploadedUrls.length > 0) {
      const normalizedPath = normalizeImagePath(uploadedUrls[0]);
      onMainImageChange(normalizedPath);
      toast({
        title: "Image Uploaded",
        description: "Main property image has been updated!",
      });
    } else {
      toast({
        title: "Upload Failed",
        description: "Failed to upload main image. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAdditionalImageComplete = (uploadedUrls: string[]) => {
    if (uploadedUrls.length > 0) {
      const normalizedPath = normalizeImagePath(uploadedUrls[0]);
      const updatedImages = [...additionalImages, normalizedPath];
      onAdditionalImagesChange(updatedImages);
      toast({
        title: "Image Added",
        description: "Additional image has been uploaded!",
      });
    } else {
      toast({
        title: "Upload Failed", 
        description: "Failed to upload additional image. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteImage = (index: number) => {
    const updatedImages = additionalImages.filter((_, i) => i !== index);
    onAdditionalImagesChange(updatedImages);
    toast({
      title: "Image Removed",
      description: "Image has been removed from the property",
    });
  };

  const canAddMore = additionalImages.length < maxAdditionalImages;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <i className="fas fa-images text-blue-500"></i>
          Property Images
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Image */}
        <div>
          <label className="text-sm font-medium block mb-3">Main Image *</label>
          <div className="space-y-3">
            {mainImage && (
              <div className="relative">
                <img
                  src={mainImage}
                  alt="Main property image"
                  className="w-full h-48 object-cover rounded-lg border-2 border-blue-500"
                />
                <div className="absolute top-2 left-2 bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium">
                  Main Image
                </div>
              </div>
            )}
            <ObjectUploader
              maxNumberOfFiles={1}
              maxFileSize={10485760} // 10MB
              allowedFileTypes={['image/*']}
              onGetUploadParameters={handleMainImageUpload}
              onComplete={handleMainImageComplete}
              buttonClassName="w-full"
            >
              <div className="flex items-center gap-2">
                <i className="fas fa-upload"></i>
                <span>{mainImage ? "Replace Main Image" : "Upload Main Image"}</span>
              </div>
            </ObjectUploader>
          </div>
        </div>

        {/* Additional Images */}
        <div>
          <label className="text-sm font-medium block mb-3">
            Additional Images ({additionalImages.length}/{maxAdditionalImages})
          </label>
          
          {/* Current Additional Images */}
          {additionalImages.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
              {additionalImages.map((image, index) => (
                <div key={index} className="relative group">
                  <img
                    src={image}
                    alt={`Additional image ${index + 1}`}
                    className="w-full h-24 object-cover rounded-lg border"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    className="absolute top-1 right-1 w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDeleteImage(index)}
                    data-testid={`delete-image-${index}`}
                  >
                    <i className="fas fa-times text-xs"></i>
                  </Button>
                  <div className="absolute bottom-1 left-1 bg-black/70 text-white px-1 py-0.5 rounded text-xs">
                    {index + 1}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add More Images Button */}
          {canAddMore && (
            <ObjectUploader
              maxNumberOfFiles={1}
              maxFileSize={10485760} // 10MB
              allowedFileTypes={['image/*']}
              onGetUploadParameters={handleAdditionalImageUpload}
              onComplete={handleAdditionalImageComplete}
              buttonClassName="w-full"
            >
              <div className="flex items-center gap-2">
                <i className="fas fa-plus"></i>
                <span>Add Additional Image</span>
              </div>
            </ObjectUploader>
          )}

          {!canAddMore && (
            <p className="text-sm text-gray-500 text-center py-4">
              Maximum of {maxAdditionalImages} additional images reached
            </p>
          )}

          <p className="text-xs text-gray-500 mt-2">
            Upload high-quality images of different rooms, exterior views, and unique features. 
            Each image should be under 10MB.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}