import { useEffect, useRef, useState } from 'react';

import { Link } from 'react-router-dom';

import L from 'leaflet';

import 'leaflet/dist/leaflet.css';

import { Crosshair, CalendarDays } from 'lucide-react';

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



const iconeUsuario = L.divIcon({

  className: '',

  html: '<div style="width:16px;height:16px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,.35)"></div>',

  iconSize: [16, 16],

  iconAnchor: [8, 8],

});



const criarCirculoRaio = (map, lat, lng, raioKm) => {

  const raioMetros = raioKm * 1000;

  const circle = L.circle([lat, lng], {

    radius: raioMetros,

    color: '#3b82f6',

    fillColor: '#3b82f6',

    fillOpacity: 0.07,

    weight: 2,

    dashArray: '6 4',

  }).addTo(map);



  map.fitBounds(circle.getBounds(), { padding: [24, 24], maxZoom: 15 });

  return circle;

};



export default function MapaInterativo({

  barbearias = [],

  localizacaoUsuario = null,

  altura = '420px',

  onSelecionar = null,

  raioKm = 2.5,

  centroPreferido = null,

}) {

  const containerRef = useRef(null);

  const mapRef = useRef(null);

  const markersRef = useRef([]);

  const userMarkerRef = useRef(null);

  const circleRef = useRef(null);

  const [selecionada, setSelecionada] = useState(null);

  const [pontos, setPontos] = useState([]);

  const [carregando, setCarregando] = useState(true);



  const aplicarRaioNoMapa = (map, lat, lng) => {

    if (circleRef.current) {

      circleRef.current.remove();

      circleRef.current = null;

    }

    if (lat != null && lng != null) {

      circleRef.current = criarCirculoRaio(map, lat, lng, raioKm);

    }

  };



  useEffect(() => {

    let ativo = true;

    const carregar = async () => {

      setCarregando(true);

      const resolvidos = await resolverCoordenadasLista(barbearias);

      if (ativo) {

        setPontos(resolvidos);

        setCarregando(false);

      }

    };

    carregar();

    return () => { ativo = false; };

  }, [barbearias]);



  useEffect(() => {

    if (!containerRef.current || mapRef.current) return;



    const centroInicial = centroPreferido

      ? [centroPreferido.lat, centroPreferido.lng]

      : localizacaoUsuario

        ? [localizacaoUsuario.lat, localizacaoUsuario.lng]

        : [-23.5505, -46.6333];



    mapRef.current = L.map(containerRef.current, { zoomControl: true }).setView(centroInicial, 12);



    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {

      attribution: '&copy; OpenStreetMap',

      maxZoom: 19,

    }).addTo(mapRef.current);



    const lat = centroPreferido?.lat ?? localizacaoUsuario?.lat;

    const lng = centroPreferido?.lng ?? localizacaoUsuario?.lng;

    if (lat != null && lng != null) {

      aplicarRaioNoMapa(mapRef.current, lat, lng);

    }



    return () => {

      mapRef.current?.remove();

      mapRef.current = null;

      userMarkerRef.current = null;

      circleRef.current = null;

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

    if (!mapRef.current) return;



    markersRef.current.forEach((m) => m.remove());

    markersRef.current = [];



    pontos.forEach((b) => {

      const marker = L.marker([b.lat, b.lng]).addTo(mapRef.current);

      marker.on('click', () => {

        setSelecionada(b);

        onSelecionar?.(b);

        mapRef.current.panTo([b.lat, b.lng], { animate: true });

      });

      markersRef.current.push(marker);

    });



    if (pontos.length > 0 && !localizacaoUsuario && !centroPreferido) {

      const group = L.featureGroup(markersRef.current);

      mapRef.current.fitBounds(group.getBounds().pad(0.2));

    }

  }, [pontos, onSelecionar, localizacaoUsuario, centroPreferido]);



  useEffect(() => {

    if (!mapRef.current || !localizacaoUsuario) return;



    if (userMarkerRef.current) {

      userMarkerRef.current.setLatLng([localizacaoUsuario.lat, localizacaoUsuario.lng]);

    } else {

      userMarkerRef.current = L.marker([localizacaoUsuario.lat, localizacaoUsuario.lng], { icon: iconeUsuario })

        .addTo(mapRef.current)

        .bindPopup('Você está aqui');

    }

  }, [localizacaoUsuario]);



  const centralizarEmMim = () => {

    if (!mapRef.current) return;

    const lat = localizacaoUsuario?.lat ?? centroPreferido?.lat;

    const lng = localizacaoUsuario?.lng ?? centroPreferido?.lng;

    if (lat == null || lng == null) return;

    aplicarRaioNoMapa(mapRef.current, lat, lng);

  };



  return (

    <div className="relative rounded-3xl overflow-hidden border border-border-line shadow-sm">

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

        <div className="absolute inset-0 z-[999] bg-background/70 flex items-center justify-center text-sm font-bold text-text-muted">

          Carregando mapa...

        </div>

      )}



      {selecionada && (

        <div className="absolute bottom-3 left-3 right-3 z-[1000] bg-surface border border-border-line rounded-2xl p-4 shadow-xl animate-fadeIn">

          <div className="flex items-start justify-between gap-3">

            <div className="min-w-0">

              <p className="font-black text-text-base truncate">{selecionada.nome}</p>

              <p className="text-xs text-text-muted mt-0.5 truncate">

                {selecionada.bairro ? `${selecionada.bairro}, ` : ''}{selecionada.cidade}

              </p>

              {selecionada.distancia_km != null && (

                <p className="text-[10px] font-bold text-brand mt-1">A {Number(selecionada.distancia_km).toFixed(1)} km</p>

              )}

            </div>

            <Link

              to={`/${selecionada.slug}`}

              className="shrink-0 bg-brand text-white px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 hover:brightness-110"

            >

              <CalendarDays size={14} /> Agendar

            </Link>

          </div>

        </div>

      )}

    </div>

  );

}


