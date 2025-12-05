import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface PublicRouteProps {
  children: React.ReactNode;
}

/**
 * PublicRoute: For auth pages that should redirect away if user is already logged in
 */
export function PublicRoute({ children }: PublicRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    // Check for ?next= param to redirect to intended destination
    const searchParams = new URLSearchParams(location.search);
    const next = searchParams.get('next') || '/modes';
    return <Navigate to={next} replace />;
  }

  return <>{children}</>;
}
