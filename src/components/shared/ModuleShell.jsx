import { Construction } from 'lucide-react';

/**
 * Estrutura visual de módulo — UI pronta para implementação futura.
 * status: 'preview' | 'coming_soon'
 */
export default function ModuleShell({
  title,
  subtitle,
  status = 'preview',
  stats = [],
  sections = [],
  actions = [],
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-text-base">{title}</h1>
          {subtitle && <p className="text-sm text-text-muted mt-1">{subtitle}</p>}
        </div>
        {status === 'coming_soon' && (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 px-3 py-1.5 rounded-lg shrink-0">
            <Construction size={12} /> Em breve
          </span>
        )}
      </div>

      {stats.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-surface border border-border-line rounded-2xl p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase text-text-muted tracking-wider">{s.label}</p>
              <p className="text-2xl font-black text-text-base mt-1">{s.value}</p>
              {s.hint && <p className="text-xs text-text-muted mt-1">{s.hint}</p>}
            </div>
          ))}
        </div>
      )}

      {sections.map((sec) => (
        <div key={sec.title} className="bg-surface border border-border-line rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-text-base mb-1">{sec.title}</h2>
          {sec.description && <p className="text-sm text-text-muted mb-4">{sec.description}</p>}
          {sec.content || (
            <div className="border border-dashed border-border-line rounded-xl p-6 text-center text-sm text-text-muted">
              {sec.placeholder || 'Área reservada para implementação.'}
            </div>
          )}
        </div>
      ))}

      {actions.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {actions.map((a) => (
            <button
              key={a.label}
              type="button"
              disabled={a.disabled !== false}
              className="px-4 py-2.5 rounded-xl text-sm font-bold bg-background border border-border-line text-text-muted cursor-not-allowed opacity-60"
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
