import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useIsMobile } from '../../hooks/useIsMobile';
import { Scissors, Calendar, User, Clock, MapPin, ChevronRight, LogOut } from 'lucide-react';

export default function HomeCliente() {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="flex flex-col text-text-base">
      <div className="flex-1 w-full max-w-4xl mx-auto md:px-6">
        <div className="bg-surface rounded-b-[2rem] p-6 pt-10 border-b border-border-line shadow-sm md:rounded-2xl md:mt-8 md:p-12 md:border">
          <div className="flex justify-between items-center mb-6">
            <div>
              <p className="text-text-muted text-sm">Bem-vindo(a) à</p>
              <h1 className="text-2xl font-bold text-brand flex items-center gap-2">
                {isMobile && <Scissors size={24} />} BarberSaaS
              </h1>
            </div>
            {isMobile && (
              <div className="h-12 w-12 rounded-full bg-background border-2 border-brand flex items-center justify-center text-brand">
                <User size={24} />
              </div>
            )}
          </div>

          {user ? (
            <div className="bg-background p-4 rounded-2xl border border-border-line">
              <p className="text-sm text-text-muted">Olá, <span className="font-bold text-text-base">{profile?.nome}</span>!</p>
            </div>
          ) : (
            isMobile && (
              <div className="bg-brand/10 p-4 rounded-2xl border border-brand/20 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-brand">Você não está logado</p>
                </div>
                <Link to="/login" className="bg-brand text-white text-xs font-bold px-4 py-2 rounded-xl">Entrar</Link>
              </div>
            )
          )}
        </div>

        <div className="p-6 space-y-6 md:grid md:grid-cols-2 md:gap-8 md:space-y-0">
          <Link to="/agendar" className="block w-full bg-brand p-4 rounded-2xl text-white relative overflow-hidden group shadow-md hover:shadow-lg transition-all md:h-full md:flex md:flex-col md:justify-center">
            <div className="relative z-10">
              <h2 className="text-lg font-bold">Agendar Horário</h2>
              <p className="text-sm font-medium opacity-90 mt-1">Escolha seu barbeiro e serviço</p>
            </div>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 p-3 rounded-full group-hover:scale-110 transition-transform">
              <Calendar size={24} />
            </div>
          </Link>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider">Sobre a Barbearia</h3>
            <div className="bg-surface p-4 rounded-2xl border border-border-line flex items-start gap-4 shadow-sm">
              <div className="bg-background p-3 rounded-xl text-brand"><MapPin size={20} /></div>
              <div>
                <p className="text-sm font-bold text-text-base">Localização</p>
                <p className="text-xs text-text-muted mt-1">Av. Principal, 1000 - Centro</p>
              </div>
            </div>
            <div className="bg-surface p-4 rounded-2xl border border-border-line flex items-start gap-4 shadow-sm">
              <div className="bg-background p-3 rounded-xl text-brand"><Clock size={20} /></div>
              <div>
                <p className="text-sm font-bold text-text-base">Horário</p>
                <p className="text-xs text-text-muted mt-1">Terça a Sábado das 09:00 às 20:00</p>
              </div>
            </div>
          </div>
          
          {user && isMobile && (
            <button onClick={handleLogout} className="w-full bg-surface p-4 rounded-2xl border border-border-line flex items-center justify-between text-red-500 mt-6 shadow-sm">
              <div className="flex items-center gap-3"><LogOut size={20} /><span className="text-sm font-bold">Sair da conta</span></div>
              <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}