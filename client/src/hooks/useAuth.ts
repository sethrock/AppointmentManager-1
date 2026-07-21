import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

export type AuthUser = {
  id: number;
  username: string;
  email: string;
  totpEnabled?: boolean;
  mfaVerified?: boolean;
  needsMfaSetup?: boolean;
  createdAt?: string | Date | null;
};

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.status === 401) return null;
      if (!res.ok) {
        throw new Error(`Failed to load session (${res.status})`);
      }
      return res.json();
    },
    retry: false,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  const login = async (userData: AuthUser) => {
    queryClient.setQueryData(["/api/auth/me"], userData);
    await queryClient.invalidateQueries();
  };

  const logout = async () => {
    queryClient.setQueryData(["/api/auth/me"], null);
    await queryClient.invalidateQueries();
  };

  const needsMfaSetup = Boolean(user && (user.needsMfaSetup || !user.totpEnabled));
  const mfaVerified = Boolean(user?.mfaVerified);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    needsMfaSetup,
    mfaVerified,
    isError: !!error,
    login,
    logout,
  };
}
