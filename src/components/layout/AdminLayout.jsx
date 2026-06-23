import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useIsMobile } from '../../hooks/useIsMobile';
import { 
  Scissors, LogOut, LayoutDashboard, Users, 
  Box, ShieldCheck, Building2, Home, DollarSign 
} from 'lucide-react';

export default function AdminLayout({ children }) {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const menuItems = [
  { name: 'Visão Geral', path: '/admin', icon: <LayoutDashboard size={20} /> },
  { name: 'Equipe & Permissões', path: '/admin/equipe', icon: <Users size={20} /> },
  { name: 'Serviços & Preços', path: '/admin/servicos', icon: <Scissors size={20} /> },
  { name: 'Estoque', path: '/admin/estoque', icon: <Box size={20} /> },
  { name: 'Financeiro', path: '/admin/financeiro', icon: <DollarSign size={20} /> }, // ✨ NOVO MENU
  { name: 'Dados da Empresa', path: '/admin/empresa', icon: <Building2 size={20} /> },
  ];

  return (
    <div className="min-h-screen bg-background text-text-base flex flex-col md:flex-row pb-20 md:pb-0">
      
      {/* 🚀 SIDEBAR DESKTOP */}
      {!isMobile && (
        <aside className="bg-surface border-r border-border-line w-64 p-6 flex flex-col justify-between shadow-sm sticky top-0 h-screen">
          <div>
            <div className="flex items-center gap-2 text-brand font-bold text-xl mb-8">
              <Scissors size={28} /> BarberAdmin
            </div>
            <nav className="space-y-2">
              {menuItems.map((item) => (
                <Link 
                  key={item.path} 
                  to={item.path}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all cursor-pointer ${
                    location.pathname === item.path ? 'bg-brand/10 text-brand' : 'text-text-muted hover:bg-background hover:text-text-base'
                  }`}
                >
                  {item.icon} {item.name}
                </Link>
              ))}
            </nav>
          </div>
          
          <div className="mt-8 border-t border-border-line pt-6">
            <p className="font-bold text-text-base text-sm">{profile?.nome}</p>
            <p className="text-xs text-text-muted mb-4 uppercase flex items-center gap-1">
              <ShieldCheck size={14}/> {profile?.role}
            </p>
            
            {/* BOTÃO NOVO: Ir para App Cliente */}
            <Link to="/" className="flex items-center gap-2 text-sm text-text-muted hover:text-brand font-bold transition-colors cursor-pointer w-full mb-3">
              <Home size={16} /> Ver App Cliente
            </Link>

            <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700 font-bold transition-colors cursor-pointer w-full">
              <LogOut size={16} /> Sair do Sistema
            </button>
          </div>
        </aside>
      )}

      {/* 🚀 TOPBAR MOBILE */}
      {isMobile && (
        <header className="bg-surface border-b border-border-line px-6 py-4 flex justify-between items-center shadow-sm sticky top-0 z-40">
          <div className="flex items-center gap-2 text-brand font-bold text-lg">
            <Scissors size={24} /> BarberAdmin
          </div>
          <div className="flex items-center gap-4">
            {/* BOTÃO NOVO MOBILE: Ir para App Cliente */}
            <Link to="/" className="text-text-muted hover:text-brand cursor-pointer">
              <Home size={22} />
            </Link>
            <button onClick={handleLogout} className="text-red-500 cursor-pointer">
              <LogOut size={22} />
            </button>
          </div>
        </header>
      )}

      {/* ÁREA PRINCIPAL */}
      <main className="flex-1 w-full max-w-6xl mx-auto">
        {children}
      </main>

      {/* 🚀 BOTTOM MENU MOBILE */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 w-full bg-surface/95 backdrop-blur-md border-t border-border-line p-2 flex justify-around items-center z-50 pb-safe">
          {menuItems.slice(0, 4).map((item) => (
            <Link 
              key={item.path} 
              to={item.path} 
              className={`flex flex-col items-center gap-1 p-2 transition-colors cursor-pointer ${
                location.pathname === item.path ? 'text-brand' : 'text-text-muted hover:text-text-base'
              }`}
            >
              {item.icon}
              <span className="text-[9px] font-bold text-center leading-tight">{item.name}</span>
            </Link>
          ))}
        </div>
      )}

    </div>
  );
}