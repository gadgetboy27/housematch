import { motion } from "framer-motion";
import { AlertTriangle, Video, Mic, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StorageLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileType: 'video' | 'audio';
  exceededBy: number;
  currentUsage: number;
  limit: number;
  onPurchaseUpgrade: () => void;
  isPurchasing?: boolean;
}

export function StorageLimitModal({ 
  isOpen, 
  onClose, 
  fileType, 
  exceededBy, 
  currentUsage, 
  limit,
  onPurchaseUpgrade,
  isPurchasing = false
}: StorageLimitModalProps) {
  if (!isOpen) return null;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const upgradePrice = fileType === 'video' ? 9.99 : 9.90;
  const upgradeAmount = 150; // MB
  const icon = fileType === 'video' ? <Video className="w-8 h-8" /> : <Mic className="w-8 h-8" />;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" data-testid="modal-storage-limit">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl max-w-md w-full p-6"
      >
        {/* Header */}
        <div className="flex items-center justify-center mb-4">
          <div className="p-3 rounded-full bg-orange-100 text-orange-600">
            <AlertTriangle className="w-8 h-8" />
          </div>
        </div>

        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Storage Limit Reached</h2>
          <p className="text-gray-600">
            You've reached your {fileType} storage limit and need {formatBytes(exceededBy)} more space to upload this file.
          </p>
        </div>

        {/* Usage Stats */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Current Usage</span>
            <span className="text-sm font-medium">{formatBytes(currentUsage)} / {formatBytes(limit)}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-red-500 h-2 rounded-full" 
              style={{ width: `${Math.min((currentUsage / limit) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Upgrade Offer */}
        <div className="border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
              {icon}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1">
                Extra {fileType === 'video' ? 'Video' : 'Audio'} Storage
              </h3>
              <p className="text-sm text-gray-600 mb-2">
                Add {upgradeAmount}MB more {fileType} storage to your account
              </p>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>• {upgradeAmount}MB additional {fileType} storage</li>
                <li>• Supports all native formats</li>
                <li>• Lifetime access to uploaded files</li>
                <li>• No monthly fees - one-time purchase</li>
              </ul>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-blue-600">
                ${upgradePrice}
              </div>
              <div className="text-xs text-gray-500">one-time</div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="flex-1"
            data-testid="button-cancel-upgrade"
          >
            Cancel
          </Button>
          <Button 
            onClick={onPurchaseUpgrade}
            disabled={isPurchasing}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
            data-testid="button-purchase-upgrade"
          >
            {isPurchasing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4 mr-2" />
                Purchase ${upgradePrice}
              </>
            )}
          </Button>
        </div>

        {/* Footer */}
        <p className="text-xs text-gray-500 text-center mt-4">
          After purchase, you'll be able to upload this file and continue adding {fileType} content.
        </p>
      </motion.div>
    </div>
  );
}