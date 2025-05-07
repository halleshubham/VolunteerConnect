import { Switch, Route, useLocation } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/dashboard-page";
import ContactsPage from "@/pages/contacts-page";
import ContactDetailPage from "@/pages/contact-detail-page";
import EventsPage from "@/pages/events-page";
import { ProtectedRoute } from "./lib/protected-route";
import { AuthProvider, useAuth } from "./hooks/use-auth";
import { useEffect } from "react";
import EventAttendancePage from "./pages/event-attendance-page";
import SettingsPage from "./pages/settings-page";
import WhatsAppConnection from "./pages/whatsapp-page";
import TasksPage from "./pages/tasks-page";

// Route wrapper component that redirects already authenticated users from auth page
function AuthRouteWrapper() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  
  useEffect(() => {
    // If user is already authenticated and tries to access auth page, redirect to dashboard
    if (user && !isLoading) {
      console.log("User already authenticated, redirecting to dashboard");
      navigate("/");
    }
  }, [user, isLoading, navigate]);
  
  return <AuthPage />;
}

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthRouteWrapper} />
      <Route path="/">
        {() => <ProtectedRoute component={DashboardPage} />}
      </Route>
      <Route path="/contacts">
        {() => <ProtectedRoute component={ContactsPage} />}
      </Route>
      <Route path="/contacts/:id">
        {() => <ProtectedRoute component={() => <ContactDetailPage />} />}
      </Route>
      <Route path="/events">
        {() => <ProtectedRoute component={EventsPage} />}
      </Route>
      <Route path="/events/:id/attendance">
        {() => <ProtectedRoute component={EventAttendancePage} />}
      </Route>
      <Route path="/settings">
        {() => <ProtectedRoute component={SettingsPage} />}
      </Route>
      <Route path="/whatsapp">
        {() => <ProtectedRoute component={WhatsAppConnection} />}
      </Route>
      <Route path="/tasks">
        {() => <ProtectedRoute component={TasksPage} />}
      </Route>
      <Route path="*" component={NotFound} />
    </Switch>
  );
}

function App() {
  const [location] = useLocation();
  
  useEffect(() => {
    console.log("App - Current route:", location);
  }, [location]);
  
  return (
    <AuthProvider>
      <Router />
      <Toaster />
    </AuthProvider>
  );
}

export default App;
