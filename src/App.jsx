import { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ModalProvider } from './context/ModalContext';
import { supabase } from './services/supabaseClient';

// --- Imports de Layout e Modais (Mantidos síncronos por serem críticos/rápidos) ---
import MenuNavegacao from './components/layout/MenuNavegacao';
import AdminLayout from './components/layout/AdminLayout';
import BarberLayout from './components/layout/BarberLayout';
import LoginModal from './components/modals/LoginModal';
import SuperAdminRoute from './components/layout/SuperAdminRoute';
import TenantProtectedRoute from './components/layout/TenantProtectedRoute';

// --- Lazy Imports das Páginas (Performance / Code Splitting) ---
const HomeMarketplace = lazy(() => import('./pages/client/HomeMarketplace'));
const HomeCliente = lazy(() => import('./pages/client/HomeCliente'));
const AgendamentoCliente = lazy(() => import('./pages/client/AgendamentoCliente'));
const AreaCliente = lazy(() => import('./pages/client/AreaCliente'));

const AgendaBarbeiro = lazy(() => import('./pages/barber/AgendaBarbeiro'));
const BarberPerfil = lazy(() => import('./pages/barber/BarberPerfil'));
const CadastroBarbearia = lazy(() => import('./pages/barber/CadastroBarbearia'));

const DashboardMaster = lazy(() => import('./pages/admin/DashboardMaster'));
const DashboardAdmin = lazy(() => import('./pages/admin/DashboardAdmin'));
const AdminEquipe = lazy(() => import('./pages/admin/AdminEquipe'));
const AdminEmpresa = lazy(() => import('./pages/admin/AdminEmpresa'));
const AdminServicos = lazy(() => import('./pages/admin/AdminServicos'));
const AdminEstoque = lazy(() => import('./pages/admin/AdminEstoque'));
const AdminFinanceiro = lazy(() => import('./pages/admin/AdminFinanceiro'));
const AdminAgendaEquipe = lazy(() => import('./pages/admin/AdminAgendaEquipe'));
const AdminPermissoes = lazy(() => import('./pages/admin/AdminPermissoes'));
const AdminPagamentos = lazy(() => import('./pages/admin/AdminPagamentos'));
const AdminFidelidade = lazy(() => import('./pages/admin/AdminFidelidade'));
const AdminUsuarios = lazy(() => import('./pages/admin/AdminUsuarios'));
const AdminIntegracoes = lazy(() => import('./pages/admin/AdminIntegracoes'));
const AdminComunicados = lazy(() => import('./pages/admin/AdminComunicados'));
const AdminMeuPlano = lazy(() => import('./pages/admin/AdminMeuPlano'));
const AdminUnidades = lazy(() => import('./pages/admin/plus/AdminUnidades'));
const AdminComissoes = lazy(() => import('./pages/admin/plus/AdminComissoes'));
const AdminHeatmap = lazy(() => import('./pages/admin/plus/AdminHeatmap'));
const AdminInteligencia = lazy(() => import('./pages/admin/plus/AdminInteligencia'));
const AdminBackup = lazy(() => import('./pages/admin/plus/AdminBackup'));
const AdminDominio = lazy(() => import('./pages/admin/plus/AdminDominio'));
const StripeCallback = lazy(() => import('./pages/admin/StripeCallback'));

const PaginaSuporte = lazy(() => import('./pages/institutional/PaginaSuporte'));
const PaginaContato = lazy(() => import('./pages/institutional/PaginaContato'));
const PaginaTermos = lazy(() => import('./pages/institutional/PaginaTermos'));
const PaginaConsentimento = lazy(() => import('./pages/institutional/PaginaConsentimento'));
const PaginaPrivacidade = lazy(() => import('./pages/institutional/PaginaPrivacidade'));
const PaginaQuemSomos = lazy(() => import('./pages/institutional/PaginaQuemSomos'));

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
      toast.error('O link de recuperação expirou. Por favor, solicite um novo.');
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

      <main className="pb-safe-nav md:pb-0 md:pt-[var(--horza-header-h)] min-h-screen bg-background flex flex-col">
        <Suspense fallback={
          <div className="flex-1 flex items-center justify-center min-h-[50vh]">
            <div className="h-8 w-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
          </div>
        }>
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
        </Suspense>
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