import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ModalProvider } from './context/ModalContext';
import { supabase } from './services/supabaseClient'; // ✨ Importante para o ouvinte

// Telas de Cliente
import AgendamentoCliente from './pages/client/AgendamentoCliente';
import HomeCliente from './pages/client/HomeCliente';
import AreaCliente from './pages/client/AreaCliente';

// Tela do barbeiro
import AgendaBarbeiro from './pages/barber/AgendaBarbeiro';

// Componentes de layout globais
import TopMenu from './components/layout/TopMenu';
import BottomMenu from './components/layout/BottomMenu';
import LoginModal from './components/modals/LoginModal';

// Telas do Admin
import DashboardAdmin from './pages/admin/DashboardAdmin';
import AdminEquipe from './pages/admin/AdminEquipe';
import AdminEmpresa from './pages/admin/AdminEmpresa';
import AdminServicos from './pages/admin/AdminServicos';
import AdminEstoque from './pages/admin/AdminEstoque';
import AdminFinanceiro from './pages/admin/AdminFinanceiro';

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

  if (allowedRoles && !allowedRoles.includes(profile?.role)) {
    if (profile?.role === 'admin' || profile?.role === 'gerente') return <Navigate to="/admin" replace />;
    if (profile?.role === 'funcionario') return <Navigate to="/barbeiro" replace />;
    return <Navigate to="/" replace />;
  }

  return children;
}

function AppContent() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginModalMode, setLoginModalMode] = useState('login'); // ✨ Controla a tela inicial da modal

  // 🚀 OUVINTE DE RECUPERAÇÃO DE SENHA
  useEffect(() => {
    // 1. Verifica se houve erro de link expirado na URL
    const hash = window.location.hash;
    if (hash.includes('error_code=otp_expired')) {
      alert('O link de recuperação expirou ou já foi utilizado. Por favor, solicite um novo link.');
      window.history.replaceState(null, '', window.location.pathname); // Limpa a URL
    }

    // 2. Fica escutando se o Supabase autorizou a recuperação de senha
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Se for uma recuperação de senha, abrimos a modal no modo update
      if (event === 'PASSWORD_RECOVERY') {
        setLoginModalMode('update_password');
        setIsLoginModalOpen(true);
      }
      // Se o usuário já logou mas precisa de senha, o Supabase já tratou[cite: 5]
    });

    return () => subscription.unsubscribe();
  }, []);

  const openLogin = () => {
    setLoginModalMode('login');
    setIsLoginModalOpen(true);
  };

  return (
    <>
      <TopMenu onOpenLogin={openLogin} />

      <main className="pb-16 md:pb-0 min-h-screen bg-background pt-20">
        <Routes>
          <Route path="/" element={<HomeCliente />} />
          <Route path="/agendar" element={<AgendamentoCliente onOpenLogin={openLogin} />} />
          <Route path="/area-cliente" element={<ProtectedRoute allowedRoles={['cliente']}><AreaCliente /></ProtectedRoute>} />

          <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin', 'gerente']}><DashboardAdmin /></ProtectedRoute>} />
          <Route path="/admin/equipe" element={<ProtectedRoute allowedRoles={['admin', 'gerente']}><AdminEquipe /></ProtectedRoute>} />
          <Route path="/admin/servicos" element={<ProtectedRoute allowedRoles={['admin', 'gerente']}><AdminServicos /></ProtectedRoute>} />
          <Route path="/admin/estoque" element={<ProtectedRoute allowedRoles={['admin', 'gerente']}><AdminEstoque /></ProtectedRoute>} />
          <Route path="/admin/empresa" element={<ProtectedRoute allowedRoles={['admin']}><AdminEmpresa /></ProtectedRoute>} />
          <Route path="/admin/financeiro" element={<ProtectedRoute allowedRoles={['admin', 'gerente']}><AdminFinanceiro /></ProtectedRoute>} />

          <Route path="/barbeiro" element={<ProtectedRoute allowedRoles={['funcionario']}><AgendaBarbeiro /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <div className="md:hidden">
        <BottomMenu onOpenLogin={openLogin} />
      </div>

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        initialMode={loginModalMode} // ✨ Passa o modo para a modal
      />
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