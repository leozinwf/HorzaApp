import { useState } from 'react';
import { Link, useParams, Outlet, useLocation } from 'react-router-dom';
import {
  CalendarDays, Users, User, Link2, Menu, X, ChevronDown, Scissors, ArrowLeft,
} from 'lucide-react';

export default function BarberLayout() {
  const location = useLocation();
  const { slug } = useParams();
  const [menuMobileAberto, setMenuMobileAberto] = useState(false);

  const menuItems = [
    { path: `/${slug}/barbeiro`, icon: <CalendarDays size={20} />, label: 'Minha Agenda', group: 'Operacional' },
    { path: `/${slug}/barbeiro/clientes`, icon: <Users size={20} />, label: 'Clientes', group: 'Operacional' },
    { path: `/${slug}/barbeiro/perfil`, icon: <User size={20} />, label: 'Meu Perfil', group: 'Conta' },
    { path: `/${slug}/barbeiro/integracoes`, icon: <Link2 size={20} />, label: 'Integrações', group: 'Conta' },
  ];

  const itemAtivo = menuItems.find((item) =>
    item.path === `/${slug}/barbeiro`
      ? location.pathname === `/${slug}/barbeiro`
      : location.pathname.startsWith(item.path)
  ) || menuItems[0];

  return (
    <div className="w-full font-sans pb-24 md:pb-10 relative">
      <div className="bg-surface border-b border-border-line px-4 md:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-brand text-white p-2 rounded-xl">
            <Scissors size={18} />
          </div>
          <div>
            <h1 className="text-lg font-black text-text-base">Painel do Barbeiro</h1>
            <p className="text-xs text-text-muted">Gerencie sua agenda e clientes</p>
          </div>
        </div>
        <Link to={`/${slug}`} className="hidden md:inline-flex items-center gap-2 text-xs font-bold text-text-muted hover:text-brand">
          <ArrowLeft size={14} /> Voltar à barbearia
        </Link>
      </div>

      <div className="md:hidden sticky top-[60px] z-50 bg-surface border-b border-border-line px-4 py-3 shadow-sm">
        <button onClick={() => setMenuMobileAberto(!menuMobileAberto)} className="w-full bg-background border border-border-line px-4 py-3 rounded-xl flex items-center justify-between font-bold text-sm text-text-base shadow-sm">
          <div className="flex items-center gap-2">
            <Menu size={18} className="text-brand" />
            <span>Menu: <span className="text-brand">{itemAtivo.label}</span></span>
          </div>
          {menuMobileAberto ? <X size={18} /> : <ChevronDown size={18} />}
        </button>

        {menuMobileAberto && (
          <div className="absolute left-4 right-4 top-[65px] bg-surface border border-border-line rounded-2xl shadow-xl p-4 grid grid-cols-2 gap-3 z-[60] animate-slideUp">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMenuMobileAberto(false)}
                className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl text-xs font-bold transition-all text-center ${
                  item.path === itemAtivo.path
                    ? 'bg-brand text-white shadow-md'
                    : 'bg-background border border-border-line text-text-muted hover:border-brand/50 hover:text-brand'
                }`}
              >
                {item.icon} {item.label}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="hidden md:block sticky top-[68px] z-40 bg-background/80 backdrop-blur-md border-b border-border-line mb-6 shadow-sm">
        <div className="max-w-6xl mx-auto px-8 py-3 flex gap-2 items-center overflow-x-auto whitespace-nowrap hide-scrollbar">
          {menuItems.map((item, index) => {
            const isActive = item.path === itemAtivo.path;
            const showSeparator = index > 0 && menuItems[index - 1].group !== item.group;

            return (
              <div key={item.path} className="flex items-center gap-2">
                {showSeparator && <div className="h-6 w-px bg-border-line mx-2 rounded-full" />}
                <Link
                  to={item.path}
                  className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-[13px] transition-all duration-300 ${
                    isActive
                      ? 'bg-brand text-white shadow-md'
                      : 'bg-surface border border-border-line text-text-muted hover:border-brand/50 hover:text-brand hover:bg-brand/5'
                  }`}
                >
                  <span className={`${isActive ? 'scale-110' : 'opacity-80'}`}>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      <div className="animate-fadeIn px-4 md:px-8 max-w-6xl mx-auto mt-6 md:mt-0 relative z-0">
        <Outlet />
      </div>
    </div>
  );
}
