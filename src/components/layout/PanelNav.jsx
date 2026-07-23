import { Link } from 'react-router-dom';
import { LayoutGrid, X } from 'lucide-react';

const scrollClass = 'horza-scroll overflow-y-auto overscroll-contain';

function itemKey(item) {
  return item.to || item.id || item.path || item.label;
}

function isItemActive(item, activeKey) {
  if (!activeKey) return false;
  if (item.id) return item.id === activeKey;
  if (item.to) {
    if (item.exact) return activeKey === item.to;
    return activeKey === item.to || activeKey.startsWith(`${item.to}/`);
  }
  return item.path === activeKey;
}

export function PanelNavItem({ item, isActive, onNavigate, compact = false }) {
  const isPlus = item.group === 'Plus' || item.accent === 'violet';
  const isAmber = item.accent === 'amber';

  const className = `w-full flex items-center gap-3 rounded-xl font-bold transition-all text-left ${
    compact ? 'px-3 py-3 text-sm' : 'px-3 py-2.5 text-[15px] leading-snug'
  } ${
    isActive
      ? isPlus
        ? 'bg-violet-600 text-white shadow-sm'
        : isAmber
          ? 'bg-amber-500 text-white shadow-sm'
          : 'bg-brand text-white shadow-sm'
      : isPlus
        ? 'text-text-muted hover:bg-violet-500/10 hover:text-violet-700'
        : isAmber
          ? 'text-text-muted hover:bg-amber-500/10 hover:text-amber-700'
          : 'text-text-muted hover:bg-brand/5 hover:text-brand'
  }`;

  const content = (
    <>
      <span className={`${isActive ? 'opacity-100' : 'opacity-80'} shrink-0`}>{item.icon}</span>
      <span className="truncate flex-1">{item.label}</span>
      {item.badge && (
        <span className={`text-[9px] font-black uppercase shrink-0 px-1.5 py-0.5 rounded-md ${
          isActive
            ? 'bg-white/20 text-white'
            : item.badgeClass || (item.badgeNumeric ? 'bg-red-500 text-white min-w-[18px] text-center' : 'text-violet-500')
        }`}>
          {item.badge}
        </span>
      )}
    </>
  );

  if (item.to) {
    return (
      <Link to={item.to} onClick={onNavigate} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={() => { item.onSelect?.(); onNavigate?.(); }} className={className}>
      {content}
    </button>
  );
}

export function PanelNavGroups({ groups, activeKey, onNavigate, className = '' }) {
  return (
    <nav className={`space-y-6 ${className}`}>
      {groups.map((group) => (
        <div key={group.name}>
          <p
            className={`px-3 mb-2 text-xs font-black uppercase tracking-wider ${
              group.name === 'Plus' ? 'text-violet-500' : group.accent === 'amber' ? 'text-amber-600' : 'text-text-muted'
            }`}
          >
            {group.name}
          </p>
          <div className="space-y-0.5">
            {group.items.map((item) => (
              <PanelNavItem
                key={itemKey(item)}
                item={item}
                isActive={isItemActive(item, activeKey)}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function groupPanelItems(items, order = null) {
  const map = new globalThis.Map();
  for (const item of items) {
    if (!map.has(item.group)) map.set(item.group, []);
    map.get(item.group).push(item);
  }
  const names = order || [...map.keys()];
  return names.filter((name) => map.has(name)).map((name) => ({
    name,
    items: map.get(name),
    accent: name === 'Plus' ? 'violet' : undefined,
  }));
}

export function PanelNavSidebar({ title, groups, activeKey, subtitle }) {
  return (
    <aside className="hidden md:flex w-[272px] shrink-0 flex-col border-r border-border-line bg-surface/50 self-stretch min-h-[calc(100dvh-var(--horza-header-h))]">
      <div className={`sticky top-[var(--horza-header-h)] max-h-[calc(100dvh-var(--horza-header-h))] ${scrollClass} py-6 px-4 w-full flex-1`}>
        <p className="px-3 mb-1 text-sm font-black text-text-base">{title}</p>
        {subtitle && <p className="px-3 mb-5 text-sm text-text-muted leading-snug">{subtitle}</p>}
        {!subtitle && <div className="mb-5" />}
        <PanelNavGroups groups={groups} activeKey={activeKey} />
      </div>
    </aside>
  );
}

export function PanelNavMobileBar({ itemAtivo, onOpenMenu, menuLabel = 'Menu' }) {
  return (
    <div className="md:hidden sticky top-0 z-40 bg-surface/95 backdrop-blur-md border-b border-border-line px-4 py-3">
      <button
        type="button"
        onClick={onOpenMenu}
        className="w-full flex items-center justify-between gap-3 bg-background border border-border-line rounded-2xl px-4 py-3 text-left shadow-sm active:scale-[0.99] transition-transform"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-xl bg-brand/10 text-brand shrink-0">{itemAtivo?.icon}</div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-wider text-text-muted">Seção atual</p>
            <p className="text-sm font-black text-text-base truncate">{itemAtivo?.label}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 text-brand">
          <LayoutGrid size={18} />
          <span className="text-xs font-black">{menuLabel}</span>
        </div>
      </button>
    </div>
  );
}

export function PanelNavSheet({ open, onClose, title, groups, activeKey }) {
  if (!open) return null;

  return (
    <div className="md:hidden fixed inset-0 z-[70]">
      <button
        type="button"
        aria-label="Fechar menu"
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className={`absolute inset-x-0 bottom-0 max-h-[85dvh] bg-surface rounded-t-3xl shadow-2xl flex flex-col animate-slideUp pb-safe`}>
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border-line shrink-0">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-text-muted">Navegação</p>
            <p className="text-lg font-black text-text-base">{title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-xl bg-background border border-border-line text-text-muted hover:text-text-base"
          >
            <X size={20} />
          </button>
        </div>
        <div className={`px-4 py-4 flex-1 ${scrollClass}`}>
          <PanelNavGroups groups={groups} activeKey={activeKey} onNavigate={onClose} compact />
        </div>
      </div>
    </div>
  );
}

export function PanelNavShell({
  title,
  subtitle,
  groups,
  items,
  activeKey,
  menuOpen,
  setMenuOpen,
  children,
  menuLabel,
}) {
  const itemAtivo = items.find((item) => isItemActive(item, activeKey)) || items[0];

  return (
    <div className="w-full flex items-stretch min-h-[calc(100dvh-var(--horza-header-h))] bg-background">
      <PanelNavSidebar title={title} subtitle={subtitle} groups={groups} activeKey={activeKey} />
      <div className="flex-1 min-w-0 flex flex-col">
        <PanelNavMobileBar itemAtivo={itemAtivo} onOpenMenu={() => setMenuOpen(true)} menuLabel={menuLabel} />
        <PanelNavSheet
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          title={title}
          groups={groups}
          activeKey={activeKey}
        />
        {children}
      </div>
    </div>
  );
}
