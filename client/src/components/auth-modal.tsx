import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: { id: string; name: string; email: string }) => void;
  mode: 'login' | 'signup';
  onToggleMode: () => void;
}

export function AuthModal({ isOpen, onClose, onSuccess, mode, onToggleMode }: AuthModalProps) {
  const [formData, setFormData] = useState({
    email: "",
    name: "", 
    password: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
            <i className="fas fa-user text-white text-xl"></i>
          </div>
          <h2 className="text-xl font-bold text-gray-900">
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {mode === 'login' 
              ? 'Sign in to save your property likes' 
              : 'Join PropertySwipe NZ today'
            }
          </p>
        </div>

        {/* Form */}
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
          
          <Input
            type="password"
            placeholder="Password (min 6 characters)"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="w-full"
            data-testid="input-auth-password"
          />

          <Button 
            type="submit"
            disabled={isSubmitting || loginMutation.isPending || registerMutation.isPending}
            className="w-full h-12 text-base"
            data-testid="button-auth-submit"
          >
            {isSubmitting || loginMutation.isPending || registerMutation.isPending ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>{mode === 'login' ? 'Signing in...' : 'Creating account...'}</span>
              </div>
            ) : (
              mode === 'login' ? 'Sign In' : 'Create Account'
            )}
          </Button>
        </form>

        {/* Toggle mode */}
        <div className="text-center mt-6 pt-4 border-t border-gray-100">
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
        </div>
      </div>
    </div>
  );
}