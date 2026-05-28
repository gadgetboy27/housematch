import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, AlertCircle, Lock } from "lucide-react";

interface User {
  id: string;
  email: string;
  name: string;
  isAdmin?: boolean;
}

interface PartnerUser {
  id: string;
  email: string;
  partnerData?: any;
}

/**
 * RequireAuth - Protects routes that require user authentication
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [showAuth, setShowAuth] = useState(false);

  const { data: user, isLoading, error } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/auth/user");
        return response.json();
      } catch (error) {
        return null;
      }
    },
    retry: false,
  });

  useEffect(() => {
    if (!isLoading && !user) {
      setShowAuth(true);
    }
  }, [isLoading, user]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!user || showAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-2 text-purple-600 mb-2">
              <Lock className="w-6 h-6" />
            </div>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>
              You must be logged in to access this page
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={() => {
                // Pass return path so user is redirected back after login
                const returnPath = encodeURIComponent(location);
                setLocation(`/?showLogin=true&returnTo=${returnPath}`);
              }}
              className="w-full"
              data-testid="button-login"
            >
              Login to Continue
            </Button>
            <Button
              onClick={() => setLocation("/")}
              variant="outline"
              className="w-full"
              data-testid="button-go-home"
            >
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * RequireAdmin - Protects routes that require admin access
 */
export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();

  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/auth/user");
        return response.json();
      } catch (error) {
        return null;
      }
    },
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!user || !user.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <Card className="max-w-md w-full border-red-200 dark:border-red-900">
          <CardHeader>
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-2">
              <Shield className="w-6 h-6" />
            </div>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              {!user 
                ? "You must be logged in as an administrator to access this page"
                : "You do not have administrator privileges to access this page"
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-red-800 dark:text-red-200">
                  <strong>Admin Access Required</strong>
                  <p className="mt-1">This area is restricted to authorized administrators only.</p>
                </div>
              </div>
            </div>
            <Button
              onClick={() => setLocation("/")}
              className="w-full"
              variant="default"
              data-testid="button-go-home"
            >
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * RequirePartnerAuth - Protects routes that require partner authentication
 */
export function RequirePartnerAuth({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();

  const { data: partnerUser, isLoading } = useQuery<PartnerUser | null>({
    queryKey: ["/partner/auth/status"],
    queryFn: async () => {
      try {
        const response = await fetch("/partner/auth/status", {
          credentials: "include",
        });
        if (!response.ok) return null;
        return response.json();
      } catch (error) {
        return null;
      }
    },
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!partnerUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-2 text-purple-600 mb-2">
              <Lock className="w-6 h-6" />
            </div>
            <CardTitle>Partner Login Required</CardTitle>
            <CardDescription>
              You must be logged in as a service partner to access this page
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={() => setLocation("/partner/login")}
              className="w-full"
              data-testid="button-partner-login"
            >
              Go to Partner Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
