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
import Resources from "./pages/resources";
import Settings from "./pages/settings";
import Analytics from "./pages/analytics";
import AuthPage from "./pages/auth";
import ConfirmDepositReturn from "./pages/confirm-deposit-return";
import AppLayout from "@/components/layout/AppLayout";

import ProtectedRoute from "@/components/auth/ProtectedRoute";

// Wrapper components for protected routes
const ProtectedDashboard = () => (
  <ProtectedRoute>
    <Dashboard />
  </ProtectedRoute>
);

const ProtectedAppointmentList = () => (
  <ProtectedRoute>
    <AppointmentList />
  </ProtectedRoute>
);

const ProtectedNewAppointment = () => (
  <ProtectedRoute>
    <NewAppointment />
  </ProtectedRoute>
);

const ProtectedAppointmentDetail = () => (
  <ProtectedRoute>
    <AppointmentDetail />
  </ProtectedRoute>
);

const ProtectedImport = () => (
  <ProtectedRoute>
    <ImportPage />
  </ProtectedRoute>
);

const ProtectedResources = () => (
  <ProtectedRoute>
    <Resources />
  </ProtectedRoute>
);

const ProtectedSettings = () => (
  <ProtectedRoute>
    <Settings />
  </ProtectedRoute>
);

const ProtectedAnalytics = () => (
  <ProtectedRoute>
    <Analytics />
  </ProtectedRoute>
);

function Router() {
  return (
    <Switch>
      <Route path="/" component={ProtectedDashboard} />
      <Route path="/appointments" component={ProtectedAppointmentList} />
      <Route path="/appointments/new" component={ProtectedNewAppointment} />
      <Route path="/appointments/:id" component={ProtectedAppointmentDetail} />
      <Route path="/analytics" component={ProtectedAnalytics} />
      <Route path="/import" component={ProtectedImport} />
      <Route path="/resources" component={ProtectedResources} />
      <Route path="/settings" component={ProtectedSettings} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/confirm-deposit-return/:id" component={ConfirmDepositReturn} />
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