import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";

/**
 * Hook for handling authentication state and actions
 */
export function useAuth() {
  // Get the current user from API
  const { 
    data: user, 
    isLoading,
    error,
    refetch 
  } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    retry: false,
    // Handle unauthorized errors by returning null instead of throwing
    queryFn: async ({ queryKey }) => {
      try {
        const res = await fetch(queryKey[0] as string, {
          credentials: "include",
        });
        
        if (res.status === 401) {
          return null;
        }
        
        if (!res.ok) {
          throw new Error(`Error fetching user: ${res.statusText}`);
        }
        
        return await res.json();
      } catch (error) {
        console.error("Auth error:", error);
        return null;
      }
    }
  });

  // Check if user is authenticated
  const isAuthenticated = !!user;

  // Login function (redirects to Replit auth)
  const login = () => {
    window.location.href = "/api/login";
  };

  // Logout function (redirects to Replit logout endpoint)
  const logout = () => {
    window.location.href = "/api/logout";
  };

  return {
    user,
    isLoading,
    isAuthenticated,
    error,
    login,
    logout,
    refetch
  };
}