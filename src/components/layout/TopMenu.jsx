import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Scissors, LogOut, LayoutDashboard } from 'lucide-react';

export default function TopMenu() {
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
        <Scissors size={28} /> BarberSaaS
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
            <span className="font-semibold text-text-base">Olá, {profile?.nome}</span>
            <button onClick={handleLogout} className="flex items-center gap-1 text-red-500 hover:text-red-700 cursor-pointer">
              <LogOut size={18} /> Sair
            </button>
          </div>
        ) : (
          <Link to="/login" className="bg-brand text-white px-5 py-2 rounded-lg font-bold hover:bg-brand-hover transition-colors cursor-pointer">
            Entrar / Cadastrar
          </Link>
        )}
      </nav>
    </header>
  );
}