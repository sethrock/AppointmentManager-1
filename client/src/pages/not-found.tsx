import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border bg-card/50 backdrop-blur-sm shadow-lg">
        <CardContent className="pt-8 pb-8">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
              <AlertCircle className="h-10 w-10 text-destructive" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">404 Page Not Found</h1>
            <div className="w-12 h-1 bg-gradient-to-r from-primary to-accent rounded-full mb-4"></div>
            <p className="text-muted-foreground">
              The page you're looking for doesn't exist or has been moved.
            </p>
          </div>
          
          <div className="flex justify-center mt-6">
            <Link href="/">
              <Button className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white">
                Return to Dashboard
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
