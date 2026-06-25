import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Scissors, LogOut, LayoutDashboard, LogIn, Calendar, Home, Clock } from 'lucide-react';

export default function TopMenu({ onOpenLogin }) {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isAdminOuGerente = profile?.role === 'admin' || profile?.role === 'gerente';
  const isFuncionario = profile?.role === 'funcionario'; // ✨ Verificação adicionada

  return (
    <header className="bg-surface/80 backdrop-blur-md border-b border-border-line px-6 py-3 flex items-center justify-between sticky top-0 z-50 shadow-sm transition-all">
      
      {/* LOGO */}
      <Link to="/" className="flex items-center gap-2 text-brand font-bold text-lg mr-8 cursor-pointer hover:opacity-80 transition-opacity">
        <div className="bg-brand text-white p-1.5 rounded-lg">
          <Scissors size={20} />
        </div>
        <span className="hidden sm:block">Horza</span>
      </Link>

      {/* NAVEGAÇÃO PRINCIPAL (Páginas) */}
      <nav className="hidden md:flex items-center gap-1">
        <Link to="/" className="flex items-center gap-2 px-4 py-2 rounded-lg text-text-muted hover:text-brand hover:bg-brand/5 text-sm font-medium transition-all">
          <Home size={16} /> Início
        </Link>
        <Link to="/agendar" className="flex items-center gap-2 px-4 py-2 rounded-lg text-text-muted hover:text-brand hover:bg-brand/5 text-sm font-medium transition-all">
          <Calendar size={16} /> Agendar
        </Link>
        
        {/* BOTÃO DO ADMIN */}
        {user && isAdminOuGerente && (
          <Link to="/admin" className="flex items-center gap-2 px-4 py-2 rounded-lg text-brand bg-brand/5 hover:bg-brand/10 border border-brand/20 text-sm font-bold transition-all ml-2 shadow-sm">
            <LayoutDashboard size={16} /> Painel Admin
          </Link>
        )}

        {/* ✨ BOTÃO DO BARBEIRO (FUNCIONÁRIO) ✨ */}
        {user && isFuncionario && (
          <Link to="/barbeiro" className="flex items-center gap-2 px-4 py-2 rounded-lg text-brand bg-brand/5 hover:bg-brand/10 border border-brand/20 text-sm font-bold transition-all ml-2 shadow-sm">
            <Clock size={16} /> Minha Agenda
          </Link>
        )}
      </nav>

      {/* ESPAÇADOR FLEXÍVEL */}
      <div className="flex-grow" />

      {/* ÁREA DE CONTA E IDENTIDADE */}
      <div className="flex items-center gap-3">
        {user ? (
          <div className="flex items-center gap-4 animate-fadeIn">
            <Link 
              to="/area-cliente" 
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-background border border-border-line hover:border-brand transition-all group"
            >
              <div className="h-6 w-6 rounded-full bg-brand/10 text-brand flex items-center justify-center text-[10px] font-bold">
                {profile?.nome?.charAt(0) || 'U'}
              </div>
              <span className="text-sm font-semibold text-text-base hidden sm:block">
                {profile?.nome?.split(' ')[0]}
              </span>
            </Link>
            
            <button 
              onClick={handleLogout} 
              className="p-2 text-text-muted hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
              title="Sair"
            >
              <LogOut size={18} />
            </button>
          </div>
        ) : (
          <button 
            onClick={onOpenLogin} 
            className="flex items-center gap-2 px-5 py-2 rounded-full bg-brand text-white text-sm font-semibold hover:bg-brand-hover shadow-lg shadow-brand/20 transition-all cursor-pointer"
          >
            <LogIn size={16} /> Entrar
          </button>
        )}
      </div>
    </header>
  );
}