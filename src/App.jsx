import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ModalProvider } from './context/ModalContext';

// Telas de Cliente e Auth
import Login from './pages/Login';
import AgendamentoCliente from './pages/client/AgendamentoCliente';
import HomeCliente from './pages/client/HomeCliente';

// Layout do Admin
import AdminLayout from './components/layout/AdminLayout';

// Telas do Admin
import DashboardAdmin from './pages/admin/DashboardAdmin';
import AdminEquipe from './pages/admin/AdminEquipe';
import AdminEmpresa from './pages/admin/AdminEmpresa';
import AdminServicos from './pages/admin/AdminServicos';
import AdminEstoque from './pages/admin/AdminEstoque';

function ProtectedRoute({ children, allowedRoles }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return <div className="flex h-screen w-screen items-center justify-center bg-background"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent"></div></div>;
  }

  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(profile?.role)) {
    if (profile?.role === 'admin' || profile?.role === 'gerente') return <Navigate to="/admin" replace />;
    if (profile?.role === 'funcionario') return <Navigate to="/barbeiro" replace />;
    return <Navigate to="/" replace />;
  }

  // Se a rota for de admin, envelopa ela com o AdminLayout
  if (allowedRoles?.includes('admin')) {
    return <AdminLayout>{children}</AdminLayout>;
  }

  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <ModalProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomeCliente />} />
            <Route path="/agendar" element={<AgendamentoCliente />} />
            <Route path="/login" element={<Login />} />

            {/* ROTAS MODULARIZADAS DO ADMIN */}
            <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin', 'gerente']}><DashboardAdmin /></ProtectedRoute>} />
            <Route path="/admin/equipe" element={<ProtectedRoute allowedRoles={['admin', 'gerente']}><AdminEquipe /></ProtectedRoute>} />
            <Route path="/admin/servicos" element={<ProtectedRoute allowedRoles={['admin', 'gerente']}><AdminServicos /></ProtectedRoute>} />
            <Route path="/admin/estoque" element={<ProtectedRoute allowedRoles={['admin', 'gerente']}><AdminEstoque /></ProtectedRoute>} />
            <Route path="/admin/empresa" element={<ProtectedRoute allowedRoles={['admin']}><AdminEmpresa /></ProtectedRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ModalProvider>
    </AuthProvider>
  );
}