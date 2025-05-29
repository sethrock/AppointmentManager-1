import { useState } from "react";
import Sidebar from "./Sidebar";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div 
            className="fixed inset-0 bg-black/50" 
            onClick={() => setSidebarOpen(false)} 
          />
          <div className="fixed left-0 top-0 h-full w-72 bg-background shadow-xl">
            <Sidebar onNavItemClick={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}
      
      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-40 lg:flex lg:w-72 lg:flex-col">
        <Sidebar />
      </div>

      {/* Main content area */}
      <div className="lg:ml-72 flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden bg-background border-b px-4 py-2 flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(true)}
            className="mr-4"
          >
            <Menu className="h-6 w-6" />
          </Button>
          <h1 className="text-lg font-semibold">Appointment Manager</h1>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}