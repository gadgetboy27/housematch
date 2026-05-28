import { useState, useRef } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { StorageLimitModal } from "./storage-limit-modal";
import { apiRequest } from "@/lib/queryClient";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  allowedFileTypes?: string[];
  uploadType?: 'image' | 'video' | 'audio'; // New prop to specify upload type
  userId?: string; // User ID for storage tracking
  onGetUploadParameters: () => Promise<{
    method: "PUT";
    url: string;
  }>;
  onComplete?: (files: string[]) => void;
  onUploadProgress?: (files: any[]) => void;
  buttonClassName?: string;
  children: ReactNode;
}

/**
 * A file upload component that renders as a button and provides a modal interface for
 * file management with camera and gallery support.
 * 
 * Features:
 * - Renders as a customizable button that opens a file upload modal
 * - Provides a modal interface for:
 *   - File selection (including camera and gallery on mobile)
 *   - File preview
 *   - Upload progress tracking
 *   - Upload status display
 * 
 * The component uses Uppy under the hood to handle all file upload functionality.
 * All file management features are automatically handled by the Uppy dashboard modal.
 * 
 * @param props - Component props
 * @param props.maxNumberOfFiles - Maximum number of files allowed to be uploaded
 *   (default: 1)
 * @param props.maxFileSize - Maximum file size in bytes (default: 10MB)
 * @param props.allowedFileTypes - Array of allowed file types (default: images only)
 * @param props.onGetUploadParameters - Function to get upload parameters (method and URL).
 *   Typically used to fetch a presigned URL from the backend server for direct-to-S3
 *   uploads.
 * @param props.onComplete - Callback function called when upload is complete. Typically
 *   used to make post-upload API calls to update server state and set object ACL
 *   policies.
 * @param props.buttonClassName - Optional CSS class name for the button
 * @param props.children - Content to be rendered inside the button
 */
