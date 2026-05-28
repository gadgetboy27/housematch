import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface EmailVerificationRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
}

export function EmailVerificationRequiredModal({ 
  isOpen, 
  onClose, 
  email 
}: EmailVerificationRequiredModalProps) {
  const { toast } = useToast();
  const [resendCooldown, setResendCooldown] = useState(0);

  // Resend verification email mutation
  const resendMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auth/resend-verification", { email });
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to resend verification email');
      }
      return result;
    },
    onSuccess: () => {
      toast({
        title: "✅ Email sent!",
        description: "Check your inbox for the verification link.",
      });
      
      // Set cooldown to prevent spam
      setResendCooldown(60);
      const interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to resend",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    }
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto bg-white rounded-2xl p-0 overflow-hidden">
        <div className="p-8 text-center">
          {/* Email Icon */}
          <div className="mb-6">
            <div className="mx-auto w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <i className="fas fa-envelope text-white text-2xl"></i>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            📧 Verify Your Email
          </h2>
          
          {/* Description */}
          <p className="text-gray-600 mb-2">
            We sent a verification link to:
          </p>
          <p className="font-semibold text-purple-600 mb-6 break-all">
            {email}
          </p>

          {/* Instructions */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6 text-left">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <i className="fas fa-info text-white text-xs"></i>
              </div>
              <div>
                <p className="text-sm text-gray-700 mb-2">
                  <strong>Next steps:</strong>
                </p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Check your email inbox</li>
                  <li>• Click the verification link</li>
                  <li>• Return here to log in</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Security Notice */}
          <div className="bg-yellow-50 rounded-lg p-3 mb-6">
            <div className="flex items-center space-x-2 justify-center">
              <i className="fas fa-clock text-yellow-600 text-sm"></i>
              <p className="text-sm text-yellow-700">
                Link expires in <strong>24 hours</strong>
              </p>
            </div>
          </div>

          {/* Resend Button */}
          <Button 
            onClick={() => resendMutation.mutate()}
            disabled={resendCooldown > 0 || resendMutation.isPending}
            className="w-full h-12 mb-3 text-base bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="button-resend-verification"
          >
            {resendMutation.isPending ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Sending...
              </>
            ) : resendCooldown > 0 ? (
              `Resend in ${resendCooldown}s`
            ) : (
              <>
                <i className="fas fa-paper-plane mr-2"></i>
                Resend Verification Email
              </>
            )}
          </Button>

          {/* Close Button */}
          <Button 
            onClick={onClose}
            variant="outline"
            className="w-full h-12 text-base"
            data-testid="button-close-verification-modal"
          >
            Got it! ✨
          </Button>

          {/* Help Text */}
          <p className="text-xs text-gray-500 mt-4">
            Didn't receive the email? Check your spam folder or try resending.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
