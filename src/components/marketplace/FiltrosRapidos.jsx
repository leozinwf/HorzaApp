const FILTROS = [
  { id: 'avaliacao', label: 'Avaliação', emoji: '⭐' },
  { id: 'proximos', label: 'Mais Próximos', emoji: '📍' },
  { id: 'aberto', label: 'Aberto Agora', emoji: '✂️' },
  { id: 'estacionamento', label: 'Estacionamento', emoji: '🚗' },
];

export default function FiltrosRapidos({ filtroAtivo = null, onFiltroChange, onAbrirFiltros, painelAberto = false }) {
  const toggle = (id) => {
    onFiltroChange?.(filtroAtivo === id ? null : id);
  };

  const filtrosAtivos = Boolean(filtroAtivo) || painelAberto;

  return (
    <section className="w-full min-w-0" aria-label="Filtros rápidos">
      <div className="horza-scroll-x gap-2 py-1">
        <button
          type="button"
          onClick={onAbrirFiltros}
          className={`horza-scroll-x-item inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-black border transition-colors cursor-pointer whitespace-nowrap ${
            filtrosAtivos
              ? 'bg-brand text-white border-brand shadow-sm'
              : 'border-brand/40 bg-brand/15 text-brand hover:bg-brand/25'
          }`}
        >
          Filtros <span aria-hidden>⚙️</span>
        </button>

        {FILTROS.map((f) => {
          const ativo = filtroAtivo === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => toggle(f.id)}
              className={`horza-scroll-x-item inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold border transition-colors cursor-pointer whitespace-nowrap ${
                ativo
                  ? 'bg-brand text-white border-brand shadow-sm'
                  : 'bg-surface text-text-base border-border-line hover:border-brand/40 hover:bg-background'
              }`}
            >
              <span aria-hidden>{f.emoji}</span>
              {f.label}
            </button>
          );
        })}
        <div className="horza-scroll-x-item w-2 shrink-0" aria-hidden="true" />
      </div>
    </section>
  );
}
