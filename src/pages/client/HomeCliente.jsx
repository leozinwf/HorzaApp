import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useIsMobile } from '../../hooks/useIsMobile';
import { supabase } from '../../services/supabaseClient';
import MapaLocalizacao from '../../components/shared/MapaLocalizacao';
import HorzaFooter from '../../components/layout/HorzaFooter';
import { canManageBarbeariaSlug, canAccessBarbeariaAdmin } from '../../constants/roles';
import {
  Scissors, User, Clock, MapPin, LogOut, Star, CalendarDays,
  ChevronRight, Sparkles, AtSign, Phone, LayoutDashboard
} from 'lucide-react';

const cacheKey = (slug) => `barbearia_home_${slug}`;

export default function HomeCliente({ onOpenLogin }) {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { slug } = useParams();

  const [meusAgendamentos, setMeusAgendamentos] = useState([]);
  const [barbeariaInfo, setBarbeariaInfo] = useState(() => {
    if (!slug) return null;
    try {
      const cached = sessionStorage.getItem(cacheKey(slug));
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [carregandoBarbearia, setCarregandoBarbearia] = useState(!barbeariaInfo && !!slug);

  const isAdminDestaBarbearia =
    barbeariaInfo &&
    canAccessBarbeariaAdmin(user, profile) &&
    canManageBarbeariaSlug(user, profile, barbeariaInfo.id);

  const getIniciais = () => {
    const nome = profile?.nome || user?.user_metadata?.nome;
    if (nome) return nome.substring(0, 2).toUpperCase();
    return user?.email?.substring(0, 2).toUpperCase() || 'U';
  };

  useEffect(() => {
    if (slug) buscarInfoBarbearia();
    if (user) buscarAgendamentosCliente();
  }, [user, slug]);

  const buscarInfoBarbearia = async () => {
    if (!barbeariaInfo) setCarregandoBarbearia(true);
    try {
      let { data, error } = await supabase
        .from('barbearias')
        .select('id, nome, slug, rua, numero, bairro, cidade, estado, cep, telefone, hora_abertura, hora_fechamento, dias_funcionamento, latitude, longitude, widgets, redes_sociais, logo_url, capa_url, cor_primaria, status')
        .eq('slug', slug)
        .maybeSingle();

      if (error && error.code === '42703') {
        const fallback = await supabase
          .from('barbearias')
          .select('id, nome, slug, rua, numero, bairro, cidade, estado, cep, telefone, hora_abertura, hora_fechamento, dias_funcionamento, latitude, longitude, logo_url, capa_url, status')
          .eq('slug', slug)
          .maybeSingle();
        data = fallback.data;
      }

      if (data && data.status === 'aprovada') {
        setBarbeariaInfo(data);
        sessionStorage.setItem(cacheKey(slug), JSON.stringify(data));
        if (data.cor_primaria) {
          document.documentElement.style.setProperty('--brand', data.cor_primaria);
          document.documentElement.style.setProperty('--color-brand', data.cor_primaria);
        }
      } else {
        setBarbeariaInfo(null);
      }
    } catch (err) {
      console.error('Erro ao buscar barbearia:', err);
    } finally {
      setCarregandoBarbearia(false);
    }
  };

  const buscarAgendamentosCliente = async () => {
    try {
      const { data } = await supabase
        .from('agendamentos')
        .select(`id, data_hora, status_atendimento, servicos (nome_servico, preco), barbeiros:usuarios!agendamentos_barbeiro_id_fkey (nome)`)
        .eq('cliente_id', user.id)
        .order('data_hora', { ascending: false })
        .limit(3);
      if (data) setMeusAgendamentos(data);
    } catch (err) {
      console.error(err);
    }
  };

  const formatarDiasFuncionamento = (diasArray) => {
    if (!diasArray?.length) return 'Dias não informados';
    if (diasArray.length === 7) return 'Todos os dias';
    const nomes = { 0: 'Dom', 1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex', 6: 'Sáb' };
    return diasArray.map((d) => nomes[d]).filter(Boolean).join(', ');
  };

  if (!carregandoBarbearia && !barbeariaInfo) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-background p-4 text-center">
        <h1 className="text-xl font-black text-text-base mb-2">Barbearia não encontrada</h1>
        <p className="text-sm text-text-muted mb-6">A página que você tentou acessar não existe ou foi desativada.</p>
        <button
          onClick={() => navigate('/')}
          className="bg-brand text-white px-6 py-3 rounded-xl font-bold hover:brightness-110"
        >
          Voltar ao início
        </button>
      </div>
    );
  }

  if (carregandoBarbearia && !barbeariaInfo) {
    return (
      <div className="min-h-screen bg-background p-6 space-y-4 animate-pulse max-w-5xl mx-auto">
        <div className="h-48 bg-surface rounded-3xl border border-border-line" />
        <div className="h-24 bg-surface rounded-3xl border border-border-line" />
      </div>
    );
  }

  return (
    <div className="flex flex-col text-text-base bg-background min-h-screen">
      {/* HERO com foto */}
      <div className="relative overflow-hidden">
        {(barbeariaInfo?.capa_url || barbeariaInfo?.logo_url) ? (
          <div className="absolute inset-0">
            <img src={barbeariaInfo.capa_url || barbeariaInfo.logo_url} alt="" className="w-full h-full object-cover opacity-40 blur-[1px] scale-105" />
            <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/80 to-background" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-brand/20 via-amber-500/10 to-background" />
        )}

        <div className="relative px-6 pt-10 pb-10 md:pt-14 max-w-5xl mx-auto w-full">
          <div className="flex justify-between items-start gap-4 mb-6">
            <div className="flex items-start gap-4">
              {barbeariaInfo?.logo_url ? (
                <img src={barbeariaInfo.logo_url} alt={barbeariaInfo.nome} className="h-20 w-20 rounded-2xl object-cover border-2 border-white shadow-lg shrink-0" />
              ) : (
                <span className="h-16 w-16 rounded-2xl bg-brand text-white flex items-center justify-center shadow-lg shrink-0">
                  <Scissors size={28} />
                </span>
              )}
              <div>
                <span className="text-text-muted text-xs font-bold uppercase tracking-widest">Barbearia parceira</span>
                <h1 className="text-3xl md:text-4xl font-black text-text-base mt-1">{barbeariaInfo?.nome}</h1>
                {barbeariaInfo?.telefone && (
                  <p className="text-sm text-text-muted mt-2 flex items-center gap-1.5">
                    <Phone size={14} /> {barbeariaInfo.telefone}
                  </p>
                )}
              </div>
            </div>
            <div className="h-12 w-12 rounded-xl bg-surface border border-border-line flex items-center justify-center text-brand font-black">
              {user ? getIniciais() : <User size={22} />}
            </div>
          </div>

          {isAdminDestaBarbearia && (
            <Link
              to={`/${slug}/admin`}
              className="inline-flex items-center gap-2 mb-6 bg-brand text-white px-5 py-3 rounded-xl text-sm font-black shadow-md hover:brightness-110"
            >
              <LayoutDashboard size={18} /> Acessar Painel Admin
            </Link>
          )}

          {user ? (
            <div className="grid grid-cols-3 gap-3">
              {[
                { to: '/area-cliente', icon: Star, label: 'Pontos', value: profile?.saldo_pontos || 0 },
                { to: '/area-cliente', icon: Clock, label: 'Histórico', value: 'Ver' },
                { to: '/area-cliente', icon: User, label: 'Conta', value: 'Perfil' },
              ].map((item) => (
                <Link key={item.to} to={item.to} className="bg-surface/90 backdrop-blur border border-border-line p-3 rounded-2xl flex flex-col items-center gap-1 hover:border-brand">
                  <item.icon size={18} className="text-brand" />
                  <span className="text-[10px] font-black uppercase text-text-muted">{item.label}</span>
                  <span className="text-xs font-bold">{item.value}</span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-brand text-white p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
              <div>
                <p className="font-black text-lg">Entre e acumule pontos</p>
                <p className="text-sm opacity-90">Prêmios exclusivos para clientes fiéis.</p>
              </div>
              <button onClick={onOpenLogin} className="bg-white text-brand px-6 py-3 rounded-xl text-sm font-black cursor-pointer">
                Entrar / Cadastrar
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="w-full max-w-5xl mx-auto px-5 space-y-8 pb-6">
        {barbeariaInfo && slug && (
          <Link
            to={`/${slug}/agendar`}
            className="block bg-gradient-to-r from-brand to-amber-500 p-6 md:p-8 rounded-[2rem] text-white shadow-xl hover:brightness-105 transition-all group"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Agendamento online</span>
                <h2 className="text-2xl md:text-3xl font-black mt-1">Reserve seu horário</h2>
              </div>
              <div className="flex items-center gap-2 bg-white/20 px-5 py-3 rounded-2xl font-black text-sm w-fit">
                Agendar <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-6">
            {barbeariaInfo && (
              <div className="bg-surface border border-border-line rounded-3xl p-6 shadow-sm">
                <h3 className="text-xs font-black text-text-muted uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Clock size={16} className="text-brand" /> Horário
                </h3>
                <p className="font-bold">{formatarDiasFuncionamento(barbeariaInfo.dias_funcionamento)}</p>
                <p className="text-sm text-text-muted mt-1">
                  Das {barbeariaInfo.hora_abertura?.substring(0, 5) || '09:00'} às {barbeariaInfo.hora_fechamento?.substring(0, 5) || '19:00'}
                </p>
              </div>
            )}

            <div className="bg-surface border border-border-line rounded-3xl p-6 shadow-sm">
              <h3 className="text-xs font-black text-text-muted uppercase tracking-widest mb-4 flex items-center gap-2">
                <CalendarDays size={16} className="text-brand" /> Próximos atendimentos
              </h3>
              {!user ? (
                <p className="text-sm text-text-muted">Faça login para ver sua agenda.</p>
              ) : meusAgendamentos.length === 0 ? (
                <p className="text-sm text-text-muted">Nenhum agendamento pendente.</p>
              ) : (
                <div className="space-y-3">
                  {meusAgendamentos.map((ag) => (
                    <div key={ag.id} className="flex items-center gap-4 p-4 bg-background rounded-2xl border border-border-line">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold truncate">{ag.servicos?.nome_servico}</p>
                        <p className="text-xs text-text-muted">
                          {new Date(ag.data_hora).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {barbeariaInfo?.widgets?.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-black text-text-muted uppercase tracking-widest flex items-center gap-2">
                  <Sparkles size={16} className="text-brand" /> Novidades
                </h3>
                {barbeariaInfo.widgets.map((widget, idx) => (
                  <div key={idx} className="bg-surface border border-border-line rounded-2xl p-5 text-sm">
                    {widget.type === 'texto' && <div className="whitespace-pre-wrap">{widget.content}</div>}
                    {widget.type === 'social' && (
                      <a href={widget.content} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 font-bold">
                        <AtSign className="text-pink-500" /> Redes sociais
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-2">
            {barbeariaInfo && (
              <div className="bg-surface border border-border-line rounded-3xl p-6 shadow-sm sticky top-24 space-y-4">
                <h3 className="text-xs font-black text-text-muted uppercase tracking-widest flex items-center gap-2">
                  <MapPin size={16} className="text-brand" /> Localização
                </h3>
                <MapaLocalizacao barbearia={barbeariaInfo} />
              </div>
            )}
          </div>
        </div>

        {user && isMobile && (
          <button onClick={() => logout().then(() => navigate('/'))} className="w-full bg-red-500/5 p-4 rounded-2xl border border-red-500/20 text-red-500 font-bold flex justify-center gap-2">
            <LogOut size={18} /> Sair
          </button>
        )}
      </div>
      <HorzaFooter />
    </div>
  );
}
