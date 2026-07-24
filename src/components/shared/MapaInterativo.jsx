import { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Crosshair, MapPin } from 'lucide-react';
import { resolverCoordenadasLista } from '../../utils/endereco';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const iconePadrao = L.icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const iconeUsuario = L.divIcon({
  className: 'horza-map-marker horza-map-marker-user',
  html: '<div style="width:16px;height:16px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,.35);pointer-events:auto;"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const iconeDestaque = L.divIcon({
  className: 'horza-map-marker horza-map-marker-destaque',
  html: `<div class="marker-inner-destaque" style="width:28px;height:28px;background:var(--brand,#d4af37);border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;color:white;pointer-events:auto;">
           <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"></polygon></svg>
         </div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const obterCoordenadas = (b) => {
  const lat = Number(b.lat ?? b.latitude);
  const lng = Number(b.lng ?? b.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
};

const formatDistancia = (km) => {
  if (km == null || !Number.isFinite(Number(km))) return '';
  const n = Number(km);
  if (n < 1) return `${Math.round(n * 1000)} m de você`;
  return `${n.toFixed(1)} km de você`;
};

const montarPopupHtml = (b) => {
  const isDestaque = b.plan_slug === 'pro' || b.plan_slug === 'plus';
  const distancia = formatDistancia(b.distancia_km);
  const estrela = isDestaque
    ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="#d4af37" stroke="#d4af37" stroke-width="2" style="flex-shrink:0"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"></polygon></svg>'
    : '';

  return `
    <div style="text-align:center;padding:2px 4px;min-width:110px;max-width:180px;">
      <div style="display:flex;align-items:center;justify-content:center;gap:4px;font-weight:800;font-size:13px;line-height:1.2;color:#1a1a1a;">
        ${estrela}
        <span>${b.nome || 'Barbearia'}</span>
      </div>
      ${distancia ? `<div style="font-size:11px;color:#666;margin-top:4px;">${distancia}</div>` : ''}
    </div>
  `;
};

const criarCirculoRaio = (map, lat, lng, raioKm, { ajustarZoom = false } = {}) => {
  const circle = L.circle([lat, lng], {
    radius: raioKm * 1000,
    color: '#3b82f6',
    fillColor: '#3b82f6',
    fillOpacity: 0.07,
    weight: 2,
    dashArray: '6 4',
    interactive: false,
  }).addTo(map);

  if (ajustarZoom) {
    map.fitBounds(circle.getBounds(), { padding: [24, 24], maxZoom: 15 });
  }
  return circle;
};

export default function MapaInterativo({
  barbearias = [],
  localizacaoUsuario = null,
  altura = '420px',
  onSelecionar = null,
  raioKm = 2.5,
  centroPreferido = null,
  hoveredBarbeariaId = null,
  barbeariaParaCentralizar = null,
  estiloMapa = 'normal',
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersLayerRef = useRef(null);
  const markersRef = useRef([]);
  const userMarkerRef = useRef(null);
  const circleRef = useRef(null);
  const onSelecionarRef = useRef(onSelecionar);
  const [pontos, setPontos] = useState([]);
  const [carregando, setCarregando] = useState(true);

  onSelecionarRef.current = onSelecionar;

  const barbeariasKey = useMemo(
    () => barbearias.map((b) => `${b.id}:${b.lat ?? b.latitude}:${b.lng ?? b.longitude}:${b.distancia_km}`).join('|'),
    [barbearias]
  );

  const aplicarRaioNoMapa = (map, lat, lng, ajustarZoom = false) => {
    if (circleRef.current) {
      circleRef.current.remove();
      circleRef.current = null;
    }
    if (lat != null && lng != null) {
      circleRef.current = criarCirculoRaio(map, lat, lng, raioKm, { ajustarZoom });
    }
  };

  useEffect(() => {
    let ativo = true;

    const carregar = async () => {
      const todosComCoords = barbearias.every((b) => obterCoordenadas(b));
      if (todosComCoords) {
        setPontos(barbearias);
        setCarregando(false);
        return;
      }

      setCarregando(true);
      const resolvidos = await resolverCoordenadasLista(barbearias);
      if (ativo) {
        setPontos(resolvidos);
        setCarregando(false);
      }
    };

    carregar();
    return () => { ativo = false; };
  }, [barbeariasKey, barbearias]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const centroInicial = centroPreferido
      ? [centroPreferido.lat, centroPreferido.lng]
      : localizacaoUsuario
        ? [localizacaoUsuario.lat, localizacaoUsuario.lng]
        : [-23.5505, -46.6333];

    mapRef.current = L.map(containerRef.current, { zoomControl: true }).setView(centroInicial, 12);

    const urlTile = estiloMapa === 'limpo'
      ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    L.tileLayer(urlTile, {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      maxZoom: 19,
    }).addTo(mapRef.current);

    markersLayerRef.current = L.layerGroup().addTo(mapRef.current);

    const lat = centroPreferido?.lat ?? localizacaoUsuario?.lat;
    const lng = centroPreferido?.lng ?? localizacaoUsuario?.lng;
    if (lat != null && lng != null) {
      aplicarRaioNoMapa(mapRef.current, lat, lng, true);
    }

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
      userMarkerRef.current = null;
      circleRef.current = null;
      markersRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    const lat = centroPreferido?.lat ?? localizacaoUsuario?.lat;
    const lng = centroPreferido?.lng ?? localizacaoUsuario?.lng;
    if (lat == null || lng == null) return;

    aplicarRaioNoMapa(mapRef.current, lat, lng);
  }, [localizacaoUsuario, centroPreferido, raioKm]);

  useEffect(() => {
    if (!mapRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();
    markersRef.current = [];

    pontos.forEach((b) => {
      const coords = obterCoordenadas(b);
      if (!coords) return;

      const { lat, lng } = coords;
      const isDestaque = b.plan_slug === 'pro' || b.plan_slug === 'plus';

      const marker = L.marker([lat, lng], {
        icon: isDestaque ? iconeDestaque : iconePadrao,
        zIndexOffset: isDestaque ? 1000 : 200,
        riseOnHover: true,
      });

      marker.bindPopup(montarPopupHtml(b), {
        closeButton: true,
        autoPan: true,
        className: 'horza-map-popup',
        maxWidth: 200,
        minWidth: 110,
      });

      marker.on('click', () => {
        onSelecionarRef.current?.(b);
      });

      marker.addTo(markersLayerRef.current);
      markersRef.current.push({ id: b.id, marker, data: b });
    });

    if (markersRef.current.length > 0 && !localizacaoUsuario && !centroPreferido) {
      const group = L.featureGroup(markersRef.current.map((m) => m.marker));
      mapRef.current.fitBounds(group.getBounds().pad(0.2));
    }
  }, [pontos, localizacaoUsuario, centroPreferido]);

  useEffect(() => {
    if (!mapRef.current) return;

    markersRef.current.forEach(({ id, marker }) => {
      const el = marker.getElement();
      if (!el) return;

      if (id === hoveredBarbeariaId) {
        el.classList.add('horza-map-marker-hover');
      } else {
        el.classList.remove('horza-map-marker-hover');
      }
    });
  }, [hoveredBarbeariaId]);

  useEffect(() => {
    if (!barbeariaParaCentralizar || !mapRef.current) return;

    const item = markersRef.current.find((m) => m.id === barbeariaParaCentralizar.id);
    if (!item) return;

    const coords = obterCoordenadas(item.data);
    if (!coords) return;

    const map = mapRef.current;
    map.flyTo([coords.lat, coords.lng], 15, { animate: true, duration: 1 });

    const abrirPopup = () => {
      item.marker.openPopup();
      map.panBy([0, -60], { animate: true });
    };

    map.once('moveend', abrirPopup);
    const fallback = window.setTimeout(abrirPopup, 1200);

    return () => {
      map.off('moveend', abrirPopup);
      window.clearTimeout(fallback);
    };
  }, [barbeariaParaCentralizar, pontos]);

  useEffect(() => {
    if (!mapRef.current || !localizacaoUsuario) return;

    const { lat, lng } = localizacaoUsuario;

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([lat, lng]);
    } else {
      userMarkerRef.current = L.marker([lat, lng], {
        icon: iconeUsuario,
        zIndexOffset: 3000,
        riseOnHover: true,
      }).addTo(mapRef.current);
    }

    userMarkerRef.current.bindPopup('<strong>Você está aqui</strong>', {
      closeButton: true,
      autoPan: true,
      className: 'horza-map-popup',
    });
  }, [localizacaoUsuario]);

  const centralizarEmMim = () => {
    if (!mapRef.current) return;
    const lat = localizacaoUsuario?.lat ?? centroPreferido?.lat;
    const lng = localizacaoUsuario?.lng ?? centroPreferido?.lng;
    if (lat == null || lng == null) return;
    aplicarRaioNoMapa(mapRef.current, lat, lng, true);
  };

  const pontosComCoordenadas = pontos.filter((b) => obterCoordenadas(b));
  const mapaVazio = pontosComCoordenadas.length === 0;

  return (
    <div className="relative rounded-3xl border border-border-line shadow-sm [&_.leaflet-container]:rounded-3xl">
      <div ref={containerRef} style={{ height: altura, width: '100%' }} className="z-0 bg-background" />

      {(localizacaoUsuario || centroPreferido) && (
        <button
          type="button"
          onClick={centralizarEmMim}
          className="absolute top-3 right-3 z-[1000] bg-surface border border-border-line p-2.5 rounded-xl shadow-lg hover:border-brand cursor-pointer"
          title={`Ver raio de ${raioKm} km`}
        >
          <Crosshair size={20} className="text-brand" />
        </button>
      )}

      {carregando && (
        <div className="absolute inset-0 z-[999] bg-background/70 flex items-center justify-center text-sm font-bold text-text-muted pointer-events-none">
          Carregando mapa...
        </div>
      )}

      {mapaVazio && !carregando && (
        <div className="absolute inset-0 z-[990] flex flex-col items-center justify-center p-6 text-center animate-fadeIn pointer-events-none">
          <div className="bg-surface/95 border border-border-line shadow-xl rounded-2xl p-6 max-w-sm backdrop-blur-sm">
            <MapPin size={32} className="text-text-muted mx-auto mb-3 opacity-50" />
            <p className="text-text-base font-bold mb-2">Nenhuma barbearia neste raio</p>
            <p className="text-sm text-text-muted">
              Ainda não temos barbearias tão pertinho. Aumente o raio de busca ou confira nossas sugestões em destaque logo acima!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
