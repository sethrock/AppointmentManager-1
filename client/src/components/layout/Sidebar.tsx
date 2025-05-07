import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  Calendar, 
  BarChart, 
  Users, 
  UserCircle, 
  Settings, 
  FileText 
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
    { name: "Clients", path: "/clients", icon: Users },
    { name: "Providers", path: "/providers", icon: UserCircle },
    { name: "Reports", path: "/reports", icon: FileText },
    { name: "Settings", path: "/settings", icon: Settings },
  ];

  return (
    <>
      <div className="flex items-center justify-center h-16 border-b border-secondary-light">
        <h2 className="text-xl font-semibold">Appointment Manager</h2>
      </div>
      
      <nav className="mt-6">
        <div className="px-4 py-3">
          <h5 className="text-xs uppercase tracking-wider text-gray-400">Main</h5>
          <div className="mt-2 -mx-3">
            {navItems.slice(0, 4).map((item) => (
              <Link 
                key={item.path} 
                href={item.path}
                onClick={onNavItemClick}
              >
                <a className={cn(
                  "flex items-center px-3 py-2 rounded-md mt-1",
                  isActive(item.path) 
                    ? "text-white bg-primary" 
                    : "text-gray-300 hover:text-white hover:bg-primary-dark"
                )}>
                  <item.icon className="mr-3 h-5 w-5" />
                  <span>{item.name}</span>
                </a>
              </Link>
            ))}
          </div>
        </div>
        
        <div className="px-4 py-3 mt-6">
          <h5 className="text-xs uppercase tracking-wider text-gray-400">Admin</h5>
          <div className="mt-2 -mx-3">
            {navItems.slice(4).map((item) => (
              <Link 
                key={item.path} 
                href={item.path}
                onClick={onNavItemClick}
              >
                <a className={cn(
                  "flex items-center px-3 py-2 rounded-md mt-1",
                  isActive(item.path) 
                    ? "text-white bg-primary" 
                    : "text-gray-300 hover:text-white hover:bg-primary-dark"
                )}>
                  <item.icon className="mr-3 h-5 w-5" />
                  <span>{item.name}</span>
                </a>
              </Link>
            ))}
          </div>
        </div>
      </nav>
    </>
  );
}
