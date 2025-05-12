import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { Button } from "@/components/ui/button";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import AppointmentList from "@/pages/appointments/index";
import NewAppointment from "@/pages/appointments/new";
import AppointmentDetail from "@/pages/appointments/[id]";
import ImportPage from "./pages/import";
import Settings from "./pages/settings";
import AppLayout from "@/components/layout/AppLayout";
import AuthGuard from "@/components/auth/AuthGuard";
import { useAuth } from "./hooks/useAuth";

function ProtectedRoutes() {
  return (
    <AuthGuard>
      <Switch>
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/appointments" component={AppointmentList} />
        <Route path="/appointments/new" component={NewAppointment} />
        <Route path="/appointments/:id" component={AppointmentDetail} />
        <Route path="/import" component={ImportPage} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </AuthGuard>
  );
}

function HomePage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
        Welcome to Appointment Manager
      </h1>
      <p className="text-xl mb-8 max-w-2xl">
        An advanced appointment scheduling dashboard designed for precise time 
        management and seamless integration with Google Calendar.
      </p>
      
      <div className="flex flex-col items-center gap-4">
        <Button onClick={() => window.location.href = "/dashboard"} size="lg">
          Go to Dashboard
        </Button>
        
        {isLoading ? (
          <p className="text-sm text-muted-foreground mt-4">Checking authentication...</p>
        ) : isAuthenticated ? (
          <div className="mt-4 p-4 bg-primary/10 rounded-lg">
            <p className="font-medium">
              Logged in as: <span className="text-primary">{user?.firstName || user?.email || 'User'}</span>
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={() => window.location.href = "/api/logout"}
            >
              Log Out
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 mt-4">
            <Button 
              variant="outline"
              onClick={() => window.location.href = "/login"}
            >
              Sign In with Email
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => window.location.href = "/api/login"}
            >
              Sign In with Replit
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

import LoginPage from "./pages/login";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/dashboard" component={() => (
        <AuthGuard>
          <Dashboard />
        </AuthGuard>
      )} />
      {/* Specific appointment routes must come before the general appointments route */}
      <Route path="/appointments/new" component={() => (
        <AuthGuard>
          <NewAppointment />
        </AuthGuard>
      )} />
      <Route path="/appointments/:id" component={(params) => (
        <AuthGuard>
          <AppointmentDetail />
        </AuthGuard>
      )} />
      <Route path="/appointments" component={() => (
        <AuthGuard>
          <AppointmentList />
        </AuthGuard>
      )} />
      <Route path="/import" component={() => (
        <AuthGuard>
          <ImportPage />
        </AuthGuard>
      )} />
      <Route path="/settings" component={() => (
        <AuthGuard>
          <Settings />
        </AuthGuard>
      )} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        <TooltipProvider>
          <Toaster />
          <AppLayout>
            <Router />
          </AppLayout>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;