import { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import { montarEndereco, obterCoordenadasBarbearia } from '../../utils/endereco';
import BotaoRota from './BotaoRota';
import MapaInterativo from './MapaInterativo';

export default function MapaLocalizacao({ barbearia, className = '', compact = false, localizacaoUsuario = null }) {
  const [pontoUnico, setPontoUnico] = useState(null);
  const endereco = montarEndereco(barbearia);

  useEffect(() => {
    if (!barbearia) return;
    obterCoordenadasBarbearia(barbearia).then((coords) => {
      if (coords) setPontoUnico({ ...barbearia, lat: coords.lat, lng: coords.lng });
    });
  }, [barbearia]);

  if (!endereco && !pontoUnico) return null;

  return (
    <div className={`space-y-4 ${className}`}>
      {!compact && endereco && (
        <p className="text-sm text-text-muted flex items-start gap-2">
          <MapPin size={16} className="text-brand shrink-0 mt-0.5" />
          <span>{endereco}</span>
        </p>
      )}

      {pontoUnico ? (
        <MapaInterativo
          barbearias={[pontoUnico]}
          localizacaoUsuario={localizacaoUsuario}
          centroPreferido={{ lat: pontoUnico.lat, lng: pontoUnico.lng }}
          raioKm={1}
          estiloMapa="limpo"
          altura={compact ? '280px' : '320px'}
        />
      ) : (
        <div className="rounded-2xl border border-dashed border-border-line p-8 text-center text-sm text-text-muted bg-background">
          Carregando mapa...
        </div>
      )}

      <BotaoRota barbearia={barbearia} />
    </div>
  );
}
