import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { PendingApproval } from './PendingApproval';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, userRole, isLoading, roleLoading } = useAuth();

  if (isLoading || (user && roleLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Only shown once the role fetch has actually resolved and returned no role
  if (!userRole) {
    return <PendingApproval />;
  }

  return <>{children}</>;
}
