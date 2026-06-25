import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Calendar, User, LogIn, LayoutDashboard, Home, Clock } from 'lucide-react';

export default function BottomMenu({ onOpenLogin }) {
  const { user, profile } = useAuth();
  
  const isAdminOuGerente = profile?.role === 'admin' || profile?.role === 'gerente';
  const isFuncionario = profile?.role === 'funcionario'; // ✨ Verificação adicionada

  return (
    <div className="fixed bottom-0 left-0 w-full bg-surface/90 backdrop-blur-lg border-t border-border-line px-4 pt-3 pb-safe flex justify-around items-center z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
      
      {/* Início */}
      <Link to="/" className="flex flex-col items-center gap-1 text-text-muted hover:text-brand transition-colors cursor-pointer p-1">
        <Home size={22} strokeWidth={2} />
        <span className="text-[10px] font-bold tracking-wider">Início</span>
      </Link>
      
      {/* Agendar */}
      <Link to="/agendar" className="flex flex-col items-center gap-1 text-text-muted hover:text-brand transition-colors cursor-pointer p-1">
        <Calendar size={22} strokeWidth={2} />
        <span className="text-[10px] font-bold tracking-wider">Agendar</span>
      </Link>

      {/* ✨ Painel (Admin) */}
      {user && isAdminOuGerente && (
        <Link to="/admin" className="flex flex-col items-center gap-1 text-brand transition-colors cursor-pointer p-1">
          <LayoutDashboard size={22} strokeWidth={2} />
          <span className="text-[10px] font-bold tracking-wider">Painel</span>
        </Link>
      )}

      {/* ✨ Minha Agenda (Barbeiro) */}
      {user && isFuncionario && (
        <Link to="/barbeiro" className="flex flex-col items-center gap-1 text-brand transition-colors cursor-pointer p-1">
          <Clock size={22} strokeWidth={2} />
          <span className="text-[10px] font-bold tracking-wider">Agenda</span>
        </Link>
      )}

      {/* Perfil ou Login */}
      {user ? (
        <Link to="/area-cliente" className="flex flex-col items-center gap-1 text-text-muted hover:text-brand transition-colors cursor-pointer p-1">
          <User size={22} strokeWidth={2} />
          <span className="text-[10px] font-bold tracking-wider">Conta</span>
        </Link>
      ) : (
        <button 
          onClick={onOpenLogin} 
          className="flex flex-col items-center gap-1 text-text-muted hover:text-brand transition-colors cursor-pointer bg-transparent border-none outline-none p-1"
        >
          <LogIn size={22} strokeWidth={2} />
          <span className="text-[10px] font-bold tracking-wider">Entrar</span>
        </button>
      )}
    </div>
  );
}