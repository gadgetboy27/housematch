import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Building2, Lock, Mail } from "lucide-react";
import { useLocation } from "wouter";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function PartnerLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      const response = await fetch("/partner/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      const result = await response.json();

      // Handle regular user account detected
      if (result.code === 'REGULAR_USER_ACCOUNT_DETECTED') {
        const hasActiveSession = result.hasActiveSession;
        
        toast({
          title: "⚠️ Regular User Account Detected",
          description: result.message || "This is a regular user account. Please use the main login page instead.",
          variant: "default",
          duration: 10000,
          action: (
            <ToastAction 
              altText={hasActiveSession ? "Logout and Switch" : "Go to Main Login"}
              onClick={async () => {
                if (hasActiveSession) {
                  // Logout from main portal first
                  try {
                    await fetch('/api/auth/logout', { 
                      method: 'POST',
                      credentials: 'include' 
                    });
                  } catch (e) {
                    console.error('Logout error:', e);
                  }
                }
                window.location.href = '/';
              }}
              data-testid="button-go-to-main-login"
            >
              {hasActiveSession ? "Logout & Switch" : "Go to Main Login"}
            </ToastAction>
          )
        });
        setIsLoading(false);
        return;
      }

      // Handle email not found - suggest joining partner network
      if (result.code === 'EMAIL_NOT_FOUND') {
        toast({
          title: "📧 Partner Account Not Found",
          description: result.message || "No partner account found with this email. Would you like to join our network?",
          variant: "default",
          duration: 10000,
          action: (
            <ToastAction 
              altText="Join Partner Network"
              onClick={() => {
                window.location.href = '/partner/signup';
              }}
              data-testid="button-join-partner-network"
            >
              Join Partner Network
            </ToastAction>
          )
        });
        setIsLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error(result.message || "Login failed");
      }

      toast({
        title: "Login successful",
        description: `Welcome back, ${result.user.name}!`,
      });

      // Redirect to partner dashboard
      setLocation("/partner/dashboard");
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
            <Building2 className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="text-2xl font-bold">Partner Portal</CardTitle>
          <CardDescription>
            Sign in to manage your service orders and business
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          {...field}
                          type="email"
                          placeholder="partner@example.com"
                          className="pl-10"
                          data-testid="input-partner-email"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          {...field}
                          type="password"
                          placeholder="••••••••"
                          className="pl-10"
                          data-testid="input-partner-password"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
                data-testid="button-partner-login"
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
            <p>Partner portal access only.</p>
            <p className="mt-2">
              Not a partner yet?{" "}
              <a href="mailto:partners@housematch.nz" className="text-blue-600 hover:underline">
                Contact us
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
