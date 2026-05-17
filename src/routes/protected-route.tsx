import { Navigate, Outlet, useLocation } from "react-router-dom";
import { canAccessAdmin, canAccessApp, onboardingTarget } from "@/lib/route-guards";
import { useAuthStore } from "@/lib/auth-store";

interface ProtectedRouteProps {
  adminOnly?: boolean;
}

export function ProtectedRoute({ adminOnly = false }: ProtectedRouteProps) {
  const location = useLocation();
  const { profile, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    );
  }

  if (!profile) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  }

  if (!canAccessApp(profile)) {
    return <Navigate to={onboardingTarget(profile)} replace />;
  }

  if (adminOnly && !canAccessAdmin(profile)) {
    return <Navigate to="/app" replace />;
  }

  return <Outlet />;
}
