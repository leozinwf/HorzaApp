import { useState } from 'react';
import { Navigation, MapPin, ChevronDown } from 'lucide-react';
import { urlsRota } from '../../utils/endereco';

export default function BotaoRota({ barbearia, className = '' }) {
  const [aberto, setAberto] = useState(false);
  const urls = urlsRota(barbearia);

  const abrir = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer');
    setAberto(false);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="inline-flex items-center gap-2 bg-brand text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:brightness-110 cursor-pointer shadow-sm"
      >
        <Navigation size={16} /> Como chegar
        <ChevronDown size={14} className={`transition-transform ${aberto ? 'rotate-180' : ''}`} />
      </button>

      {aberto && (
        <>
          <button type="button" className="fixed inset-0 z-40" onClick={() => setAberto(false)} aria-label="Fechar" />
          <div className="absolute left-0 top-full mt-2 z-50 bg-surface border border-border-line rounded-xl shadow-xl overflow-hidden min-w-[200px]">
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
