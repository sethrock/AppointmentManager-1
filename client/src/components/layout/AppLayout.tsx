import { useState, ReactNode } from "react";
import { useLocation } from "wouter";
import Sidebar from "./Sidebar";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { UserMenu } from "@/components/auth/UserMenu";
import { useAuth } from "@/hooks/useAuth";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [location] = useLocation();
  const { isAuthenticated } = useAuth();
  
  // Check if this is the public homepage
  const isPublicRoute = location === "/";
  
  // If we're on the public homepage, use a simplified layout
  if (isPublicRoute) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <header className="bg-background border-b border-border shadow-sm">
          <div className="max-w-7xl mx-auto py-4 px-6 flex justify-between items-center">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Appointment Manager
            </h1>
            <div className="flex items-center">
              <UserMenu />
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
      </div>
    );
  }

  // Otherwise use the full application layout with sidebar for authenticated users
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Desktop Sidebar */}
      {isAuthenticated && (
        <div className="fixed inset-y-0 left-0 w-72 bg-muted border-r border-border shadow-xl lg:block hidden overflow-auto">
          <Sidebar />
        </div>
      )}

      {/* Mobile header */}
      <div className="lg:hidden bg-muted border-b border-border">
        <div className="flex items-center justify-between h-16 px-4">
          <div className="flex items-center">
            {isAuthenticated && (
              <Sheet open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}>
                <SheetTrigger asChild>
                  <button className="text-foreground hover:text-primary transition-colors">
                    <Menu className="h-6 w-6" />
                  </button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-72 bg-muted border-r border-border">
                  <Sidebar onNavItemClick={() => setIsMobileNavOpen(false)} />
                </SheetContent>
              </Sheet>
            )}
            <h2 className="text-xl font-semibold ml-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Appointment Manager
            </h2>
          </div>
          <div>
            <UserMenu />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={isAuthenticated ? "lg:ml-72 pb-12" : "pb-12"}>
        <header className="bg-background border-b border-border shadow-sm lg:block hidden">
          <div className="max-w-7xl mx-auto py-4 px-6 flex justify-between items-center">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Appointment Manager
            </h1>
            <div className="flex items-center">
              <UserMenu />
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
