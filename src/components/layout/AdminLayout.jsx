import { Link, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Scissors, Package, DollarSign, Building2, CalendarDays, ShieldCheck, CreditCard, Star } from 'lucide-react';

export default function AdminLayout() {
  const location = useLocation();

  const menuItems = [
    { path: '/admin', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
    { path: '/admin/agenda', icon: <CalendarDays size={18} />, label: 'Agenda Geral' }, // ✨ Novo Botão
    { path: '/admin/equipe', icon: <Users size={18} />, label: 'Equipe' },
    { path: '/admin/permissoes', icon: <ShieldCheck size={18} />, label: 'Permissões' },
    { path: '/admin/servicos', icon: <Scissors size={18} />, label: 'Serviços' },
    { path: '/admin/estoque', icon: <Package size={18} />, label: 'Estoque' },
    { path: '/admin/pagamentos', icon: <CreditCard size={18} />, label: 'Pagamentos' },
    { path: '/admin/financeiro', icon: <DollarSign size={18} />, label: 'Financeiro' },
    { path: '/admin/fidelidade', icon: <Star size={18} />, label: 'Fidelidade' },
    { path: '/admin/empresa', icon: <Building2 size={18} />, label: 'Empresa' },
  ];

  return (
    <div className="w-full font-sans pb-24 md:pb-10">

      {/* MENU HORIZONTAL ADMIN - STICKY PARA MOBILE E DESKTOP */}
      {/* Fica grudado no topo (top-[68px] compensa o TopMenu) e ganha um efeito de vidro */}
      <div className="sticky top-[68px] z-40 bg-background/95 backdrop-blur-md border-b border-border-line px-4 md:px-8 py-3 mb-6 shadow-sm">
        <div className="max-w-6xl mx-auto flex overflow-x-auto hide-scrollbar gap-3 snap-x">
          {menuItems.map((item) => {
            const isActive = item.path === '/admin'
              ? location.pathname === '/admin'
              : location.pathname.startsWith(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`snap-start flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm whitespace-nowrap transition-all ${isActive
                    ? 'bg-brand text-white shadow-md shadow-brand/20'
                    : 'bg-surface border border-border-line text-text-muted hover:border-brand/50 hover:text-text-base'
                  }`}
              >
                {item.icon} {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* CONTEÚDO (Onde as telas vão carregar) */}
      <div className="animate-fadeIn px-4 md:px-8 max-w-6xl mx-auto">
        <Outlet />
      </div>
    </div>
  );
}