export function ObjectUploader({
  maxNumberOfFiles = 4,
  maxFileSize = 10485760, // 10MB default
  allowedFileTypes = ['image/*'], // Default to images only
  uploadType = 'image',
  userId, // REQUIRED - must be passed from parent component with authenticated user ID
  onGetUploadParameters,
  onComplete,
  onUploadProgress,
  buttonClassName,
  children,
}: ObjectUploaderProps) {
  if (!userId) {
    throw new Error('ObjectUploader requires userId from authenticated session');
  }
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [showStorageModal, setShowStorageModal] = useState(false);
  const [storageLimitData, setStorageLimitData] = useState<{
    fileType: 'video' | 'audio';
    exceededBy: number;
    currentUsage: number;
    limit: number;
  } | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check storage limit before upload (for video and audio only)
  const checkStorageLimit = async (file: File): Promise<boolean> => {
    // Only check storage for video and audio uploads
    if (uploadType !== 'video' && uploadType !== 'audio') {
      return true;
    }

    try {
      const response = await apiRequest('POST', `/api/users/${userId}/storage/check`, {
        fileSize: file.size,
        fileType: uploadType
      });
      
      const result = await response.json();
      
      if (!result.canUpload) {
        setStorageLimitData({
          fileType: uploadType,
          exceededBy: result.exceededBy,
          currentUsage: result.currentUsage,
          limit: result.limit
        });
        setShowStorageModal(true);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Error checking storage limit:", error);
      return true; // Allow upload if check fails
    }
  };

  // Handle storage upgrade purchase
  const handlePurchaseUpgrade = async () => {
    if (!storageLimitData) return;
    
    setIsPurchasing(true);
    try {
      const response = await apiRequest('POST', `/api/users/${userId}/storage/upgrade`, {
        upgradeType: storageLimitData.fileType
      });
      
      const result = await response.json();
      console.log("Storage upgrade successful:", result);
      
      setShowStorageModal(false);
      setStorageLimitData(null);
      
      // Automatically retry the file upload
      if (fileInputRef.current && fileInputRef.current.files) {
        handleFileSelect({ target: fileInputRef.current } as any);
      }
    } catch (error) {
      console.error("Storage upgrade failed:", error);
    } finally {
      setIsPurchasing(false);
    }
  };

  // Update user storage after successful upload
  const updateUserStorage = async (fileSize: number) => {
    // Only update storage for video and audio uploads
    if (uploadType !== 'video' && uploadType !== 'audio') {
      return;
    }

    try {
      const updateData = uploadType === 'video' 
        ? { videoSize: fileSize } 
        : { audioSize: fileSize };
        
      await apiRequest('POST', `/api/users/${userId}/storage/update`, updateData);
      console.log(`Updated ${uploadType} storage usage:`, fileSize);
    } catch (error) {
      console.error("Failed to update storage usage:", error);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log("📸 handleFileSelect called!");
    const files = Array.from(event.target.files || []);
    console.log("📸 Files from input:", files.length, files.map(f => ({ name: f.name, size: f.size, type: f.type })));
    
    if (files.length === 0) {
      console.warn("⚠️ No files selected!");
      return;
    }

    console.log("🔍 Files selected:", files.length);
    
    // Check if selected files exceed the limit
    if (files.length > maxNumberOfFiles) {
      alert(`You can only upload up to ${maxNumberOfFiles} file(s) at a time.`);
      console.error("🔍 Too many files selected");
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onComplete?.([]);
      return;
    }

    // Check file types (for images)
    if (uploadType === 'image') {
      const invalidFiles = files.filter(file => {
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        const validExtensions = ['jpg', 'jpeg', 'png', 'heic', 'heif', 'jfif', 'tiff', 'tif', 'webp'];
        const validMimeTypes = [
          'image/jpeg',
          'image/jpg', 
          'image/png',
          'image/heic',
          'image/heif',
          'image/tiff',
          'image/webp'
        ];
        
        const hasValidExtension = fileExtension && validExtensions.includes(fileExtension);
        const hasValidMimeType = validMimeTypes.includes(file.type);
        
        return !hasValidExtension && !hasValidMimeType;
      });

      if (invalidFiles.length > 0) {
        const invalidNames = invalidFiles.map(f => f.name).join(', ');
        alert(`Invalid file type(s): ${invalidNames}\n\nSupported formats: JPG, JPEG, PNG, HEIC, JFIF, TIFF, WebP`);
        console.error("🔍 Invalid file types:", invalidFiles.map(f => f.name));
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        onComplete?.([]);
        return;
      }
    }

    // Check file sizes
    const oversizedFiles = files.filter(file => file.size > maxFileSize);
    if (oversizedFiles.length > 0) {
      const maxSizeMB = (maxFileSize / (1024 * 1024)).toFixed(1);
      alert(`File(s) too large. Maximum size is ${maxSizeMB}MB per file.`);
      console.error("🔍 Files too large:", oversizedFiles.map(f => f.name));
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onComplete?.([]);
      return;
    }

    // Check storage limits for video/audio files
    for (const file of files) {
      const canUpload = await checkStorageLimit(file);
      if (!canUpload) {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return; // Storage modal will be shown
      }
    }

    setIsUploading(true);

    try {
      const uploadedUrls: string[] = [];
      let totalUploadSize = 0;

      for (const file of files) {
        console.log(`📤 [${files.indexOf(file) + 1}/${files.length}] Uploading:`, file.name);
        
        // Get upload parameters
        console.log("🔑 Getting upload URL...");
        const { url } = await onGetUploadParameters();
        console.log("✅ Got URL:", url.substring(0, 100) + "...");
        
        // Upload file directly
        console.log("📤 PUT request to GCS...");
        const response = await fetch(url, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        });

        console.log("📡 Upload response:", response.status, response.statusText);

        if (response.ok) {
          const cleanUrl = url.split('?')[0];
          uploadedUrls.push(cleanUrl);
          totalUploadSize += file.size;
          console.log("✅ SUCCESS! File uploaded:", file.name, "→", cleanUrl);
        } else {
          console.error("❌ FAILED! Upload error:", file.name, response.status);
        }
      }

      console.log("📊 Upload summary:", { uploaded: uploadedUrls.length, urls: uploadedUrls });

      if (uploadedUrls.length > 0) {
        const newFiles = [...uploadedFiles, ...uploadedUrls];
        setUploadedFiles(newFiles);
        console.log("💾 Calling callbacks with", newFiles.length, "files");
        
        console.log("📞 Calling onUploadProgress...");
        try {
          onUploadProgress?.(newFiles);
          console.log("✅ onUploadProgress completed");
        } catch (err) {
          console.error("❌ onUploadProgress error:", err);
        }
        
        console.log("📞 Calling onComplete with:", uploadedUrls);
        try {
          onComplete?.(uploadedUrls);
          console.log("✅ onComplete completed");
        } catch (err) {
          console.error("❌ onComplete error:", err);
        }
        
        // Update user storage for video/audio uploads
        if (totalUploadSize > 0) {
          await updateUserStorage(totalUploadSize);
        }
      } else {
        console.error("❌ No files uploaded successfully!");
      }
    } catch (error) {
      console.error("❌ Upload error:", error);
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
      console.log("🏁 Upload complete, isUploading=false");
    }
  };

  return (
    <div>
      {/* Hidden file input with camera/gallery support */}
      <input
        ref={fileInputRef}
        type="file"
        accept={uploadType === 'image' 
          ? '.jpg,.jpeg,.png,.heic,.heif,.jfif,.tiff,.tif,.webp,image/jpeg,image/jpg,image/png,image/heic,image/heif,image/tiff,image/webp'
          : allowedFileTypes.join(',')}
        multiple={maxNumberOfFiles > 1}
        onChange={handleFileSelect}
        className="hidden"
      />

      <Button 
        type="button"
        onClick={() => {
          console.log("🔍 Upload button clicked!");
          fileInputRef.current?.click();
        }} 
        className={buttonClassName}
        disabled={isUploading}
        data-testid="button-upload-file"
      >
        {isUploading ? (
          <div className="flex flex-col items-center space-y-1">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm">Uploading...</span>
          </div>
        ) : (
          children
        )}
      </Button>

      {/* Show uploaded files count */}
      {uploadedFiles.length > 0 && (
        <div className="mt-2 text-sm text-green-600">
          ✅ {uploadedFiles.length} {uploadType}{uploadedFiles.length > 1 ? 's' : ''} uploaded
          {uploadedFiles.length >= 4 && uploadType === 'image' && (
            <div className="text-xs text-orange-600 mt-1">
              💎 Need more than 4 photos? Upgrade to Premium (Coming Soon)
            </div>
          )}
        </div>
      )}

      {/* Storage Limit Paywall Modal */}
      {storageLimitData && (
        <StorageLimitModal
          isOpen={showStorageModal}
          onClose={() => setShowStorageModal(false)}
          fileType={storageLimitData.fileType}
          exceededBy={storageLimitData.exceededBy}
          currentUsage={storageLimitData.currentUsage}
          limit={storageLimitData.limit}
          onPurchaseUpgrade={handlePurchaseUpgrade}
          isPurchasing={isPurchasing}
        />
      )}
    </div>
  );
}