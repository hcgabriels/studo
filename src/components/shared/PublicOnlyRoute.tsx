import { type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const PublicRouteLoading = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
  </div>
);

const PublicOnlyRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) return <PublicRouteLoading />;
  if (user) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
};

export default PublicOnlyRoute;
