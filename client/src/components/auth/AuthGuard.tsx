import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { ReactNode, useEffect } from "react";

interface AuthGuardProps {
  children: ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Only redirect if we've confirmed they're not authenticated
    // after loading completes
    if (!isLoading && !isAuthenticated) {
      console.log("User not authenticated, redirecting to login...");
      // We need to use window.location.href for API routes since they're not client routes
      window.location.href = "/api/login?returnTo=" + encodeURIComponent(window.location.pathname);
    }
  }, [isAuthenticated, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}