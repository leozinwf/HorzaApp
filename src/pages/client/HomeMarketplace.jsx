import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { resolverCoordenadasLista } from '../../utils/endereco';
import { MapPin, Scissors, Search, Star, RefreshCw, WifiOff, Settings2, Minimize2, Maximize2, MapPin as MapPinIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabaseClient';
import MapaInterativo from '../../components/shared/MapaInterativo';
import BotaoRota from '../../components/shared/BotaoRota';
import CarrosselBanners from '../../components/marketplace/CarrosselBanners';
import FiltrosRapidos from '../../components/marketplace/FiltrosRapidos';
import ModalFiltrosMarketplace from '../../components/marketplace/ModalFiltrosMarketplace';
import SaudacaoMarketplace from '../../components/marketplace/SaudacaoMarketplace';
import HorzaFooter from '../../components/layout/HorzaFooter';
import { aplicarFiltroRapido } from '../../utils/marketplaceFiltros';

const CAMPOS = 'id, nome, slug, cidade, bairro, rua, numero, estado, cep, latitude, longitude, logo_url, capa_url, hora_abertura, hora_fechamento, dias_funcionamento, tem_estacionamento';
const LOADING_TIMEOUT_MS = 12000;
const GEO_TIMEOUT_MS = 6000;

// Função para calcular distância com fórmula de Haversine
function calcularDistanciaKm(lat1, lon1, lat2, lon2) {
  const la1 = Number(lat1);
  const lo1 = Number(lon1);
  const la2 = Number(lat2);
  const lo2 = Number(lon2);
  if (!Number.isFinite(la1) || !Number.isFinite(lo1) || !Number.isFinite(la2) || !Number.isFinite(lo2)) return null;
  const R = 6371; // Raio da Terra em km
  const dLat = (la2 - la1) * Math.PI / 180;
  const dLon = (lo2 - lo1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(la1 * Math.PI / 180) * Math.cos(la2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

const barbeariasNoRaio = (lista, raio) =>
  lista.filter((b) => b.distancia_km != null && b.distancia_km <= raio + 0.001);

const normalizarBarbeariaCoords = (b, latUsuario, lngUsuario) => {
  const lat = Number(b.lat ?? b.latitude);
  const lng = Number(b.lng ?? b.longitude);
  const distancia = calcularDistanciaKm(latUsuario, lngUsuario, lat, lng);
  return {
    ...b,
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
    distancia_km: distancia,
  };
};

const ordenarBarbearias = (lista) =>
  [...lista].sort((a, b) => {
    const aPro = a.plan_slug === 'pro' || a.plan_slug === 'plus';
    const bPro = b.plan_slug === 'pro' || b.plan_slug === 'plus';
    if (aPro && !bPro) return -1;
    if (bPro && !aPro) return 1;
    if (a.distancia_km != null && b.distancia_km != null) return a.distancia_km - b.distancia_km;
    return (a.nome || '').localeCompare(b.nome || '', 'pt-BR');
  });

async function enriquecerComPlanos(lista) {
  if (!lista?.length) return lista;
  const ids = lista.map((b) => b.id);
  const { data: planos } = await supabase
    .from('barbearia_plano_atual')
    .select('barbearia_id, plan_slug, marketplace_premium')
    .in('barbearia_id', ids);

  const mapaPlanos = new Map((planos || []).map((p) => [p.barbearia_id, p]));
  return lista.map((b) => ({
    ...b,
    plan_slug: mapaPlanos.get(b.id)?.plan_slug || 'free',
    marketplace_premium: mapaPlanos.get(b.id)?.marketplace_premium ?? false,
  }));
}

async function buscarCatalogoAprovado() {
  const { data, error } = await supabase
    .from('barbearias')
    .select(CAMPOS)
    .not('slug', 'is', null)
    .eq('status', 'aprovada')
    .order('criado_em', { ascending: false });

  if (error) throw error;
  return enriquecerComPlanos(data || []);
}

function mesclarComDistancias(catalogo, proximas = []) {
  const mapa = new Map(catalogo.map((b) => [b.id, { ...b }]));
  proximas.forEach((b) => {
    const atual = mapa.get(b.id) || {};
    mapa.set(b.id, { ...atual, ...b, distancia_km: b.distancia_km ?? atual.distancia_km });
  });
  return ordenarBarbearias([...mapa.values()]);
}

function LoadingBarbearias() {
  return (
    <div className="bg-surface border border-border-line rounded-3xl p-10 text-center space-y-5">
      <div className="relative mx-auto h-16 w-16">
        <div className="absolute inset-0 rounded-full border-4 border-brand/20" />
        <div className="absolute inset-0 rounded-full border-4 border-brand border-t-transparent animate-spin" />
        <Scissors size={22} className="absolute inset-0 m-auto text-brand" />
      </div>
      <div>
        <p className="font-black text-text-base">Carregando barbearias...</p>
        <p className="text-sm text-text-muted mt-1">Buscando as melhores opções perto de você</p>
      </div>
      <div className="flex justify-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2 w-2 rounded-full bg-brand animate-pulse"
            style={{ animationDelay: `${i * 200}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

export default function HomeMarketplace() {
  const { profile } = useAuth();
  const [barbearias, setBarbearias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [erroCarregamento, setErroCarregamento] = useState(false);
  const [busca, setBusca] = useState('');
  const [raioKm, setRaioKm] = useState(2.8);
  const [filtroRapido, setFiltroRapido] = useState(null);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [mapaMinimizado, setMapaMinimizado] = useState(false);
  const [localizacao, setLocalizacao] = useState(null);
  const [geoPronto, setGeoPronto] = useState(false);
  const [destaqueMapa, setDestaqueMapa] = useState(null);
  const [barbeariaParaCentralizar, setBarbeariaParaCentralizar] = useState(null);
  const fetchIdRef = useRef(0);

  const fetchBarbearias = useCallback(async (lat, lng, query = '', manterLista = false) => {
    const fetchId = ++fetchIdRef.current;
    if (!manterLista) {
      setLoading(true);
      setLoadingTimeout(false);
      setErroCarregamento(false);
    }

    try {
      if (query.trim() !== '') {
        const { data, error } = await supabase
          .from('barbearias')
          .select(CAMPOS)
          .not('slug', 'is', null)
          .eq('status', 'aprovada')
          .or(`nome.ilike.%${query}%,cidade.ilike.%${query}%,bairro.ilike.%${query}%`)
          .limit(20);
        if (error) throw error;
        
        const comPlanos = await enriquecerComPlanos(data || []);
        const comCoordenadas = await resolverCoordenadasLista(comPlanos);
        const comDistancia = comCoordenadas.map((b) => normalizarBarbeariaCoords(b, lat, lng));

        if (fetchId !== fetchIdRef.current) return;
        setBarbearias(ordenarBarbearias(comDistancia));
        setErroCarregamento(false);
        return;
      }

      const catalogoBruto = await buscarCatalogoAprovado();
      const catalogoComCoordenadas = await resolverCoordenadasLista(catalogoBruto);
      
      const catalogoComDistancia = catalogoComCoordenadas.map((b) => normalizarBarbeariaCoords(b, lat, lng));

      if (fetchId !== fetchIdRef.current) return;
      setBarbearias(ordenarBarbearias(catalogoComDistancia));
      setErroCarregamento(false);
    } catch {
      if (fetchId !== fetchIdRef.current) return;
      setBarbearias([]);
      setErroCarregamento(true);
    } finally {
      if (fetchId === fetchIdRef.current) {
        setLoading(false);
        setLoadingTimeout(false);
      }
    }
  }, []);

  useEffect(() => {
    const geoTimer = setTimeout(() => setGeoPronto(true), GEO_TIMEOUT_MS);

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          clearTimeout(geoTimer);
          setLocalizacao({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setGeoPronto(true);
        },
        () => {
          clearTimeout(geoTimer);
          setGeoPronto(true);
        },
        { timeout: GEO_TIMEOUT_MS, maximumAge: 60000 }
      );
    } else {
      clearTimeout(geoTimer);
      setGeoPronto(true);
    }

    return () => clearTimeout(geoTimer);
  }, []);

  useEffect(() => {
    if (!geoPronto) return;
    const timer = setTimeout(
      () => fetchBarbearias(localizacao?.lat, localizacao?.lng, busca, busca !== '' && barbearias.length > 0),
      busca ? 400 : 0
    );
    return () => clearTimeout(timer);
  }, [geoPronto, busca, localizacao, raioKm, fetchBarbearias]);

  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => setLoadingTimeout(true), LOADING_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [loading]);

  const recarregar = () => {
    setLoadingTimeout(false);
    fetchBarbearias(localizacao?.lat, localizacao?.lng, busca);
  };

  const scrollToMap = (b, e) => {
    e.preventDefault();

    if (b.distancia_km != null && b.distancia_km > raioKm) {
      let novoRaio = Math.ceil(b.distancia_km * 10) / 10;
      if (novoRaio > 15) novoRaio = 15;
      setRaioKm(novoRaio);
    }

    setDestaqueMapa(b);
    setBarbeariaParaCentralizar({ ...b, _ts: Date.now() });

    window.setTimeout(() => {
      const mapElement = document.getElementById('mapa-section');
      if (mapElement) {
        mapElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 80);
  };

  const aguardandoGeo = !geoPronto;
  const carregandoInicial = aguardandoGeo || (loading && barbearias.length === 0);

  const barbeariasProcessadas = useMemo(() => {
    if (!filtroRapido) return ordenarBarbearias(barbearias);
    return aplicarFiltroRapido(barbearias, filtroRapido);
  }, [barbearias, filtroRapido]);

  const barbeariasVitrine = useMemo(
    () => barbeariasProcessadas.slice(0, 8),
    [barbeariasProcessadas]
  );

  const barbeariasMapa = useMemo(
    () => barbeariasNoRaio(barbeariasProcessadas, raioKm),
    [barbeariasProcessadas, raioKm]
  );

  const handleSelecionarMapa = useCallback((b) => {
    setDestaqueMapa(b);
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 w-full min-w-0 flex flex-col items-center pt-10 px-6 pb-6">
        <div className="w-full max-w-4xl min-w-0 space-y-5">
          <SaudacaoMarketplace profile={profile} temLocalizacao={!!localizacao} />

        <div className="bg-surface border border-border-line rounded-2xl flex flex-col shadow-sm focus-within:border-brand transition-colors overflow-hidden">
          <div className="flex items-center p-2">
            <Search className="text-text-muted ml-3 shrink-0" size={20} />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, cidade ou bairro..."
              className="w-full bg-transparent p-3 outline-none text-text-base placeholder-text-muted"
            />
          </div>
        </div>

        <CarrosselBanners />

        <FiltrosRapidos
          filtroAtivo={filtroRapido}
          onFiltroChange={setFiltroRapido}
          onAbrirFiltros={() => setMostrarFiltros(true)}
          painelAberto={mostrarFiltros}
        />

        <ModalFiltrosMarketplace
          aberto={mostrarFiltros}
          onFechar={() => setMostrarFiltros(false)}
          raioKm={raioKm}
          onRaioChange={setRaioKm}
          filtroAtivo={filtroRapido}
          onFiltroChange={setFiltroRapido}
          onLimpar={() => {
            setFiltroRapido(null);
            setRaioKm(2.8);
          }}
        />

        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-text-muted uppercase tracking-wider">
              {busca ? 'Resultados' : 'Em Destaque'}
            </h3>
            {loading && barbearias.length > 0 && (
              <span className="text-xs text-brand font-bold animate-pulse">Atualizando...</span>
            )}
          </div>

          {carregandoInicial && !loadingTimeout ? (
            <LoadingBarbearias />
          ) : loadingTimeout && loading ? (
            <div className="bg-surface border border-amber-500/30 rounded-3xl p-8 text-center space-y-4">
              <div className="mx-auto h-14 w-14 rounded-full bg-amber-500/10 flex items-center justify-center text-warning">
                <WifiOff size={26} />
              </div>
              <div>
                <p className="font-black text-text-base">Demorou mais que o esperado</p>
                <p className="text-sm text-text-muted mt-1">
                  Pode ser instabilidade na internet ou no servidor. Tente recarregar as barbearias.
                </p>
              </div>
              <button
                type="button"
                onClick={recarregar}
                className="inline-flex items-center gap-2 bg-brand text-white px-6 py-3 rounded-xl text-sm font-black hover:brightness-110 cursor-pointer"
              >
                <RefreshCw size={16} /> Recarregar barbearias
              </button>
            </div>
          ) : erroCarregamento && barbearias.length === 0 ? (
            <div className="bg-surface border border-dashed border-border-line p-8 rounded-2xl text-center space-y-4">
              <p className="font-bold text-text-muted">Não foi possível carregar as barbearias.</p>
              <button
                type="button"
                onClick={recarregar}
                className="inline-flex items-center gap-2 bg-brand text-white px-5 py-2.5 rounded-xl text-sm font-black cursor-pointer"
              >
                <RefreshCw size={16} /> Tentar novamente
              </button>
            </div>
          ) : barbearias.length === 0 ? (
            <div className="bg-surface border border-dashed border-border-line p-8 rounded-2xl text-center">
              <p className="font-bold text-text-muted">Nenhuma barbearia encontrada.</p>
            </div>
          ) : barbeariasVitrine.length === 0 ? (
            <div className="bg-surface border border-dashed border-border-line p-8 rounded-2xl text-center space-y-3">
              <p className="font-bold text-text-muted">Nenhuma barbearia corresponde ao filtro selecionado.</p>
              <button
                type="button"
                onClick={() => setFiltroRapido(null)}
                className="text-sm font-bold text-brand hover:underline cursor-pointer"
              >
                Limpar filtro
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {barbeariasVitrine.map((b) => (
                <div
                  key={b.id}
                  onMouseEnter={() => setDestaqueMapa(b)}
                  onMouseLeave={() => setDestaqueMapa(null)}
                  onFocus={() => setDestaqueMapa(b)}
                  onBlur={() => setDestaqueMapa(null)}
                  className="bg-surface rounded-2xl border border-border-line hover:border-brand/50 hover:shadow-md transition-all group flex flex-col sm:flex-row relative z-10 hover:z-50 focus-within:z-50"
                >
                  <a href={`/${b.slug}`} onClick={(e) => scrollToMap(b, e)} className="absolute inset-0 z-0" aria-label={`Ver barbearia ${b.nome} no mapa`} />
                  
                  <div className="w-full sm:w-28 shrink-0 bg-background h-32 sm:h-auto relative z-0 pointer-events-none overflow-hidden rounded-t-2xl sm:rounded-tr-none sm:rounded-l-2xl">
                    {(b.capa_url || b.logo_url) ? (
                      <img src={b.capa_url || b.logo_url} alt={b.nome} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-brand/10 text-brand">
                        <Scissors size={28} />
                      </div>
                    )}
                  </div>
                  
                  <div className="p-4 flex-1 min-w-0 flex flex-col justify-between z-10 pointer-events-none">
                    <div>
                      <div className="flex items-start gap-1">
                        {(b.plan_slug === 'pro' || b.plan_slug === 'plus') && (
                          <Star size={14} className="text-amber-500 shrink-0 mt-0.5 fill-amber-500" title="Horza Pro" />
                        )}
                        <h2 className="text-base font-black text-text-base group-hover:text-brand truncate">{b.nome}</h2>
                      </div>
                      
                      <div className="text-xs text-text-muted mt-1.5 flex items-start gap-1.5">
                        <MapPin size={12} className="shrink-0 mt-0.5" />
                        <span className="line-clamp-2 leading-relaxed">
                          {[b.rua, b.numero].filter(Boolean).join(', ') || 'S/N'}
                          <br />
                          {b.bairro ? `${b.bairro}, ` : ''}{b.cidade || '—'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between gap-3 mt-4 pointer-events-auto">
                      {b.distancia_km != null ? (
                        <span className="inline-block text-[10px] font-bold text-brand bg-brand/10 px-2.5 py-1 rounded-md">
                          {b.distancia_km < 1 ? `${Math.round(b.distancia_km * 1000)} m de você` : `${Number(b.distancia_km).toFixed(1)} km de você`}
                        </span>
                      ) : <span />}
                      
                      <div className="flex gap-2">
                        <BotaoRota barbearia={b} compacto={true} />
                        <Link to={`/${b.slug}`} className="bg-brand text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:brightness-110">
                          Agendar
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {!carregandoInicial && (
          <div id="mapa-section" className="space-y-4 transition-all scroll-mt-24">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="text-sm font-black text-text-muted uppercase tracking-wider flex items-center gap-2 whitespace-nowrap">
                <MapPin size={16} className="text-brand" /> Mapa — barbearias próximas
              </h3>
              
              {!mapaMinimizado && (
                <div className="flex-1 w-full max-w-sm flex items-center gap-4 bg-surface px-4 py-2 rounded-xl border border-border-line">
                  <div className="relative flex-1 flex items-center gap-3">
                    <span className="text-[10px] font-bold text-text-muted">100m</span>
                    <div className="relative flex-1 pt-1 flex items-center">
                       <input
                        type="range"
                        min="0.1"
                        max="15"
                        step="0.1"
                        value={raioKm}
                        onChange={(e) => setRaioKm(parseFloat(e.target.value))}
                        className="w-full accent-brand cursor-pointer h-1.5 bg-border-line rounded-lg appearance-none"
                      />
                    </div>
                    <span className="text-[10px] font-bold text-text-muted">15km</span>
                  </div>
                  <div className="text-[10px] font-black text-brand bg-brand/10 px-2 py-1 rounded-md whitespace-nowrap">
                    {raioKm < 1 ? `${Math.round(raioKm * 1000)}m` : `${Number(raioKm).toFixed(1)}km`}
                  </div>
                </div>
              )}

              <button
                onClick={() => setMapaMinimizado(!mapaMinimizado)}
                className="text-text-muted hover:text-text-base p-2 rounded-lg transition-colors cursor-pointer shrink-0"
                title={mapaMinimizado ? "Expandir mapa" : "Minimizar mapa"}
              >
                {mapaMinimizado ? <Maximize2 size={18} /> : <Minimize2 size={18} />}
              </button>
            </div>

            {!mapaMinimizado && (
              <>
                <div className="animate-fadeIn">
                  <MapaInterativo
                    barbearias={barbeariasMapa}
                    localizacaoUsuario={localizacao}
                    onSelecionar={handleSelecionarMapa}
                    raioKm={raioKm}
                    hoveredBarbeariaId={destaqueMapa?.id}
                    barbeariaParaCentralizar={barbeariaParaCentralizar}
                    estiloMapa="limpo"
                  />
                </div>
              </>
            )}
          </div>
        )}
      </div>
      </div>
      <HorzaFooter />
    </div>
  );
}
