import { useState, ReactNode } from "react";
import Sidebar from "./Sidebar";
import { Menu, LogOut, User } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const { user, logout } = useAuth();

  // Get user initials for avatar fallback
  const getUserInitials = () => {
    if (!user) return "?";
    
    const firstInitial = user.firstName?.charAt(0) || "";
    const lastInitial = user.lastName?.charAt(0) || "";
    
    if (firstInitial || lastInitial) {
      return `${firstInitial}${lastInitial}`.toUpperCase();
    } else if (user.email) {
      return user.email.charAt(0).toUpperCase();
    } else {
      return "U";
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Desktop Sidebar */}
      <div className="fixed inset-y-0 left-0 w-72 bg-muted border-r border-border shadow-xl lg:block hidden overflow-auto">
        <Sidebar />
      </div>

      {/* Mobile header */}
      <div className="lg:hidden bg-muted border-b border-border">
        <div className="flex items-center justify-between h-16 px-4">
          <div className="flex items-center">
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
            <h2 className="text-xl font-semibold ml-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Appointment Manager
            </h2>
          </div>
          <div>
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center justify-center rounded-full bg-background p-1 hover:bg-primary/10 transition-colors">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.profileImageUrl || undefined} alt={user.firstName || "User"} />
                      <AvatarFallback className="bg-primary/10 text-primary font-medium">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <button className="text-foreground hover:text-primary transition-colors rounded-full bg-background p-2">
                <User className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:ml-72 pb-12">
        <header className="bg-background border-b border-border shadow-sm lg:block hidden">
          <div className="max-w-7xl mx-auto py-4 px-6 flex justify-between items-center">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Appointment Manager
            </h1>
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <span className="text-sm text-muted-foreground">
                    Welcome, {user.firstName || user.email?.split('@')[0] || 'User'}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center justify-center h-9 w-9 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.profileImageUrl || undefined} alt={user.firstName || "User"} />
                          <AvatarFallback className="bg-primary/10 text-primary font-medium">
                            {getUserInitials()}
                          </AvatarFallback>
                        </Avatar>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>
                        {user.email ? (
                          <div className="flex flex-col">
                            <span>{user.firstName} {user.lastName}</span>
                            <span className="text-xs text-muted-foreground">{user.email}</span>
                          </div>
                        ) : (
                          <span>My Account</span>
                        )}
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive cursor-pointer">
                        <LogOut className="mr-2 h-4 w-4" />
                        Log out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <>
                  <span className="text-sm text-muted-foreground">Welcome, Guest</span>
                  <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-foreground hover:bg-primary/20 transition-colors">
                    <User className="h-5 w-5" />
                  </div>
                </>
              )}
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
