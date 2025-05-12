import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import AppointmentList from "@/pages/appointments/index";
import NewAppointment from "@/pages/appointments/new";
import AppointmentDetail from "@/pages/appointments/[id]";
import ImportPage from "./pages/import";
import Settings from "./pages/settings";
import AuthPage from "./pages/auth-page";
import AppLayout from "@/components/layout/AppLayout";
import { ProtectedRoute } from "./lib/protected-route";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/appointments" component={AppointmentList} />
      <ProtectedRoute path="/appointments/new" component={NewAppointment} />
      <ProtectedRoute path="/appointments/:id" component={AppointmentDetail} />
      <ProtectedRoute path="/import" component={ImportPage} />
      <ProtectedRoute path="/settings" component={Settings} />
      <Route path="/auth" component={AuthPage} />
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