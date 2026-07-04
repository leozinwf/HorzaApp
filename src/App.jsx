import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ModalProvider } from './context/ModalContext';
import { supabase } from './services/supabaseClient';

// --- Imports de Layout e Modais ---
import MenuNavegacao from './components/layout/MenuNavegacao';
import AdminLayout from './components/layout/AdminLayout';
import LoginModal from './components/modals/LoginModal';
import SuperAdminRoute from './components/layout/SuperAdminRoute';

// --- Imports das Páginas do Cliente/Marketplace ---
import HomeMarketplace from './pages/client/HomeMarketplace';
import HomeCliente from './pages/client/HomeCliente';
import AgendamentoCliente from './pages/client/AgendamentoCliente';
import AreaCliente from './pages/client/AreaCliente';

// --- Imports das Páginas do Barbeiro ---
import AgendaBarbeiro from './pages/barber/AgendaBarbeiro';

// --- Imports das Páginas de Admin ---
import DashboardMaster from './pages/admin/DashboardMaster';
import DashboardAdmin from './pages/admin/DashboardAdmin';
import AdminEquipe from './pages/admin/AdminEquipe';
import AdminEmpresa from './pages/admin/AdminEmpresa';
import AdminServicos from './pages/admin/AdminServicos';
import AdminEstoque from './pages/admin/AdminEstoque';
import AdminFinanceiro from './pages/admin/AdminFinanceiro';
import AdminAgendaEquipe from './pages/admin/AdminAgendaEquipe';
import AdminPermissoes from './pages/admin/AdminPermissoes';
import AdminPagamentos from './pages/admin/AdminPagamentos';
import AdminFidelidade from './pages/admin/AdminFidelidade';
import AdminUsuarios from './pages/admin/AdminUsuarios';
import StripeCallback from './pages/admin/StripeCallback';

// Componente para proteger rotas normais
function ProtectedRoute({ children, allowedRoles }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent"></div>
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;
  if (allowedRoles && !allowedRoles.includes(profile?.role)) return <Navigate to="/" replace />;

  return children;
}

function AppContent() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginModalMode, setLoginModalMode] = useState('login');

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('error_code=otp_expired')) {
      alert('O link de recuperação expirou. Por favor, solicite um novo.');
      window.history.replaceState(null, '', window.location.pathname);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setLoginModalMode('update_password');
        setIsLoginModalOpen(true);
        window.history.replaceState(null, '', window.location.pathname);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const openLogin = () => {
    setLoginModalMode('login');
    setIsLoginModalOpen(true);
  };

  return (
    <>
      <MenuNavegacao onOpenLogin={openLogin} />

      <main className="pb-24 md:pb-0 min-h-screen bg-background">
          <Routes>
            <Route path="/" element={<HomeMarketplace />} />
            <Route path="/master" element={<SuperAdminRoute><DashboardMaster /></SuperAdminRoute>} />

            <Route path="/area-cliente" element={<ProtectedRoute allowedRoles={['cliente', 'admin', 'gerente', 'funcionario']}><AreaCliente /></ProtectedRoute>}/>

            <Route path="/:slug" element={<HomeCliente onOpenLogin={openLogin} />} />
            <Route path="/:slug/agendar" element={<AgendamentoCliente onOpenLogin={openLogin} />} />

            <Route path="/:slug/barbeiro" element={<ProtectedRoute allowedRoles={['funcionario', 'gerente', 'admin']}><AgendaBarbeiro /></ProtectedRoute>} />

            <Route path="/:slug/admin" element={<ProtectedRoute allowedRoles={['admin', 'gerente']}><AdminLayout /></ProtectedRoute>}>
              <Route index element={<DashboardAdmin />} />
              <Route path="equipe" element={<AdminEquipe />} />
              <Route path="usuarios" element={<AdminUsuarios />} />
              <Route path="agenda" element={<AdminAgendaEquipe />} />
              <Route path="servicos" element={<AdminServicos />} />
              <Route path="estoque" element={<AdminEstoque />} />
              <Route path="pagamentos" element={<AdminPagamentos />} />
              <Route path="pagamentos/callback" element={<StripeCallback />} />
              <Route path="empresa" element={<AdminEmpresa />} />
              <Route path="financeiro" element={<AdminFinanceiro />} />
              <Route path="permissoes" element={<AdminPermissoes />} />
              <Route path="fidelidade" element={<AdminFidelidade />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
      </main>

      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} initialMode={loginModalMode} />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ModalProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </ModalProvider>
    </AuthProvider>
  );
}