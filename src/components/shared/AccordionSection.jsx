import { ChevronDown } from 'lucide-react';

export default function AccordionSection({
  title,
  subtitle,
  icon,
  open,
  onToggle,
  children,
  badge,
}) {
  return (
    <section className="bg-surface border border-border-line rounded-3xl shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center gap-4 p-5 md:p-6 text-left hover:bg-background/50 transition-colors"
      >
        <div className="p-2.5 rounded-xl bg-brand/10 text-brand shrink-0">{icon}</div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base md:text-lg font-black text-text-base">{title}</h2>
          {subtitle && <p className="text-sm text-text-muted mt-0.5">{subtitle}</p>}
        </div>
        {badge}
        <ChevronDown
          size={22}
          className={`text-text-muted shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="border-t border-border-line px-5 md:px-6 pb-5 md:pb-6">
          <div className="pt-5">{children}</div>
        </div>
      )}
    </section>
  );
}
