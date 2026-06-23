import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Scissors, LogOut, LayoutDashboard, LogIn } from 'lucide-react';

export default function TopMenu({ onOpenLogin }) {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isAdminOuGerente = profile?.role === 'admin' || profile?.role === 'gerente';

  return (
    <header className="bg-surface border-b border-border-line px-8 py-4 flex justify-between items-center shadow-sm sticky top-0 z-50">
      <Link to="/" className="flex items-center gap-2 text-brand font-bold text-xl hover:scale-105 transition-transform cursor-pointer">
        <Scissors size={28} /> Horza
      </Link>
      <nav className="flex items-center gap-6">
        <Link to="/agendar" className="text-text-muted hover:text-brand font-medium cursor-pointer">Agendar</Link>
        
        {user && isAdminOuGerente && (
          <Link 
            to="/admin" 
            className="text-brand border border-brand/30 bg-brand/5 hover:bg-brand/10 font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer text-sm"
          >
            <LayoutDashboard size={16} /> Painel Admin
          </Link>
        )}

        {user ? (
          <div className="flex items-center gap-4">
            {/* Verifique se o profile carregou o nome antes de exibir */}
            <span className="font-semibold text-text-base">
              Olá, {profile?.nome?.split(' ')[0] || 'Cliente'}
            </span>
            <button onClick={handleLogout} className="...">Sair</button>
          </div>
        ) : (
          <button 
            onClick={onOpenLogin} 
            className="text-brand font-bold text-sm cursor-pointer bg-brand/10 hover:bg-brand/20 border border-brand/20 px-4 py-2 rounded-xl transition-all flex items-center gap-1.5"
          >
            <LogIn size={16} /> Entrar / Cadastrar
          </button>
        )}
      </nav>
    </header>
  );
}