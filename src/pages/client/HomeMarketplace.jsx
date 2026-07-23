import { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Scissors, Search, Star, RefreshCw, WifiOff } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import MapaInterativo from '../../components/shared/MapaInterativo';
import BotaoRota from '../../components/shared/BotaoRota';

const CAMPOS = 'id, nome, slug, cidade, bairro, rua, numero, estado, cep, latitude, longitude, logo_url, capa_url, plano_ativo';
const LOADING_TIMEOUT_MS = 12000;
const GEO_TIMEOUT_MS = 6000;

const ordenarBarbearias = (lista) =>
  [...lista].sort((a, b) => {
    if (a.plano_ativo === 'premium' && b.plano_ativo !== 'premium') return -1;
    if (b.plano_ativo === 'premium' && a.plano_ativo !== 'premium') return 1;
    if (a.distancia_km != null && b.distancia_km != null) return a.distancia_km - b.distancia_km;
    return (a.nome || '').localeCompare(b.nome || '', 'pt-BR');
  });

async function buscarCatalogoAprovado() {
  const { data, error } = await supabase
    .from('barbearias')
    .select(CAMPOS)
    .not('slug', 'is', null)
    .neq('status', 'pendente')
    .neq('plano_ativo', 'pendente_aprovacao')
    .order('criado_em', { ascending: false });

  if (error) throw error;
  return data || [];
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
  const [barbearias, setBarbearias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [erroCarregamento, setErroCarregamento] = useState(false);
  const [busca, setBusca] = useState('');
  const [localizacao, setLocalizacao] = useState(null);
  const [geoPronto, setGeoPronto] = useState(false);
  const [destaqueMapa, setDestaqueMapa] = useState(null);
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
          .neq('status', 'pendente')
          .neq('plano_ativo', 'pendente_aprovacao')
          .or(`nome.ilike.%${query}%,cidade.ilike.%${query}%,bairro.ilike.%${query}%`)
          .limit(20);
        if (error) throw error;
        if (fetchId !== fetchIdRef.current) return;
        setBarbearias(ordenarBarbearias(data || []));
        setErroCarregamento(false);
        return;
      }

      const catalogo = await buscarCatalogoAprovado();
      let proximas = [];

      if (lat && lng) {
        const { data, error } = await supabase.rpc('buscar_barbearias_proximas', {
          user_lat: parseFloat(lat),
          user_lon: parseFloat(lng),
          distancia_maxima_km: 50.0,
        });
        if (!error && data?.length) proximas = data;
      }

      if (fetchId !== fetchIdRef.current) return;
      setBarbearias(mesclarComDistancias(catalogo, proximas));
      setErroCarregamento(false);
    } catch {
      if (fetchId !== fetchIdRef.current) return;
      try {
        const fallback = await buscarCatalogoAprovado();
        if (fetchId !== fetchIdRef.current) return;
        setBarbearias(ordenarBarbearias(fallback));
        setErroCarregamento(false);
      } catch {
        if (fetchId !== fetchIdRef.current) return;
        setBarbearias([]);
        setErroCarregamento(true);
      }
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
  }, [geoPronto, busca, localizacao, fetchBarbearias]);

  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => setLoadingTimeout(true), LOADING_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [loading]);

  const recarregar = () => {
    setLoadingTimeout(false);
    fetchBarbearias(localizacao?.lat, localizacao?.lng, busca);
  };

  const aguardandoGeo = !geoPronto;
  const carregandoInicial = aguardandoGeo || (loading && barbearias.length === 0);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center pt-10 px-6 pb-24">
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center space-y-3">
          <h1 className="text-4xl md:text-5xl font-black text-brand tracking-tight">Horza App</h1>
          <p className="text-text-muted font-medium text-lg">Encontre barbearias perto de você e agende online.</p>
        </div>

        <div className="bg-surface border border-border-line rounded-2xl p-2 flex items-center shadow-sm focus-within:border-brand transition-colors">
          <Search className="text-text-muted ml-3 shrink-0" size={20} />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, cidade ou bairro..."
            className="w-full bg-transparent p-3 outline-none text-text-base placeholder-text-muted"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-text-muted uppercase tracking-wider">
              {busca ? 'Resultados' : 'Principais barbearias'}
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
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {barbearias.map((b) => (
                <Link
                  key={b.id}
                  to={`/${b.slug}`}
                  onMouseEnter={() => setDestaqueMapa(b)}
                  onFocus={() => setDestaqueMapa(b)}
                  className="bg-surface rounded-2xl border border-border-line hover:border-brand/50 hover:shadow-md transition-all group overflow-hidden flex"
                >
                  <div className="w-24 sm:w-28 shrink-0 bg-background">
                    {(b.capa_url || b.logo_url) ? (
                      <img src={b.capa_url || b.logo_url} alt={b.nome} className="w-full h-full object-cover min-h-[7rem]" />
                    ) : (
                      <div className="w-full h-full min-h-[7rem] flex items-center justify-center bg-brand/10 text-brand">
                        <Scissors size={28} />
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex items-start gap-1">
                      {b.plano_ativo === 'premium' && <Star size={14} className="text-amber-500 shrink-0 mt-0.5 fill-amber-500" />}
                      <h2 className="text-base font-black text-text-base group-hover:text-brand truncate">{b.nome}</h2>
                    </div>
                    <p className="text-xs text-text-muted mt-1 flex items-center gap-1 truncate">
                      <MapPin size={12} className="shrink-0" />
                      {b.bairro ? `${b.bairro}, ` : ''}{b.cidade || '—'}
                    </p>
                    {b.distancia_km != null && (
                      <span className="mt-2 inline-block text-[10px] font-bold text-brand bg-brand/10 px-2 py-0.5 rounded-md w-fit">
                        {Number(b.distancia_km).toFixed(1)} km
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {!carregandoInicial && (
          <div className="space-y-4">
            <h3 className="text-sm font-black text-text-muted uppercase tracking-wider flex items-center gap-2">
              <MapPin size={16} className="text-brand" /> Mapa — barbearias próximas
            </h3>

            <MapaInterativo
              barbearias={barbearias}
              localizacaoUsuario={localizacao}
              onSelecionar={setDestaqueMapa}
              raioKm={2.5}
            />

            {destaqueMapa && (
              <div className="flex flex-wrap items-center gap-3 bg-surface border border-border-line rounded-2xl p-4">
                <div className="flex-1 min-w-0">
                  <p className="font-black truncate">{destaqueMapa.nome}</p>
                  <p className="text-xs text-text-muted truncate">{destaqueMapa.bairro}, {destaqueMapa.cidade}</p>
                </div>
                <BotaoRota barbearia={destaqueMapa} />
                <Link to={`/${destaqueMapa.slug}`} className="bg-brand text-white px-4 py-2.5 rounded-xl text-xs font-black hover:brightness-110">
                  Ver barbearia
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
