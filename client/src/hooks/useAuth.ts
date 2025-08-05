import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ["/api/auth/me"],
    retry: false,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  const login = async (userData: User) => {
    // Set the user data in the query cache
    queryClient.setQueryData(["/api/auth/me"], userData);
    // Invalidate all queries to refetch with new auth state
    await queryClient.invalidateQueries();
  };

  const logout = async () => {
    // Clear the user data from the query cache
    queryClient.setQueryData(["/api/auth/me"], null);
    // Invalidate all queries
    await queryClient.invalidateQueries();
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isError: !!error,
    login,
    logout,
  };
}