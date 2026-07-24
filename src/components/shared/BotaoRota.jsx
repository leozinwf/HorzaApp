import { useState } from 'react';
import { Navigation, MapPin, ChevronDown } from 'lucide-react';
import { urlsRota } from '../../utils/endereco';

export default function BotaoRota({ barbearia, className = '', compacto = false }) {
  const [aberto, setAberto] = useState(false);
  const urls = urlsRota(barbearia);

  const abrir = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer');
    setAberto(false);
  };

  return (
    <div className={`relative ${aberto ? 'z-50' : 'z-10'} ${className}`}>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className={`inline-flex items-center gap-2 bg-background border border-border-line text-text-base px-3 py-1.5 rounded-lg text-xs font-bold hover:border-brand cursor-pointer shadow-sm ${className}`}
      >
        <Navigation size={14} className="text-brand" /> {compacto ? 'Rotas' : 'Como chegar'}
      </button>

      {aberto && (
        <>
          <button type="button" className="fixed inset-0 z-40" onClick={() => setAberto(false)} aria-label="Fechar" />
          <div className="absolute right-0 top-full mt-2 z-50 bg-surface border border-border-line rounded-xl shadow-xl overflow-hidden min-w-[160px] origin-top-right">
            <button type="button" onClick={() => abrir(urls.google)} className="w-full text-left px-4 py-3 text-sm font-bold hover:bg-background flex items-center gap-2 cursor-pointer">
              <MapPin size={16} className="text-green-600" /> Google Maps
            </button>
            <button type="button" onClick={() => abrir(urls.waze)} className="w-full text-left px-4 py-3 text-sm font-bold hover:bg-background flex items-center gap-2 border-t border-border-line cursor-pointer">
              <Navigation size={16} className="text-blue-500" /> Waze
            </button>
          </div>
        </>
      )}
    </div>
  );
}
