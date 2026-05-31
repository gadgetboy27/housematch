import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  isAdmin?: boolean;
  subscriptionTier?: string;
  subscriptionStatus?: string;
  profilePicture?: string;
}

/**
 * Centralized auth hook - all components should use this
 * Ensures consistent user state across the entire app
 */
export function useAuth() {
  const queryClient = useQueryClient();

  const { data: user, isLoading, refetch } = useQuery<AuthUser | null>({
    queryKey: ['/api/auth/user'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/auth/user', {
          credentials: 'include'
        });

        if (!response.ok) {
          return null;
        }

        return response.json();
      } catch (error) {
        console.error('[useAuth] Failed to fetch user:', error);
        return null;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    retry: 1,
  });

  // Listen for auth-related events and refetch
  useEffect(() => {
    const handleAuthChange = () => {
      console.log('[useAuth] Auth state changed, refetching user');
      refetch();
    };

    // Listen for custom auth events
    window.addEventListener('auth:login', handleAuthChange);
    window.addEventListener('auth:logout', handleAuthChange);

    return () => {
      window.removeEventListener('auth:login', handleAuthChange);
      window.removeEventListener('auth:logout', handleAuthChange);
    };
  }, [refetch]);

  const setUser = (userData: AuthUser | null) => {
    queryClient.setQueryData(['/api/auth/user'], userData);
    // Dispatch event so other tabs/windows know about the change
    window.dispatchEvent(new CustomEvent('auth:updated', { detail: userData }));
  };

  return {
    user: user || null,
    isAuthenticated: !!user,
    isLoading,
    refetch,
    setUser,
  };
}
