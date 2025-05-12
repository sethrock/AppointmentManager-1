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
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
        Welcome to Appointment Manager
      </h1>
      <p className="text-xl mb-8 max-w-2xl">
        An advanced appointment scheduling dashboard designed for precise time 
        management and seamless integration with Google Calendar.
      </p>
      <Button onClick={() => window.location.href = "/dashboard"} size="lg">
        Go to Dashboard
      </Button>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/appointments" component={AppointmentList} />
      <Route path="/appointments/new" component={NewAppointment} />
      <Route path="/appointments/:id" component={AppointmentDetail} />
      <Route path="/import" component={ImportPage} />
      <Route path="/settings" component={Settings} />
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