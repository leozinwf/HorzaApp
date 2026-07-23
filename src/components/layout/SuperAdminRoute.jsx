import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const SUPER_ADMIN_EMAIL = 'admin@barbearia.com';

export const isSuperAdminUser = (user, profile) =>
  profile?.role === 'super_admin' || user?.email === SUPER_ADMIN_EMAIL;

export default function SuperAdminRoute({ children }) {
  const { user, profile, authReady } = useAuth();

  if (!authReady) return null;

  if (!isSuperAdminUser(user, profile)) {
    return <Navigate replace to="/"/>;
  }

  return children;
}
