import { ADMIN_MENU_ITEMS, groupAdminMenuItems } from '../../constants/adminModules';
import { useTenantPlanOptional } from '../../context/PlanContext';
import { PanelNavShell } from './PanelNav';

export function useAdminNav(slug) {
  const plan = useTenantPlanOptional();

  const menuItems = ADMIN_MENU_ITEMS.map((item) => {
    const Icon = item.icon;
    return {
      ...item,
      to: `/${slug}/${item.path}`,
      icon: <Icon size={20} strokeWidth={2.25} />,
      locked: item.featureKey && plan && !plan.canUseFeature(item.featureKey),
      badge: item.plusOnly && item.featureKey && plan && !plan.canUseFeature(item.featureKey) ? 'Plus' : undefined,
    };
  });

  return {
    menuItems,
    groups: groupAdminMenuItems(menuItems),
  };
}

export function resolveActiveAdminItem(menuItems, location, slug) {
  const activePath = location.pathname;
  return (
    menuItems.find((i) =>
      i.to === `/${slug}/admin`
        ? activePath === `/${slug}/admin`
        : activePath.startsWith(i.to)
    ) || menuItems[0]
  );
}

export function AdminNavShell({ slug, location, menuOpen, setMenuOpen, children }) {
  const { menuItems, groups } = useAdminNav(slug);
  const active = resolveActiveAdminItem(menuItems, location, slug);

  return (
    <PanelNavShell
      title="Painel Admin"
      subtitle="Gestão da barbearia"
      groups={groups}
      items={menuItems}
      activeKey={active.to}
      menuOpen={menuOpen}
      setMenuOpen={setMenuOpen}
    >
      {children}
    </PanelNavShell>
  );
}
