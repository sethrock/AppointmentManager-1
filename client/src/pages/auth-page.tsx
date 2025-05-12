import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Redirect } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

/**
 * Authentication page for login/registration
 */
export default function AuthPage() {
  const { isAuthenticated, isLoading, login, refetch } = useAuth();
  const [isDevLoginLoading, setIsDevLoginLoading] = useState(false);
  
  // If already logged in, redirect to dashboard
  if (isAuthenticated) {
    return <Redirect to="/" />;
  }
  
  // For development testing only - create and login as a test user
  const handleDevLogin = async () => {
    setIsDevLoginLoading(true);
    try {
      const response = await fetch('/api/auth/dev-login', { 
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to log in with dev account');
      }
      
      await refetch();
      toast({
        title: "Development Login",
        description: "Successfully logged in with development account.",
      });
    } catch (error) {
      console.error('Dev login error:', error);
      toast({
        title: "Login failed",
        description: "Could not log in with dev account. See console for details.",
        variant: "destructive",
      });
    } finally {
      setIsDevLoginLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-white to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Left column - Auth form */}
      <div className="flex flex-col w-full lg:w-1/2 items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Appointment Manager
            </h1>
            <p className="text-muted-foreground mt-2">
              Sign in to manage your appointments
            </p>
          </div>

          <Card className="w-full border border-border/40 shadow-lg">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold text-center">Welcome</CardTitle>
              <CardDescription className="text-center">
                Sign in with your Replit account to continue
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <Button 
                className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white w-full"
                onClick={login}
                disabled={isLoading || isDevLoginLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign in with Replit"
                )}
              </Button>
              
              {/* Development login option - only visible in development */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mt-2">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-card px-2 text-muted-foreground">
                        Development Only
                      </span>
                    </div>
                  </div>
                  <Button 
                    variant="outline"
                    className="w-full mt-2"
                    onClick={handleDevLogin}
                    disabled={isLoading || isDevLoginLoading}
                  >
                    {isDevLoginLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating dev account...
                      </>
                    ) : (
                      "Use Development Account"
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col">
              <p className="text-xs text-center text-muted-foreground mt-2">
                By signing in, you agree to our Terms of Service and Privacy Policy.
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Right column - Hero section */}
      <div className="hidden lg:flex flex-col w-1/2 bg-gradient-to-br from-primary/80 to-accent/80 text-white p-12 items-center justify-center">
        <div className="max-w-lg">
          <h2 className="text-4xl font-bold mb-6">Streamline Your Appointment Management</h2>
          <ul className="space-y-4 text-lg">
            <li className="flex items-start">
              <svg className="h-6 w-6 mr-2 flex-shrink-0 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <span>Effortlessly schedule and manage appointments</span>
            </li>
            <li className="flex items-start">
              <svg className="h-6 w-6 mr-2 flex-shrink-0 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <span>Track revenue and client information</span>
            </li>
            <li className="flex items-start">
              <svg className="h-6 w-6 mr-2 flex-shrink-0 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <span>Visualize performance with intuitive dashboard</span>
            </li>
            <li className="flex items-start">
              <svg className="h-6 w-6 mr-2 flex-shrink-0 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <span>Manage client database with ease</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}