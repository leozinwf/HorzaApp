import { X } from 'lucide-react';
import { FILTROS_RAPIDOS } from '../../utils/marketplaceFiltros';

export default function ModalFiltrosMarketplace({
  aberto,
  onFechar,
  raioKm,
  onRaioChange,
  filtroAtivo,
  onFiltroChange,
  onLimpar,
}) {
  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-surface border border-border-line w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border-line">
          <h3 className="font-black text-text-base">Filtros</h3>
          <button type="button" onClick={onFechar} className="p-2 rounded-lg hover:bg-background cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-6 max-h-[70vh] overflow-y-auto horza-scroll">
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-black text-text-muted uppercase tracking-wider">Raio de busca no mapa</label>
              <span className="text-xs font-black text-brand bg-brand/10 px-2 py-1 rounded-md">
                {raioKm < 1 ? `${Math.round(raioKm * 1000)} m` : `${Number(raioKm).toFixed(1)} km`}
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="15"
              step="0.1"
              value={raioKm}
              onChange={(e) => onRaioChange(parseFloat(e.target.value))}
              className="w-full accent-brand cursor-pointer h-1.5 bg-border-line rounded-lg appearance-none"
            />
            <div className="flex justify-between text-[10px] font-bold text-text-muted mt-1">
              <span>100 m</span>
              <span>15 km</span>
            </div>
          </div>

          <div>
            <p className="text-xs font-black text-text-muted uppercase tracking-wider mb-3">Ordenar / filtrar lista</p>
            <div className="space-y-2">
              {FILTROS_RAPIDOS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => onFiltroChange(filtroAtivo === f.id ? null : f.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-colors cursor-pointer ${
                    filtroAtivo === f.id
                      ? 'bg-brand text-white border-brand'
                      : 'bg-background border-border-line hover:border-brand/40'
                  }`}
                >
                  <span className="font-black text-sm">{f.emoji} {f.label}</span>
                  <p className={`text-xs mt-0.5 ${filtroAtivo === f.id ? 'text-white/85' : 'text-text-muted'}`}>
                    {f.descricao}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-border-line flex gap-3">
          <button
            type="button"
            onClick={onLimpar}
            className="flex-1 py-3 rounded-xl border border-border-line font-bold text-sm hover:bg-background cursor-pointer"
          >
            Limpar
          </button>
          <button
            type="button"
            onClick={onFechar}
            className="flex-1 py-3 rounded-xl bg-brand text-white font-black text-sm hover:brightness-110 cursor-pointer"
          >
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
}
