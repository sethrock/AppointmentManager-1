import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function EmailLoginForm() {
  const [email, setEmail] = useState("serasomatic@gmail.com");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Extract the username from email for our backend
      const username = email.split('@')[0];
      
      console.log("Submitting login with:", { username, email, password });
      
      // Use fetch directly for this case instead of apiRequest
      const response = await fetch("/api/login/local", {
        method: "POST",
        body: JSON.stringify({ 
          username, // Include username extracted from email 
          email,
          password 
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        // Redirect to dashboard on successful login
        toast({
          title: "Login Successful",
          description: "You're now logged in!",
        });
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 500);
      } else {
        const data = await response.json();
        toast({
          title: "Login Failed",
          description: data.message || "Invalid credentials",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Error",
        description: "An error occurred while logging in. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Sign In with Email</CardTitle>
        <CardDescription>Enter your email to access your account</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              required
            />
            <p className="text-xs text-muted-foreground">
              (For demo purposes, any password will work with serasomatic@gmail.com)
            </p>
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign In with Email"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center border-t pt-4">
        <div className="text-sm text-muted-foreground">
          Or sign in with{" "}
          <Button
            variant="link"
            className="p-0 h-auto font-normal"
            onClick={() => window.location.href = "/api/login"}
          >
            Replit Account
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}