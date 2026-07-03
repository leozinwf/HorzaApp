import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function SuperAdminRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-brand border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // Verifica se o usuário existe e se o email é EXATAMENTE o seu
  if (!user || user.email !== 'admin@barbearia.com') {
    return <Navigate replace to="/"/>;
  }

  return children;
}