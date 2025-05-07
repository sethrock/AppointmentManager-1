import { useState, ReactNode } from "react";
import Sidebar from "./Sidebar";
import { Menu, X, User } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Desktop Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-secondary text-white shadow-lg lg:block hidden">
        <Sidebar />
      </div>

      {/* Mobile header */}
      <div className="lg:hidden bg-secondary text-white shadow-md">
        <div className="flex items-center justify-between h-16 px-4">
          <div className="flex items-center">
            <Sheet open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}>
              <SheetTrigger asChild>
                <button className="text-white">
                  <Menu className="h-6 w-6" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64 bg-secondary text-white">
                <Sidebar onNavItemClick={() => setIsMobileNavOpen(false)} />
              </SheetContent>
            </Sheet>
            <h2 className="text-xl font-semibold ml-4">Appointment Manager</h2>
          </div>
          <div>
            <button className="text-white">
              <User className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:ml-64 pb-12">
        <header className="bg-white shadow-sm lg:block hidden">
          <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
            <h1 className="text-2xl font-semibold text-gray-900">Appointment Manager</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">Welcome, Admin</span>
              <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-600">
                <User className="h-5 w-5" />
              </div>
            </div>
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}
