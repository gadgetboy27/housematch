import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { apiRequest } from "@/lib/queryClient";
import { EmailVerificationModal } from "./email-verification-modal";
import { EmailVerificationRequiredModal } from "./email-verification-required-modal";
import { generateSecurePassword, estimatePasswordStrength } from "@/lib/password-generator";
import { LocalStorageService } from "@/lib/local-storage";
import { fbTrackCompleteRegistration } from "@/components/FacebookPixel";

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
    password: "",
    persona: "" // Optional: family, investor, professional, retiree, first_home_buyer
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forgotPasswordMode, setForgotPasswordMode] = useState<'request' | 'success'>('request');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [sentEmail, setSentEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
        message: result.message,
        code: result.code
      });
      
      // Handle email not verified error specifically
      if (result.code === 'EMAIL_NOT_VERIFIED') {
        throw { code: 'EMAIL_NOT_VERIFIED', message: result.message, email: result.email };
      }
      
      // Handle partner account detected
      if (result.code === 'PARTNER_ACCOUNT_DETECTED') {
        throw { code: 'PARTNER_ACCOUNT_DETECTED', message: result.message, email: result.email, redirectTo: result.redirectTo };
      }
      
      if (!response.ok) {
        throw new Error(result.message || `HTTP ${response.status}: Login request failed`);
      }
      return result;
    },
    onSuccess: async (result) => {
      console.log("✅ LOGIN SUCCESS:", result);
      if (result.success) {
        // Immediately update auth cache to prevent race conditions
        queryClient.setQueryData(["/api/auth/user"], result.user);

        // Dispatch auth event so all components using useAuth get notified
        window.dispatchEvent(new CustomEvent('auth:login', { detail: result.user }));

        // Sync localStorage liked properties to server
        try {
          await LocalStorageService.syncLikedPropertiesToServer(result.user.id);
          console.log("✅ Synced localStorage likes to server");
        } catch (error) {
          console.warn("⚠️ Failed to sync localStorage likes:", error);
          // Don't block login if sync fails
        }

        onSuccess(result.user);
        onClose();
        toast({
          title: "Welcome back!",
          description: `Logged in as ${result.user.name}`,
        });
      } else {
        toast({
          title: "Login failed",
          description: result.message || "Unexpected server response",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      // Handle email verification error
      if (error.code === 'EMAIL_NOT_VERIFIED') {
        setSentEmail(error.email || formData.email);
        setShowVerificationModal(true); // Show verification modal
        toast({
          title: "Email verification required",
          description: "Please check your inbox and verify your email address.",
          variant: "destructive",
        });
        return;
      }
      
      // Handle partner account detected
      if (error.code === 'PARTNER_ACCOUNT_DETECTED') {
        const hasActiveSession = error.hasActiveSession;
        
        toast({
          title: "⚠️ Partner Account Detected",
          description: error.message || "This is a partner account. You need to login through the partner portal instead.",
          variant: "default",
          duration: 10000,
          action: (
            <ToastAction 
              altText={hasActiveSession ? "Logout and Switch" : "Go to Partner Login"}
              onClick={async () => {
                if (hasActiveSession) {
                  // Logout from partner portal first
                  try {
                    await fetch('/partner/logout', { 
                      method: 'POST',
                      credentials: 'include' 
                    });
                  } catch (e) {
                    console.error('Logout error:', e);
                  }
                }
                window.location.href = '/partner/login';
              }}
              data-testid="button-go-to-partner-login"
            >
              {hasActiveSession ? "Logout & Switch" : "Go to Partner Login"}
            </ToastAction>
          )
        });
        return;
      }
      
      // Handle email not found - suggest account creation
      if (error.code === 'EMAIL_NOT_FOUND') {
        toast({
          title: "📧 Account Not Found",
          description: error.message || "No account found with this email. Would you like to create one?",
          variant: "default",
          duration: 10000,
          action: (
            <ToastAction 
              altText="Create Account"
              onClick={() => {
                // Switch to signup mode if currently in login mode
                if (mode === 'login') {
                  onToggleMode();
                }
              }}
              data-testid="button-create-account"
            >
              Create Account
            </ToastAction>
          )
        });
        return;
      }
      
      toast({
        title: "Login failed", 
        description: error.message || "Please check your credentials and try again",
        variant: "destructive",
      });
    }
  });

  // Register mutation  
  const registerMutation = useMutation({
    mutationFn: async (data: { email: string; name: string; password: string; persona?: string }) => {
      const response = await apiRequest("POST", "/api/auth/register", data);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || `HTTP ${response.status}: Registration failed`);
      }
      return result;
    },
    onSuccess: (result) => {
      if (result.success && result.requiresVerification) {
        // Show email verification modal
        setSentEmail(result.email || formData.email);
        setShowVerificationModal(true); // Show verification modal
        onClose(); // Close the auth modal
        toast({
          title: "✅ Registration successful!",
          description: "Please check your email to verify your account.",
        });
      } else if (result.success && result.user) {
        // Auto-login flow - if email verification is disabled
        queryClient.setQueryData(["/api/auth/user"], result.user);

        // Dispatch auth event so all components using useAuth get notified
        window.dispatchEvent(new CustomEvent('auth:login', { detail: result.user }));

        // Sync localStorage liked properties to server after registration
        try {
          LocalStorageService.syncLikedPropertiesToServer(result.user.id);
          console.log("✅ Synced localStorage likes to server after registration");
        } catch (error) {
          console.warn("⚠️ Failed to sync localStorage likes:", error);
          // Don't block registration if sync fails
        }
        
        // FB: Track completed registration
        fbTrackCompleteRegistration('Email');
        
        onSuccess(result.user);
        onClose();
        toast({
          title: "Welcome!",
          description: `Account created for ${result.user.name}`,
        });
      } else {
        toast({
          title: "Registration failed",
          description: result.message || "Unexpected server response",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
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
      
      const response = await apiRequest("POST", "/api/auth/forgot-password", { email });
      const result = await response.json();
      
      
      if (!response.ok) {
        throw new Error(result.message || `HTTP ${response.status}: Forgot password request failed`);
      }
      return result;
    },
    onSuccess: (result) => {
      setForgotPasswordMode('success');
      setSentEmail(formData.email);
      setShowEmailModal(true);
      onClose(); // Close the auth modal
    },
    onError: (error: Error) => {
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

    if (formData.password.length < 12) {
      toast({
        title: "Error",
        description: "Password must be at least 12 characters for security",
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
        password: formData.password,
        persona: formData.persona || undefined // Only send if selected
      });
    }
    
    setIsSubmitting(false);
  };

  const resetForm = () => {
    setFormData({ email: "", name: "", password: "", persona: "" });
    setForgotPasswordMode('request');
    setShowPassword(false);
  };

  const handleGeneratePassword = () => {
    const newPassword = generateSecurePassword({ length: 16 });
    setFormData({ ...formData, password: newPassword });
    setShowPassword(true); // Show password so user can see it
    
    // Copy to clipboard
    navigator.clipboard.writeText(newPassword).then(() => {
      toast({
        title: "Password generated!",
        description: "Secure password copied to clipboard. Save it to your password manager.",
      });
    }).catch(() => {
      toast({
        title: "Password generated!",
        description: "Your secure password has been created.",
      });
    });
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
          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
            {mode === 'signup' && (
              <>
                <Input
                  type="text"
                  name="name"
                  placeholder="Full Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full"
                  autoComplete="name"
                  data-testid="input-auth-name"
                />
                
                {/* Persona selector - optional, skip-friendly */}
                <div className="space-y-2">
                  <label className="text-sm text-gray-700 font-medium flex items-center gap-1">
                    What brings you to HouseMatch?
                    <span className="text-gray-400 text-xs font-normal">(Optional)</span>
                  </label>
                  <select
                    value={formData.persona}
                    onChange={(e) => setFormData({ ...formData, persona: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                    data-testid="select-persona"
                  >
                    <option value="">Just browsing (skip)</option>
                    <option value="family">🏡 Finding a family home</option>
                    <option value="investor">💼 Investment property</option>
                    <option value="first_home_buyer">🏠 First home buyer</option>
                    <option value="professional">👔 Professional looking for convenience</option>
                    <option value="retiree">🌅 Retirement property</option>
                  </select>
                  <p className="text-xs text-gray-500">
                    We'll personalize your experience based on your goals
                  </p>
                </div>
              </>
            )}
            
            <Input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full"
              autoComplete={mode === 'signup' ? 'email' : 'username'}
              data-testid="input-auth-email"
            />
            
            {mode !== 'forgot-password' && (
              <div className="space-y-2">
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder={mode === 'signup' ? "Password (min 12 characters)" : "Password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pr-20"
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    data-testid="input-auth-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                    data-testid="button-toggle-password"
                  >
                    <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
                
                {/* Password generator for signup */}
                {mode === 'signup' && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-md transition-colors"
                      data-testid="button-generate-password"
                    >
                      <i className="fas fa-key"></i>
                      <span>Generate Secure Password</span>
                    </button>
                    {formData.password && (
                      <span className={`text-xs px-2 py-1 rounded ${
                        estimatePasswordStrength(formData.password).color === 'green' ? 'bg-green-100 text-green-700' :
                        estimatePasswordStrength(formData.password).color === 'blue' ? 'bg-blue-100 text-blue-700' :
                        estimatePasswordStrength(formData.password).color === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                        estimatePasswordStrength(formData.password).color === 'orange' ? 'bg-orange-100 text-orange-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {estimatePasswordStrength(formData.password).label}
                      </span>
                    )}
                  </div>
                )}
              </div>
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

      {/* Password reset email modal */}
      <EmailVerificationModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        email={sentEmail}
      />

      {/* Email verification required modal */}
      <EmailVerificationRequiredModal
        isOpen={showVerificationModal}
        onClose={() => setShowVerificationModal(false)}
        email={sentEmail}
      />
    </div>
  );
}