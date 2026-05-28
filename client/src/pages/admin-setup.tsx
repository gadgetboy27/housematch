import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Shield, Lock, Mail, User, CheckCircle2 } from "lucide-react";

const adminSetupSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email is required"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type AdminSetupFormData = z.infer<typeof adminSetupSchema>;

export default function AdminSetup() {
  const [, setLocation] = useLocation();
  const [setupComplete, setSetupComplete] = useState(false);
  const { toast } = useToast();

  // Check if admin already exists
  const { data: adminExists, isLoading: checkingAdmin } = useQuery<{ exists: boolean }>({
    queryKey: ["/api/admin/exists"],
  });

  const form = useForm<AdminSetupFormData>({
    resolver: zodResolver(adminSetupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Redirect if admin already exists
  useEffect(() => {
    if (adminExists?.exists) {
      toast({
        title: "Admin Already Exists",
        description: "Please login with your existing admin account.",
      });
      setLocation("/");
    }
  }, [adminExists, setLocation, toast]);

  const setupMutation = useMutation({
    mutationFn: async (data: AdminSetupFormData) => {
      const response = await apiRequest("POST", "/api/admin/setup", {
        name: data.name,
        email: data.email,
        password: data.password,
      });
      return response.json();
    },
    onSuccess: () => {
      setSetupComplete(true);
      toast({
        title: "Admin Account Created",
        description: "You can now login with your admin credentials.",
      });
      
      // Redirect to home after 3 seconds
      setTimeout(() => {
        setLocation("/");
      }, 3000);
    },
    onError: (error: any) => {
      toast({
        title: "Setup Failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AdminSetupFormData) => {
    setupMutation.mutate(data);
  };

  if (checkingAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking admin status...</p>
        </div>
      </div>
    );
  }

  if (setupComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Admin Account Created!</h2>
          <p className="text-gray-600 mb-4">
            Your admin account has been successfully created. Redirecting to login...
          </p>
          <div className="animate-pulse text-purple-600">●●●</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Setup</h1>
          <p className="text-gray-600">
            Create the first admin account for HouseMatch
          </p>
        </div>

        {/* Setup Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="inline w-4 h-4 mr-1" />
                Full Name
              </label>
              <input
                {...form.register("name")}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                  form.formState.errors.name ? "border-red-500 bg-red-50" : "border-gray-300"
                }`}
                placeholder="Admin Name"
                data-testid="input-admin-name"
              />
              {form.formState.errors.name && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Mail className="inline w-4 h-4 mr-1" />
                Email Address
              </label>
              <input
                {...form.register("email")}
                type="email"
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                  form.formState.errors.email ? "border-red-500 bg-red-50" : "border-gray-300"
                }`}
                placeholder="admin@example.com"
                data-testid="input-admin-email"
              />
              {form.formState.errors.email && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Lock className="inline w-4 h-4 mr-1" />
                Password
              </label>
              <input
                {...form.register("password")}
                type="password"
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                  form.formState.errors.password ? "border-red-500 bg-red-50" : "border-gray-300"
                }`}
                placeholder="••••••••"
                data-testid="input-admin-password"
              />
              {form.formState.errors.password && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.password.message}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Must be 8+ characters with uppercase, lowercase, and numbers
              </p>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Lock className="inline w-4 h-4 mr-1" />
                Confirm Password
              </label>
              <input
                {...form.register("confirmPassword")}
                type="password"
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                  form.formState.errors.confirmPassword ? "border-red-500 bg-red-50" : "border-gray-300"
                }`}
                placeholder="••••••••"
                data-testid="input-admin-confirm-password"
              />
              {form.formState.errors.confirmPassword && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-3 rounded-lg font-semibold transition-all"
              disabled={setupMutation.isPending}
              data-testid="button-create-admin"
            >
              {setupMutation.isPending ? (
                <span className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Creating Admin Account...
                </span>
              ) : (
                "Create Admin Account"
              )}
            </Button>
          </form>

          {/* Info Box */}
          <div className="mt-6 bg-purple-50 border border-purple-200 rounded-lg p-4">
            <p className="text-sm text-purple-800">
              <strong>Note:</strong> This is a one-time setup. After creating your admin account, you can invite additional admins from the admin dashboard.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
