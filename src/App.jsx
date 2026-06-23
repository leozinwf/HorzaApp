import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ModalProvider } from './context/ModalContext';

// Telas de Cliente
import AgendamentoCliente from './pages/client/AgendamentoCliente';
import HomeCliente from './pages/client/HomeCliente';

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

// Proteção de Rotas Atualizada
function ProtectedRoute({ children, allowedRoles }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent"></div>
      </div>
    );
  }

  // Como o login agora é um Popup (Modal), redirecionamos os não logados para a Home
  if (!user) return <Navigate to="/" replace />;
  
  // Controle de Nível de Acesso (Cargos)
  if (allowedRoles && !allowedRoles.includes(profile?.role)) {
    if (profile?.role === 'admin' || profile?.role === 'gerente') return <Navigate to="/admin" replace />;
    if (profile?.role === 'funcionario') return <Navigate to="/barbeiro" replace />;
    return <Navigate to="/" replace />;
  }

  return children;
}

// Estrutura Interna da App para controlar os Menus e o Popup de Login
function AppContent() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  return (
    <>
      {/* Menus Globais que disparam a abertura do Login */}
      <TopMenu onOpenLogin={() => setIsLoginModalOpen(true)} />
      
      {/* Container principal das páginas (com padding em baixo para não sobrepor o menu mobile) */}
      <main className="pb-16 md:pb-0 min-h-screen bg-background pt-20">
        <Routes>
          <Route path="/" element={<HomeCliente />} />
          <Route path="/agendar" element={<AgendamentoCliente />} />

          {/* ROTAS MODULARIZADAS DO ADMIN */}
          <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin', 'gerente']}><DashboardAdmin /></ProtectedRoute>} />
          <Route path="/admin/equipe" element={<ProtectedRoute allowedRoles={['admin', 'gerente']}><AdminEquipe /></ProtectedRoute>} />
          <Route path="/admin/servicos" element={<ProtectedRoute allowedRoles={['admin', 'gerente']}><AdminServicos /></ProtectedRoute>} />
          <Route path="/admin/estoque" element={<ProtectedRoute allowedRoles={['admin', 'gerente']}><AdminEstoque /></ProtectedRoute>} />
          <Route path="/admin/empresa" element={<ProtectedRoute allowedRoles={['admin']}><AdminEmpresa /></ProtectedRoute>} />
          <Route path="/admin/financeiro" element={<ProtectedRoute allowedRoles={['admin', 'gerente']}><AdminFinanceiro /></ProtectedRoute>} />

          {/* ROTA DO BARBEIRO / FUNCIONÁRIO */}
          <Route path="/barbeiro" element={<ProtectedRoute allowedRoles={['funcionario']}><AgendaBarbeiro /></ProtectedRoute>} />

          {/* Rota de Fallback (Páginas inexistentes vão para a Home) */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Apenas visível em ecrãs móveis */}
      <div className="md:hidden">
        <BottomMenu onOpenLogin={() => setIsLoginModalOpen(true)} />
      </div>

      {/* O NOSSO NOVO POPUP DE LOGIN GLOBAL */}
      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
      />
    </>
  );
}

// Envolucro Principal com todos os Providers (Contextos)
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