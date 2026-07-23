import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ModalProvider } from './context/ModalContext';
import { supabase } from './services/supabaseClient';

// --- Imports de Layout e Modais ---
import MenuNavegacao from './components/layout/MenuNavegacao';
import AdminLayout from './components/layout/AdminLayout';
import BarberLayout from './components/layout/BarberLayout';
import LoginModal from './components/modals/LoginModal';
import SuperAdminRoute from './components/layout/SuperAdminRoute';
import TenantProtectedRoute from './components/layout/TenantProtectedRoute';

// --- Imports das Páginas do Cliente/Marketplace ---
import HomeMarketplace from './pages/client/HomeMarketplace';
import HomeCliente from './pages/client/HomeCliente';
import AgendamentoCliente from './pages/client/AgendamentoCliente';
import AreaCliente from './pages/client/AreaCliente';

// --- Imports das Páginas do Barbeiro ---
import AgendaBarbeiro from './pages/barber/AgendaBarbeiro';
import BarberPerfil from './pages/barber/BarberPerfil';
import CadastroBarbearia from './pages/barber/CadastroBarbearia';

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
import AdminIntegracoes from './pages/admin/AdminIntegracoes';
import AdminComunicados from './pages/admin/AdminComunicados';
import AdminMeuPlano from './pages/admin/AdminMeuPlano';
import AdminUnidades from './pages/admin/plus/AdminUnidades';
import AdminComissoes from './pages/admin/plus/AdminComissoes';
import AdminHeatmap from './pages/admin/plus/AdminHeatmap';
import AdminInteligencia from './pages/admin/plus/AdminInteligencia';
import AdminBackup from './pages/admin/plus/AdminBackup';
import AdminDominio from './pages/admin/plus/AdminDominio';
import StripeCallback from './pages/admin/StripeCallback';

import PaginaSuporte from './pages/institutional/PaginaSuporte';
import PaginaContato from './pages/institutional/PaginaContato';
import PaginaTermos from './pages/institutional/PaginaTermos';
import PaginaConsentimento from './pages/institutional/PaginaConsentimento';
import PaginaPrivacidade from './pages/institutional/PaginaPrivacidade';
import PaginaQuemSomos from './pages/institutional/PaginaQuemSomos';

// Componente para proteger rotas normais
function ProtectedRoute({ children, allowedRoles }) {
  const { user, profile, authReady } = useAuth();

  if (!authReady) return null;

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

  const openLogin = (mode = 'login') => {
    setLoginModalMode(mode === 'register' ? 'register' : 'login');
    setIsLoginModalOpen(true);
  };

  return (
    <>
      <MenuNavegacao onOpenLogin={openLogin} />

      <main className="pb-safe-nav md:pb-0 md:pt-[var(--horza-header-h)] min-h-screen bg-background">
          <Routes>
            <Route path="/" element={<HomeMarketplace />} />
            <Route path="/cadastro-barbearia" element={<CadastroBarbearia />} />
            <Route path="/suporte" element={<PaginaSuporte />} />
            <Route path="/contato" element={<PaginaContato />} />
            <Route path="/termos" element={<PaginaTermos />} />
            <Route path="/consentimento" element={<PaginaConsentimento />} />
            <Route path="/privacidade" element={<PaginaPrivacidade />} />
            <Route path="/quem-somos" element={<PaginaQuemSomos />} />
            <Route path="/master" element={<SuperAdminRoute><DashboardMaster /></SuperAdminRoute>} />

            <Route path="/area-cliente" element={<ProtectedRoute allowedRoles={['cliente', 'admin', 'gerente', 'funcionario', 'super_admin']}><AreaCliente /></ProtectedRoute>}/>

            <Route path="/:slug" element={<HomeCliente onOpenLogin={openLogin} />} />
            <Route path="/:slug/agendar" element={<AgendamentoCliente onOpenLogin={openLogin} />} />

            <Route path="/:slug/barbeiro" element={<TenantProtectedRoute allowedRoles={['funcionario', 'gerente', 'admin']}><BarberLayout /></TenantProtectedRoute>}>
              <Route index element={<AgendaBarbeiro />} />
              <Route path="clientes" element={<AdminUsuarios />} />
              <Route path="perfil" element={<BarberPerfil />} />
              <Route path="integracoes" element={<AdminIntegracoes />} />
            </Route>

            <Route path="/:slug/admin" element={<TenantProtectedRoute allowedRoles={['admin', 'gerente']}><AdminLayout /></TenantProtectedRoute>}>
              <Route index element={<DashboardAdmin />} />
              <Route path="equipe" element={<AdminEquipe />} />
              <Route path="usuarios" element={<AdminUsuarios />} />
              <Route path="agenda" element={<AdminAgendaEquipe />} />
              <Route path="servicos" element={<AdminServicos />} />
              <Route path="estoque" element={<AdminEstoque />} />
              <Route path="pagamentos" element={<AdminPagamentos />} />
              <Route path="plano" element={<AdminMeuPlano />} />
              <Route path="pagamentos/callback" element={<StripeCallback />} />
              <Route path="empresa" element={<AdminEmpresa />} />
              <Route path="financeiro" element={<AdminFinanceiro />} />
              <Route path="permissoes" element={<AdminPermissoes />} />
              <Route path="integracoes" element={<AdminIntegracoes />} />
              <Route path="comunicados" element={<AdminComunicados />} />
              <Route path="fidelidade" element={<AdminFidelidade />} />
              <Route path="unidades" element={<AdminUnidades />} />
              <Route path="comissoes" element={<AdminComissoes />} />
              <Route path="heatmap" element={<AdminHeatmap />} />
              <Route path="inteligencia" element={<AdminInteligencia />} />
              <Route path="backup" element={<AdminBackup />} />
              <Route path="dominio" element={<AdminDominio />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
      </main>

      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} initialMode={loginModalMode} />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'var(--surface)',
            color: 'var(--text-base)',
            border: '1px solid var(--border-line)',
          },
        }}
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