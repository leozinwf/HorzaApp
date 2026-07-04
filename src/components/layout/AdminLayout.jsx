import { useState } from 'react';
import { Link, useParams, Outlet, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Scissors, Package, DollarSign, 
  Building2, CalendarDays, ShieldCheck, CreditCard, Star,
  UserCheck, Menu, X, ChevronDown
} from 'lucide-react';

export default function AdminLayout() {
  const location = useLocation();
  const { slug } = useParams();
  const [menuMobileAberto, setMenuMobileAberto] = useState(false);

  const menuItems = [
    { path: `/${slug}/admin`, icon: <LayoutDashboard size={20} />, label: 'Dashboard', group: 'Geral' },
    { path: `/${slug}/admin/agenda`, icon: <CalendarDays size={20} />, label: 'Agenda Geral', group: 'Operacional' },
    { path: `/${slug}/admin/servicos`, icon: <Scissors size={20} />, label: 'Serviços', group: 'Operacional' },
    { path: `/${slug}/admin/estoque`, icon: <Package size={20} />, label: 'Estoque', group: 'Operacional' },
    { path: `/${slug}/admin/usuarios`, icon: <Users size={20} />, label: 'Clientes', group: 'Pessoas' },
    { path: `/${slug}/admin/equipe`, icon: <UserCheck size={20} />, label: 'Equipe', group: 'Pessoas' },
    { path: `/${slug}/admin/fidelidade`, icon: <Star size={20} />, label: 'Fidelidade', group: 'Pessoas' },
    { path: `/${slug}/admin/pagamentos`, icon: <CreditCard size={20} />, label: 'Pagamentos', group: 'Financeiro' },
    { path: `/${slug}/admin/financeiro`, icon: <DollarSign size={20} />, label: 'Financeiro', group: 'Financeiro' },
    { path: `/${slug}/admin/empresa`, icon: <Building2 size={20} />, label: 'Empresa', group: 'Config' },
    { path: `/${slug}/admin/permissoes`, icon: <ShieldCheck size={20} />, label: 'Permissões', group: 'Config' },
  ];

  const itemAtivo = menuItems.find(i => 
    i.path === `/${slug}/admin` 
      ? location.pathname === `/${slug}/admin` 
      : location.pathname.startsWith(i.path)
  ) || menuItems[0];

  return (
    <div className="w-full font-sans pb-24 md:pb-10 relative">
      
      {/* 📱 MENU MOBILE (DROPDOWN) */}
      <div className="md:hidden sticky top-[60px] z-40 bg-surface border-b border-border-line px-4 py-3 shadow-sm">
        <button 
          onClick={() => setMenuMobileAberto(!menuMobileAberto)}
          className="w-full bg-background border border-border-line px-4 py-3 rounded-xl flex items-center justify-between font-bold text-sm text-text-base shadow-sm"
        >
          <div className="flex items-center gap-2">
            <Menu size={18} className="text-brand" /> 
            <span>Menu: <span className="text-brand">{itemAtivo.label}</span></span>
          </div>
          {menuMobileAberto ? <X size={18} /> : <ChevronDown size={18} />}
        </button>

        {menuMobileAberto && (
          <div className="absolute left-4 right-4 top-[65px] bg-surface border border-border-line rounded-2xl shadow-xl p-4 grid grid-cols-2 gap-3 z-50 animate-slideUp max-h-[70vh] overflow-y-auto">
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
                {item.icon}
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* 🖥️ MENU DESKTOP (HORIZONTAL) */}
      <div className="hidden md:block sticky top-[68px] z-40 bg-background/80 backdrop-blur-md border-b border-border-line mb-6 shadow-sm">
        <div className="max-w-6xl mx-auto px-8 py-3 overflow-x-auto hide-scrollbar flex gap-2 items-center">
          {menuItems.map((item, index) => {
            const isActive = item.path === itemAtivo.path;
            const showSeparator = index > 0 && menuItems[index - 1].group !== item.group;

            return (
              <div key={item.path} className="flex items-center gap-2">
                {showSeparator && <div className="h-6 w-px bg-border-line mx-2 rounded-full"></div>}
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

      {/* CONTEÚDO DA PÁGINA */}
      <div className="animate-fadeIn px-4 md:px-8 max-w-6xl mx-auto mt-6 md:mt-0">
        <Outlet />
      </div>
      
    </div>
  );
}