import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Skeleton } from '@/components/ui/Skeleton';

export function RoleRoute({ role, children }: { role: 'intern' | 'mentor' | 'admin'; children: ReactNode }) {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!profile) return <Navigate to="/login" replace />;
  if (profile.role !== role) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}
