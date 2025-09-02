import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface EmailVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
}

export function EmailVerificationModal({ isOpen, onClose, email }: EmailVerificationModalProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  const [animationStep, setAnimationStep] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true);
      setAnimationStep(0);
      
      // Trigger animation sequence
      const timer1 = setTimeout(() => setAnimationStep(1), 100);
      const timer2 = setTimeout(() => setAnimationStep(2), 600);
      const timer3 = setTimeout(() => setAnimationStep(3), 1200);
      
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    } else {
      setShowConfetti(false);
      setAnimationStep(0);
    }
  }, [isOpen]);

  const confettiPieces = Array.from({ length: 50 }, (_, i) => (
    <div
      key={i}
      className={`absolute w-2 h-2 ${
        ['bg-purple-500', 'bg-pink-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500'][i % 6]
      } ${showConfetti ? 'animate-confetti' : ''}`}
      style={{
        left: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 2}s`,
        animationDuration: `${2 + Math.random() * 3}s`,
      }}
      data-testid={`confetti-${i}`}
    />
  ));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto bg-white rounded-2xl p-0 overflow-hidden relative">
        {/* Confetti Background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {confettiPieces}
        </div>

        <div className="relative z-10 p-8 text-center">
          {/* Animated Email Icon */}
          <div className="mb-6">
            <div className={`relative mx-auto w-20 h-20 transition-all duration-500 ${
              animationStep >= 1 ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
            }`}>
              <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center relative">
                <i className="fas fa-envelope text-white text-2xl"></i>
                
                {/* Flying envelope animation */}
                {animationStep >= 2 && (
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center animate-bounce">
                    <i className="fas fa-check text-white text-sm"></i>
                  </div>
                )}
              </div>
              
              {/* Pulse rings */}
              {animationStep >= 1 && (
                <>
                  <div className="absolute inset-0 rounded-full bg-purple-300 animate-ping opacity-20"></div>
                  <div className="absolute inset-2 rounded-full bg-purple-300 animate-ping opacity-10" style={{ animationDelay: '0.5s' }}></div>
                </>
              )}
            </div>
          </div>

          {/* Animated Text */}
          <div className={`transition-all duration-700 ${
            animationStep >= 2 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`}>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              📧 Email Sent!
            </h2>
            <p className="text-gray-600 mb-2">
              We've sent a password reset link to:
            </p>
            <p className="font-semibold text-purple-600 mb-4 break-all">
              {email}
            </p>
          </div>

          {/* Instructions */}
          <div className={`transition-all duration-700 delay-300 ${
            animationStep >= 3 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`}>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <i className="fas fa-info text-white text-xs"></i>
                </div>
                <div className="text-left">
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                    <strong>Next steps:</strong>
                  </p>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <li>• Check your email inbox</li>
                    <li>• Click the reset link in the email</li>
                    <li>• Create your new password</li>
                    <li>• Sign in with your new password</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 mb-6">
              <div className="flex items-center space-x-2">
                <i className="fas fa-clock text-yellow-600 text-sm"></i>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  <strong>Link expires in 1 hour</strong> for your security
                </p>
              </div>
            </div>

            <Button 
              onClick={onClose}
              className="w-full h-12 text-base bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0"
              data-testid="button-close-modal"
            >
              Got it! ✨
            </Button>

            <p className="text-xs text-gray-500 mt-4">
              Didn't receive the email? Check your spam folder or try again in a few minutes.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}