import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Scissors, Search } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';

export default function HomeMarketplace() {
  const [barbearias, setBarbearias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [localizacao, setLocalizacao] = useState(null);

  // Função centralizada para buscar barbearias (com ou sem localização)
  const fetchBarbearias = async (lat, lng, query = '') => {
    setLoading(true);
    try {
      if (query.trim() !== '') {
        // 1. Se o usuário estiver pesquisando algo, busca no banco por nome, cidade ou bairro
        const { data, error } = await supabase
          .from('barbearias')
          .select('id, nome, slug, cidade, bairro')
          .not('slug', 'is', null)
          .or(`nome.ilike.%${query}%,cidade.ilike.%${query}%,bairro.ilike.%${query}%`)
          .limit(10);
        
        if (error) throw error;
        setBarbearias(data || []);
      } else if (lat && lng) {
        // 2. Se tem localização e não tem pesquisa, usa a função RPC
        // Utilizando parseFloat para garantir que o PostgREST do Supabase receba o tipo correto
        const { data, error } = await supabase.rpc('buscar_barbearias_proximas', {
          user_lat: parseFloat(lat),
          user_lon: parseFloat(lng),
          distancia_maxima_km: 50.0
        });
        
        if (error) {
          console.warn("Aviso: Função RPC falhou, ativando fallback automático.", error);
          throw error; // Força a execução do bloco catch (Fallback)
        }
        setBarbearias(data || []);
      } else {
        // 3. Força o fallback se a permissão foi negada
        throw new Error("Localização não fornecida");
      }
    } catch (error) {
      // 🚨 FALLBACK DE SEGURANÇA: Se a pessoa negar a localização ou a RPC falhar, 
      // mostramos as 6 barbearias mais recentes (Ótimo para dar destaque a novas unidades)
      const { data } = await supabase
        .from('barbearias')
        .select('id, nome, slug, cidade, bairro')
        .not('slug', 'is', null)
        .order('criado_em', { ascending: false })
        .limit(6);
        
      setBarbearias(data || []);
    } finally {
      setLoading(false);
    }
  };

  // Pede localização apenas uma vez ao abrir o App
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setLocalizacao({ lat, lng });
          fetchBarbearias(lat, lng, busca);
        },
        () => {
          // Permissão negada pelo usuário
          fetchBarbearias(null, null, busca);
        }
      );
    } else {
      // Navegador não suporta geolocalização
      fetchBarbearias(null, null, busca);
    }
  }, []); // Executa só na montagem

  // Efeito independente para lidar com a barra de pesquisa (Debounce simples)
  useEffect(() => {
    const timerId = setTimeout(() => {
      if (localizacao) {
        fetchBarbearias(localizacao.lat, localizacao.lng, busca);
      } else {
        fetchBarbearias(null, null, busca);
      }
    }, 500); // Espera 500ms após o usuário parar de digitar para consultar o banco

    return () => clearTimeout(timerId);
  }, [busca]); 

  return (
    <div className="min-h-screen bg-background flex flex-col items-center pt-12 px-6 pb-24">
      <div className="w-full max-w-2xl text-center space-y-6">
        <h1 className="text-4xl font-black text-brand">Horza App</h1>
        <p className="text-text-muted font-medium">Encontre as melhores barbearias próximas a você.</p>
        
        {/* Barra de Pesquisa Funcional */}
        <div className="bg-surface border border-border-line rounded-2xl p-2 flex items-center shadow-sm focus-within:border-brand transition-colors">
          <Search className="text-text-muted ml-3" size={20} />
          <input 
            type="text" 
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, cidade ou bairro..." 
            className="w-full bg-transparent p-3 outline-none text-text-base placeholder-text-muted"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-brand border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <div className="text-left mt-8">
            <h3 className="text-sm font-black text-text-muted uppercase tracking-wider mb-4">
              {busca ? 'Resultados da Busca' : localizacao ? 'Barbearias Próximas' : 'Barbearias em Destaque'}
            </h3>
            
            {barbearias.length === 0 ? (
              <div className="bg-surface border border-dashed border-border-line p-8 rounded-2xl text-center">
                <p className="font-bold text-text-muted">Nenhuma barbearia encontrada.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {barbearias.map(b => (
                  <Link 
                    key={b.id} 
                    to={`/${b.slug}`}
                    className="bg-surface p-5 rounded-2xl border border-border-line hover:border-brand/50 transition-colors shadow-xs group" 
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h2 className="text-lg font-black text-text-base group-hover:text-brand">{b.nome}</h2>
                        <p className="text-sm text-text-muted mt-1 flex items-center gap-1">
                          <MapPin size={14} /> {b.bairro}, {b.cidade}
                        </p>
                      </div>
                      <div className="h-10 w-10 bg-brand/10 text-brand rounded-full flex items-center justify-center shrink-0">
                        <Scissors size={18} />
                      </div>
                    </div>
                    {b.distancia_km && (
                      <div className="mt-4 inline-block bg-background border border-border-line px-3 py-1 rounded-lg text-xs font-bold text-text-muted">
                        A {b.distancia_km.toFixed(1)} km de você
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}