import { Link, useParams, Outlet, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Scissors, 
  Package, 
  DollarSign, 
  Building2, 
  CalendarDays, 
  ShieldCheck, 
  CreditCard, 
  Star,
  UserCheck 
} from 'lucide-react';

export default function AdminLayout() {
  const location = useLocation();
  const { slug } = useParams(); // ✨ Faltava pegar o slug da URL aqui!

  const menuItems = [
    // Dashboard (Geral)
    { path: `/${slug}/admin`, icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
    { type: 'separator' },
    
    // Operacional
    { path: `/${slug}/admin/agenda`, icon: <CalendarDays size={18} />, label: 'Agenda Geral' },
    { path: `/${slug}/admin/servicos`, icon: <Scissors size={18} />, label: 'Serviços' },
    { path: `/${slug}/admin/estoque`, icon: <Package size={18} />, label: 'Estoque' },
    { type: 'separator' },

    // Pessoas
    { path: `/${slug}/admin/usuarios`, icon: <Users size={18} />, label: 'Todos Usuários' },
    { path: `/${slug}/admin/equipe`, icon: <UserCheck size={18} />, label: 'Equipe' },
    { path: `/${slug}/admin/fidelidade`, icon: <Star size={18} />, label: 'Fidelidade' },
    { type: 'separator' },

    // Financeiro
    { path: `/${slug}/admin/pagamentos`, icon: <CreditCard size={18} />, label: 'Pagamentos' },
    { path: `/${slug}/admin/financeiro`, icon: <DollarSign size={18} />, label: 'Financeiro' },
    { type: 'separator' },

    // Configurações
    { path: `/${slug}/admin/empresa`, icon: <Building2 size={18} />, label: 'Empresa' },
    { path: `/${slug}/admin/permissoes`, icon: <ShieldCheck size={18} />, label: 'Permissões' },
  ];

  return (
    <div className="w-full font-sans pb-24 md:pb-10 relative">
      {/* MENU HORIZONTAL ADMIN - STICKY PARA MOBILE E DESKTOP */}
      <div className="sticky top-[68px] z-40 bg-background/25 backdrop-blur-md border-b border-border-line mb-6 shadow-sm">
        
        <div className="absolute top-0 bottom-0 left-0 w-8 bg-gradient-to-r from-background to-transparent pointer-events-none md:hidden"></div>
        <div className="absolute top-0 bottom-0 right-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none md:hidden"></div>

        <div className="max-w-6xl mx-auto px-4 md:px-8 py-3 overflow-x-auto hide-scrollbar scroll-smooth flex gap-2.5 items-center">
          {menuItems.map((item, index) => {
            
            if (item.type === 'separator') {
              return (
                <div key={`sep-${index}`} className="h-6 w-px bg-border-line/80 mx-1 flex-shrink-0 rounded-full"></div>
              );
            }

            // Validação corrigida para usar o path renderizado
            const isActive = item.path === `/${slug}/admin`
              ? location.pathname === `/${slug}/admin`
              : location.pathname.startsWith(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-[13px] transition-all duration-300 ease-in-out ${
                  isActive
                    ? 'bg-brand text-white shadow-md shadow-brand/20 ring-1 ring-brand/50'
                    : 'bg-surface border border-border-line text-text-muted hover:border-brand/50 hover:text-brand hover:bg-brand/5'
                  }`}
              >
                <span className={`transition-transform ${isActive ? 'scale-110' : 'scale-100 opacity-80'}`}>
                  {item.icon}
                </span>
                <span className="tracking-tight">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* CONTEÚDO */}
      <div className="animate-fadeIn px-4 md:px-8 max-w-6xl mx-auto">
        <Outlet />
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}