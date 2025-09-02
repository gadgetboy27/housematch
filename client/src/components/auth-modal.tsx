import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { EmailVerificationModal } from "./email-verification-modal";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: { id: string; name: string; email: string }) => void;
  mode: 'login' | 'signup' | 'forgot-password';
  onToggleMode: () => void;
  onForgotPassword?: () => void;
}

export function AuthModal({ isOpen, onClose, onSuccess, mode, onToggleMode, onForgotPassword }: AuthModalProps) {
  const [formData, setFormData] = useState({
    email: "",
    name: "", 
    password: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forgotPasswordMode, setForgotPasswordMode] = useState<'request' | 'success'>('request');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [sentEmail, setSentEmail] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      console.log("🔐 LOGIN ATTEMPT:", { email: data.email, timestamp: new Date().toISOString() });
      
      const response = await apiRequest("POST", "/api/auth/login", data);
      const result = await response.json();
      
      console.log("🔐 LOGIN RESPONSE:", { 
        status: response.status, 
        success: result.success, 
        hasUser: !!result.user,
        message: result.message 
      });
      
      if (!response.ok) {
        throw new Error(result.message || `HTTP ${response.status}: Login request failed`);
      }
      return result;
    },
    onSuccess: (result) => {
      console.log("✅ LOGIN SUCCESS:", result);
      if (result.success) {
        // Immediately update auth cache to prevent race conditions
        queryClient.setQueryData(["/api/auth/user"], result.user);
        
        onSuccess(result.user);
        onClose();
        toast({
          title: "Welcome back!",
          description: `Logged in as ${result.user.name}`,
        });
      } else {
        console.error("❌ Login success but result.success is false:", result);
        toast({
          title: "Login failed",
          description: result.message || "Unexpected server response",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      console.error("❌ LOGIN ERROR:", {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      toast({
        title: "Login failed", 
        description: error.message || "Please check your credentials and try again",
        variant: "destructive",
      });
    }
  });

  // Register mutation  
  const registerMutation = useMutation({
    mutationFn: async (data: { email: string; name: string; password: string }) => {
      console.log("📝 REGISTER ATTEMPT:", { email: data.email, name: data.name, timestamp: new Date().toISOString() });
      
      const response = await apiRequest("POST", "/api/auth/register", data);
      const result = await response.json();
      
      console.log("📝 REGISTER RESPONSE:", { 
        status: response.status, 
        success: result.success, 
        hasUser: !!result.user,
        message: result.message 
      });
      
      if (!response.ok) {
        throw new Error(result.message || `HTTP ${response.status}: Registration failed`);
      }
      return result;
    },
    onSuccess: (result) => {
      console.log("✅ REGISTRATION SUCCESS:", result);
      if (result.success) {
        // Immediately update auth cache to prevent race conditions
        queryClient.setQueryData(["/api/auth/user"], result.user);
        
        onSuccess(result.user);
        onClose();
        toast({
          title: "Welcome!",
          description: `Account created for ${result.user.name}`,
        });
      } else {
        console.error("❌ Registration success but result.success is false:", result);
        toast({
          title: "Registration failed",
          description: result.message || "Unexpected server response",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      console.error("❌ REGISTRATION ERROR:", {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      toast({
        title: "Registration failed", 
        description: error.message || "Please check your details and try again",
        variant: "destructive",
      });
    }
  });

  // Forgot password mutation
  const forgotPasswordMutation = useMutation({
    mutationFn: async (email: string) => {
      console.log("🔐 FORGOT PASSWORD REQUEST:", { email, timestamp: new Date().toISOString() });
      
      const response = await apiRequest("POST", "/api/auth/forgot-password", { email });
      const result = await response.json();
      
      console.log("🔐 FORGOT PASSWORD RESPONSE:", { 
        status: response.status, 
        message: result.message 
      });
      
      if (!response.ok) {
        throw new Error(result.message || `HTTP ${response.status}: Forgot password request failed`);
      }
      return result;
    },
    onSuccess: (result) => {
      console.log("✅ FORGOT PASSWORD SUCCESS:", result);
      setForgotPasswordMode('success');
      setSentEmail(formData.email);
      setShowEmailModal(true);
      onClose(); // Close the auth modal
    },
    onError: (error: Error) => {
      console.error("❌ FORGOT PASSWORD ERROR:", error);
      toast({
        title: "Failed to send reset email", 
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === 'forgot-password') {
      if (!formData.email) {
        toast({
          title: "Error",
          description: "Please enter your email address",
          variant: "destructive",
        });
        return;
      }
      
      setIsSubmitting(true);
      forgotPasswordMutation.mutate(formData.email);
      setIsSubmitting(false);
      return;
    }
    
    if (!formData.email || !formData.password) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (mode === 'signup' && !formData.name) {
      toast({
        title: "Error", 
        description: "Name is required",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    if (mode === 'login') {
      loginMutation.mutate({ 
        email: formData.email, 
        password: formData.password 
      });
    } else {
      registerMutation.mutate({
        email: formData.email,
        name: formData.name,
        password: formData.password
      });
    }
    
    setIsSubmitting(false);
  };

  const resetForm = () => {
    setFormData({ email: "", name: "", password: "" });
    setForgotPasswordMode('request');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full relative animate-in zoom-in-95 duration-200">
        {/* Close button */}
        <button 
          onClick={handleClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
          data-testid="button-close-auth"
        >
          <i className="fas fa-times text-gray-600 text-sm"></i>
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className={`fas ${mode === 'forgot-password' ? 'fa-key' : 'fa-user'} text-white text-xl`}></i>
          </div>
          <h2 className="text-xl font-bold text-gray-900">
            {mode === 'forgot-password' ? 'Reset Password' :
             mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {mode === 'forgot-password' 
              ? forgotPasswordMode === 'success' 
                ? 'Check your email for a reset link' 
                : 'Enter your email to receive a reset link'
              : mode === 'login' 
                ? 'Sign in to save your property likes' 
                : 'Join PropertySwipe NZ today'
            }
          </p>
        </div>

        {/* Form */}
        {mode === 'forgot-password' && forgotPasswordMode === 'success' ? (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <i className="fas fa-check text-green-600 text-xl"></i>
            </div>
            <p className="text-gray-600">
              We've sent a password reset link to your email address. 
              Please check your inbox and follow the instructions to reset your password.
            </p>
            <p className="text-sm text-gray-500">
              The reset link will expire in 1 hour for security.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <Input
                type="text"
                placeholder="Full Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full"
                data-testid="input-auth-name"
              />
            )}
            
            <Input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full"
              data-testid="input-auth-email"
            />
            
            {mode !== 'forgot-password' && (
              <Input
                type="password"
                placeholder="Password (min 6 characters)"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full"
                data-testid="input-auth-password"
              />
            )}

            <Button 
              type="submit"
              disabled={isSubmitting || loginMutation.isPending || registerMutation.isPending || forgotPasswordMutation.isPending}
              className="w-full h-12 text-base"
              data-testid="button-auth-submit"
            >
              {isSubmitting || loginMutation.isPending || registerMutation.isPending || forgotPasswordMutation.isPending ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>{mode === 'forgot-password' ? 'Sending reset link...' :
                         mode === 'login' ? 'Signing in...' : 'Creating account...'}</span>
                </div>
              ) : (
                mode === 'forgot-password' ? 'Send Reset Link' :
                mode === 'login' ? 'Sign In' : 'Create Account'
              )}
            </Button>

            {/* Forgot password link for login mode */}
            {mode === 'login' && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    onForgotPassword ? onForgotPassword() : onToggleMode();
                  }}
                  className="text-sm text-purple-600 hover:text-purple-700 underline"
                  data-testid="link-forgot-password"
                >
                  Forgot your password?
                </button>
              </div>
            )}
          </form>
        )}

        {/* Toggle mode */}
        <div className="text-center mt-6 pt-4 border-t border-gray-100">
          {mode === 'forgot-password' ? (
            <button
              onClick={() => {
                resetForm();
                onToggleMode();
              }}
              className="text-purple-600 font-medium hover:text-purple-700 transition-colors"
              data-testid="button-back-to-login"
            >
              ← Back to Sign In
            </button>
          ) : (
            <>
              <p className="text-sm text-gray-600">
                {mode === 'login' ? "Don't have an account?" : "Already have an account?"}
              </p>
              <button
                onClick={() => {
                  resetForm();
                  onToggleMode();
                }}
                className="text-purple-600 font-medium hover:text-purple-700 transition-colors mt-1"
                data-testid="button-toggle-auth-mode"
              >
                {mode === 'login' ? 'Create Account' : 'Sign In'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Email verification celebration modal */}
      <EmailVerificationModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        email={sentEmail}
      />
    </div>
  );
}