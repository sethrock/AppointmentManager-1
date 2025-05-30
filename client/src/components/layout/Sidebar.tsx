import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  Calendar, 
  BarChart, 
  Users, 
  UserCircle, 
  Settings, 
  FileText,
  FileUp,
  BoxesIcon,
  LogOut,
  LogIn,
  TrendingUp
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  onNavItemClick?: () => void;
}

export default function Sidebar({ onNavItemClick }: SidebarProps) {
  const [location, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };
  
  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: () => {
      return apiRequest("POST", "/api/auth/logout", {});
    },
    onSuccess: () => {
      toast({
        title: "Logged out successfully",
        description: "You have been logged out"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      setLocation("/auth");
    }
  });

  const navItems = [
    { name: "Dashboard", path: "/", icon: BarChart },
    { name: "Appointments", path: "/appointments", icon: Calendar },
    { name: "Clients", path: "/clients", icon: Users },
    { name: "Providers", path: "/providers", icon: UserCircle },
    { name: "Analytics", path: "/analytics", icon: TrendingUp },
    { name: "Reports", path: "/reports", icon: FileText },
    { name: "Resources", path: "/resources", icon: BoxesIcon },
    { name: "Settings", path: "/settings", icon: Settings },
  ];

  return (
    <>
      <div className="flex items-center justify-center h-20 border-b border-border">
        <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Appointment Manager
        </h2>
      </div>

      <nav className="mt-6 space-y-8">
        <div className="px-4">
          <h5 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3 ml-2">Main</h5>
          <div className="space-y-1">
            {navItems.slice(0, 4).map((item) => {
              const Icon = item.icon;
              return (
                <Link 
                  key={item.path}
                  href={item.path}
                  onClick={onNavItemClick}
                  className={cn(
                    "flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 group",
                    isActive(item.path) 
                      ? "bg-primary/10 text-primary font-medium" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <span className={cn(
                    "flex items-center justify-center w-9 h-9 rounded-lg mr-3",
                    isActive(item.path)
                      ? "bg-primary/20 text-primary" 
                      : "bg-background text-muted-foreground group-hover:text-foreground"
                  )}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span>{item.name}</span>
                  {isActive(item.path) && (
                    <div className="ml-auto w-1.5 h-6 rounded-full bg-gradient-to-b from-primary to-accent"></div>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="px-4">
          <h5 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3 ml-2">Admin</h5>
          <div className="space-y-1">
            {navItems.slice(4).map((item) => {
              const Icon = item.icon;
              return (
                <Link 
                  key={item.path}
                  href={item.path}
                  onClick={onNavItemClick}
                  className={cn(
                    "flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 group",
                    isActive(item.path) 
                      ? "bg-primary/10 text-primary font-medium" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <span className={cn(
                    "flex items-center justify-center w-9 h-9 rounded-lg mr-3",
                    isActive(item.path)
                      ? "bg-primary/20 text-primary" 
                      : "bg-background text-muted-foreground group-hover:text-foreground"
                  )}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span>{item.name}</span>
                  {isActive(item.path) && (
                    <div className="ml-auto w-1.5 h-6 rounded-full bg-gradient-to-b from-primary to-accent"></div>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
        
        {/* Authentication section */}
        <div className="px-4 mt-8">
          <h5 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3 ml-2">Account</h5>
          <div className="space-y-1">
            {isAuthenticated ? (
              <div className="p-3">
                <div className="mb-3 text-sm">
                  <p className="font-medium">{user?.username}</p>
                  <p className="text-muted-foreground text-xs">{user?.email}</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start" 
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {logoutMutation.isPending ? "Logging out..." : "Log out"}
                </Button>
              </div>
            ) : (
              <div className="p-3">
                <Button 
                  variant="default" 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={() => setLocation("/auth")}
                >
                  <LogIn className="mr-2 h-4 w-4" />
                  Log in
                </Button>
              </div>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}