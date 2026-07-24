import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const isSuperAdminUser = (user, profile) =>
  profile?.role === 'super_admin';

export default function SuperAdminRoute({ children }) {
  const { user, profile, authReady } = useAuth();

  if (!authReady) return null;

  if (!isSuperAdminUser(user, profile)) {
    return <Navigate replace to="/"/>;
  }

  return children;
}
