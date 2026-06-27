import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Scissors, LogOut, LayoutDashboard, LogIn, Calendar, Home, Clock, User } from 'lucide-react';

export default function MenuNavegacao({ onOpenLogin }) {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isAdminOuGerente = profile?.role === 'admin' || profile?.role === 'gerente';
  const isFuncionario = profile?.role === 'funcionario';

  return (
    <>
      {/* ==========================================
          🖥️ MENU DESKTOP (Mostra no PC, esconde no Mobile)
          ========================================== */}
      <header className="hidden md:flex bg-surface/80 backdrop-blur-md border-b border-border-line px-8 py-3 items-center sticky top-0 z-50 shadow-sm transition-all">
        
        {/* 1. LADO ESQUERDO: LOGO (flex-1 para empurrar o centro) */}
        <div className="flex-1 flex items-center">
          <Link to="/" className="flex items-center gap-2 text-brand font-black text-xl cursor-pointer hover:opacity-80 transition-opacity">
            <div className="bg-brand text-white p-1.5 rounded-xl shadow-sm">
              <Scissors size={20} />
            </div>
            <span>Horza</span>
          </Link>
        </div>

        {/* 2. CENTRO: LINKS DE NAVEGAÇÃO (Perfeitamente centralizados) */}
        <nav className="flex items-center justify-center gap-2">
          <Link to="/" className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-text-muted hover:text-brand hover:bg-brand/5 text-sm font-bold transition-all">
            <Home size={18} /> Início
          </Link>
          <Link to="/agendar" className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-text-muted hover:text-brand hover:bg-brand/5 text-sm font-bold transition-all">
            <Calendar size={18} /> Agendar
          </Link>
          
          {user && isAdminOuGerente && (
            <Link to="/admin" className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-brand bg-brand/5 hover:bg-brand/10 border border-brand/20 text-sm font-bold transition-all shadow-sm">
              <LayoutDashboard size={18} /> Painel Admin
            </Link>
          )}

          {user && isFuncionario && (
            <Link to="/barbeiro" className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-brand bg-brand/5 hover:bg-brand/10 border border-brand/20 text-sm font-bold transition-all shadow-sm">
              <Clock size={18} /> Minha Agenda
            </Link>
          )}
        </nav>

        {/* 3. LADO DIREITO: CONTA / LOGIN (flex-1 e justify-end para alinhar à direita) */}
        <div className="flex-1 flex items-center justify-end gap-3">
          {user ? (
            <div className="flex items-center gap-4 animate-fadeIn">
              <Link to="/area-cliente" className="flex items-center gap-2 px-4 py-2 rounded-full bg-background border border-border-line hover:border-brand transition-all group shadow-sm">
                <div className="h-7 w-7 rounded-full bg-brand/10 text-brand flex items-center justify-center text-xs font-black group-hover:bg-brand group-hover:text-white transition-colors">
                  {profile?.nome?.charAt(0) || 'U'}
                </div>
                <span className="text-sm font-bold text-text-base">
                  {profile?.nome?.split(' ')[0]}
                </span>
              </Link>
              
              <button onClick={handleLogout} className="p-2.5 text-text-muted hover:text-red-500 rounded-xl hover:bg-red-50 transition-colors cursor-pointer" title="Sair">
                <LogOut size={20} />
              </button>
            </div>
          ) : (
            <button onClick={onOpenLogin} className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-brand text-white text-sm font-bold hover:bg-opacity-90 shadow-md shadow-brand/20 transition-all cursor-pointer">
              <LogIn size={18} /> Entrar
            </button>
          )}
        </div>
      </header>


      {/* ==========================================
          📱 MENU MOBILE (Mostra no Celular, esconde no PC)
          ========================================== */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-surface/95 backdrop-blur-lg border-t border-border-line px-2 pt-2 pb-safe flex justify-around items-center z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        
        <Link to="/" className="flex flex-col items-center gap-1.5 text-text-muted hover:text-brand transition-colors cursor-pointer p-2 w-16">
          <Home size={22} strokeWidth={2.5} />
          <span className="text-[10px] font-black tracking-wider">Início</span>
        </Link>
        
        <Link to="/agendar" className="flex flex-col items-center gap-1.5 text-text-muted hover:text-brand transition-colors cursor-pointer p-2 w-16">
          <Calendar size={22} strokeWidth={2.5} />
          <span className="text-[10px] font-black tracking-wider">Agendar</span>
        </Link>

        {user && isAdminOuGerente && (
          <Link to="/admin" className="flex flex-col items-center gap-1.5 text-brand transition-colors cursor-pointer p-2 w-16">
            <LayoutDashboard size={22} strokeWidth={2.5} />
            <span className="text-[10px] font-black tracking-wider">Painel</span>
          </Link>
        )}

        {user && isFuncionario && (
          <Link to="/barbeiro" className="flex flex-col items-center gap-1.5 text-brand transition-colors cursor-pointer p-2 w-16">
            <Clock size={22} strokeWidth={2.5} />
            <span className="text-[10px] font-black tracking-wider">Agenda</span>
          </Link>
        )}

        {user ? (
          <Link to="/area-cliente" className="flex flex-col items-center gap-1.5 text-text-muted hover:text-brand transition-colors cursor-pointer p-2 w-16">
            <User size={22} strokeWidth={2.5} />
            <span className="text-[10px] font-black tracking-wider">Conta</span>
          </Link>
        ) : (
          <button onClick={onOpenLogin} className="flex flex-col items-center gap-1.5 text-text-muted hover:text-brand transition-colors cursor-pointer bg-transparent border-none outline-none p-2 w-16">
            <LogIn size={22} strokeWidth={2.5} />
            <span className="text-[10px] font-black tracking-wider">Entrar</span>
          </button>
        )}
      </nav>
    </>
  );
}