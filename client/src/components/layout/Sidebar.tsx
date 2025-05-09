import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  Calendar, 
  BarChart, 
  Users, 
  UserCircle, 
  Settings, 
  FileText,
  FileUp
} from "lucide-react";

interface SidebarProps {
  onNavItemClick?: () => void;
}

export default function Sidebar({ onNavItemClick }: SidebarProps) {
  const [location] = useLocation();

  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };

  const navItems = [
    { name: "Dashboard", path: "/", icon: BarChart },
    { name: "Appointments", path: "/appointments", icon: Calendar },
    { name: "Import Data", path: "/import", icon: FileUp },
    { name: "Clients", path: "/clients", icon: Users },
    { name: "Providers", path: "/providers", icon: UserCircle },
    { name: "Reports", path: "/reports", icon: FileText },
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
      </nav>
    </>
  );
}