import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { Redirect, useLocation } from "wouter";

export function ProtectedRoute({
  component: Component,
}: {
  component: () => React.JSX.Element;
}) {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();
  
  useEffect(() => {
    console.log("ProtectedRoute - Current path:", location);
    console.log("ProtectedRoute - Auth state:", { user: user?.username, isLoading });
    
    // Debug session info on each render
    if (!user && !isLoading) {
      console.log("ProtectedRoute - No authenticated user, should redirect");
    }
  }, [user, isLoading, location]);

  // If still loading, show spinner
  if (isLoading) {
    console.log("ProtectedRoute - Auth data is loading");
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }
  
  // If not authenticated, redirect to login
  if (!user) {
    console.log("ProtectedRoute - Redirecting to auth page");
    return <Redirect to="/auth" />;
  }
  
  // User is authenticated
  console.log("ProtectedRoute - User authenticated, rendering component");
  return <Component />;
}
