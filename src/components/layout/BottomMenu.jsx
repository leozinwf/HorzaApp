import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Scissors, Calendar, User, LogIn, LayoutDashboard } from 'lucide-react';

export default function BottomMenu() {
  const { user, profile } = useAuth();

  const isAdminOuGerente = profile?.role === 'admin' || profile?.role === 'gerente';

  return (
    <div className="fixed bottom-0 left-0 w-full bg-surface/95 backdrop-blur-md border-t border-border-line p-4 flex justify-around items-center z-50 pb-safe">
      <Link to="/" className="flex flex-col items-center gap-1 text-text-muted hover:text-brand transition-colors cursor-pointer">
        <Scissors size={20} />
        <span className="text-[10px] font-bold">Início</span>
      </Link>
      
      <Link to="/agendar" className="flex flex-col items-center gap-1 text-text-muted hover:text-brand transition-colors cursor-pointer">
        <Calendar size={20} />
        <span className="text-[10px] font-bold">Agendar</span>
      </Link>

      {user && isAdminOuGerente && (
        <Link to="/admin" className="flex flex-col items-center gap-1 text-brand animate-fadeIn cursor-pointer">
          <LayoutDashboard size={20} />
          <span className="text-[10px] font-bold">Painel</span>
        </Link>
      )}

      {user ? (
        <Link to="/" className="flex flex-col items-center gap-1 text-text-muted hover:text-brand transition-colors cursor-pointer">
          <User size={20} />
          <span className="text-[10px] font-bold">Perfil</span>
        </Link>
      ) : (
        <Link to="/login" className="flex flex-col items-center gap-1 text-text-muted hover:text-brand transition-colors cursor-pointer">
          <LogIn size={20} />
          <span className="text-[10px] font-bold">Entrar</span>
        </Link>
      )}
    </div>
  );
}