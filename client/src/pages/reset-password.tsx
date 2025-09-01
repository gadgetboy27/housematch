import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

export function ResetPassword() {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [token, setToken] = useState<string>('');
  const { toast } = useToast();

  // Extract token from URL on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const resetToken = urlParams.get('token');
    if (!resetToken) {
      toast({
        title: 'Invalid reset link',
        description: 'This password reset link is invalid or has expired.',
        variant: 'destructive'
      });
      setLocation('/');
      return;
    }
    setToken(resetToken);
  }, [toast, setLocation]);

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: { token: string; newPassword: string }) => {
      console.log('🔐 RESET PASSWORD ATTEMPT:', { token: data.token.slice(0, 8) + '...' });
      
      const response = await apiRequest('POST', '/api/auth/reset-password', {
        token: data.token,
        newPassword: data.newPassword
      });
      const result = await response.json();
      
      console.log('🔐 RESET PASSWORD RESPONSE:', { 
        status: response.status, 
        message: result.message 
      });
      
      if (!response.ok) {
        throw new Error(result.message || `HTTP ${response.status}: Password reset failed`);
      }
      return result;
    },
    onSuccess: (result) => {
      console.log('✅ PASSWORD RESET SUCCESS:', result);
      toast({
        title: 'Password reset successful!',
        description: result.message,
      });
      // Redirect to home page after successful reset
      setTimeout(() => {
        setLocation('/');
      }, 2000);
    },
    onError: (error: Error) => {
      console.error('❌ PASSWORD RESET ERROR:', error);
      toast({
        title: 'Password reset failed', 
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.newPassword || !formData.confirmPassword) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    if (formData.newPassword.length < 6) {
      toast({
        title: 'Error',
        description: 'Password must be at least 6 characters long',
        variant: 'destructive',
      });
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    resetPasswordMutation.mutate({
      token,
      newPassword: formData.newPassword
    });
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-lg">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-exclamation-triangle text-red-600 text-xl"></i>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Invalid Reset Link</h1>
            <p className="text-gray-600 mb-6">This password reset link is invalid or has expired.</p>
            <Button 
              onClick={() => setLocation('/')}
              className="w-full"
              data-testid="button-go-home"
            >
              Go to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-lg">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-lock text-white text-xl"></i>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Reset Your Password</h1>
          <p className="text-gray-600 mt-2">Enter your new password below</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>
            <Input
              id="newPassword"
              type="password"
              placeholder="Enter new password (min 6 characters)"
              value={formData.newPassword}
              onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
              className="w-full"
              data-testid="input-new-password"
            />
          </div>
          
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Confirm New Password
            </label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirm new password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              className="w-full"
              data-testid="input-confirm-password"
            />
          </div>

          <Button 
            type="submit"
            disabled={resetPasswordMutation.isPending}
            className="w-full h-12 text-base"
            data-testid="button-reset-password-submit"
          >
            {resetPasswordMutation.isPending ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Resetting Password...</span>
              </div>
            ) : (
              'Reset Password'
            )}
          </Button>
        </form>

        <div className="text-center mt-6 pt-6 border-t border-gray-100">
          <button
            onClick={() => setLocation('/')}
            className="text-purple-600 font-medium hover:text-purple-700 transition-colors"
            data-testid="button-back-to-home"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}