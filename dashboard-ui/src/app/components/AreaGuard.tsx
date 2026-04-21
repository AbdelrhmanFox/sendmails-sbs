import { Navigate, useLocation } from 'react-router-dom';
import { canAccessPath } from '../../lib/roleAccess';

export function AreaGuard({ children, role }: { children: React.ReactNode; role: string }) {
  const { pathname } = useLocation();
  if (!canAccessPath(role, pathname)) {
    return <Navigate to="/" replace />;
  }
  return children;
}
