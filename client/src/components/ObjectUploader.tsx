import { useState } from "react";
import type { ReactNode } from "react";
import Uppy from "@uppy/core";
import { DashboardModal } from "@uppy/react";
import AwsS3 from "@uppy/aws-s3";
import type { UploadResult } from "@uppy/core";
import { Button } from "@/components/ui/button";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  allowedFileTypes?: string[];
  onGetUploadParameters: () => Promise<{
    method: "PUT";
    url: string;
  }>;
  onComplete?: (
    result: UploadResult<Record<string, unknown>, Record<string, unknown>>
  ) => void;
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
  onGetUploadParameters,
  onComplete,
  onUploadProgress,
  buttonClassName,
  children,
}: ObjectUploaderProps) {
  const [showModal, setShowModal] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  
  const [uppy] = useState(() => {
    const uppyInstance = new Uppy({
      restrictions: {
        maxNumberOfFiles,
        maxFileSize,
        allowedFileTypes,
      },
      autoProceed: false,
      allowMultipleUploadBatches: true,
    });

    uppyInstance.use(AwsS3, {
      shouldUseMultipart: false,
      getUploadParameters: async (file) => {
        // Call the parameter function for each file
        const params = await onGetUploadParameters();
        return params;
      },
    });

    uppyInstance.on("complete", (result) => {
      if (result.successful) {
        const newFiles = [...uploadedFiles, ...result.successful];
        setUploadedFiles(newFiles);
        onUploadProgress?.(newFiles);
        onComplete?.(result);
      }
      setShowModal(false);
    });

    uppyInstance.on("upload-progress", (file, progress) => {
      // Provide real-time progress feedback
      console.log(`Upload progress for ${file?.name}: ${progress.percentage}%`);
    });

    uppyInstance.on("error", (error) => {
      console.error("Upload error:", error);
    });

    return uppyInstance;
  });

  return (
    <div>
      <Button 
        type="button"
        onClick={() => setShowModal(true)} 
        className={buttonClassName}
        data-testid="button-upload-file"
      >
        {children}
      </Button>

      {/* Show uploaded files count */}
      {uploadedFiles.length > 0 && (
        <div className="mt-2 text-sm text-green-600">
          ✅ {uploadedFiles.length} photo{uploadedFiles.length > 1 ? 's' : ''} uploaded
          {uploadedFiles.length >= 4 && (
            <div className="text-xs text-orange-600 mt-1">
              💎 Need more than 4 photos? Upgrade to Premium (Coming Soon)
            </div>
          )}
        </div>
      )}

      <DashboardModal
        uppy={uppy}
        open={showModal}
        onRequestClose={() => setShowModal(false)}
        proudlyDisplayPoweredByUppy={false}
        metaFields={[]}
        note={`Upload up to ${maxNumberOfFiles} high-quality property images. On mobile, tap "Browse Files" then choose Camera, Gallery, or Files.`}
        hideProgressDetails={false}
      />
    </div>
  );
}