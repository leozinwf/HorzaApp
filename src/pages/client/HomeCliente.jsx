import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useIsMobile } from '../../hooks/useIsMobile';
import { supabase } from '../../services/supabaseClient';
import { 
  Scissors, User, Clock, MapPin, LogOut, Star, CalendarDays, 
  ChevronRight, Sparkles, Sun, BookOpen, PartyPopper, Heart, Tag, Gift, Search, Video, AtSign, Image as ImageIcon 
} from 'lucide-react';

export default function HomeCliente({ onOpenLogin }) {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { slug } = useParams();
  
  const [meusAgendamentos, setMeusAgendamentos] = useState([]);
  const [loadingAgendamentos, setLoadingAgendamentos] = useState(false);
  const [barbeariaInfo, setBarbeariaInfo] = useState(null);
  const [loadingBarbearia, setLoadingBarbearia] = useState(true);

  const getIniciais = () => {
    const nome = profile?.nome || user?.user_metadata?.nome;
    if (nome) return nome.substring(0, 2).toUpperCase();
    return user?.email?.substring(0, 2).toUpperCase() || 'U';
  };

  useEffect(() => {
    if (slug) buscarInfoBarbearia();
    else setLoadingBarbearia(false);
    
    if (user) buscarAgendamentosCliente();
  }, [user, slug]);

  const buscarInfoBarbearia = async () => {
    try {
      const { data, error } = await supabase
        .from('barbearias')
        .select('id, nome, slug, rua, numero, bairro, cidade, estado, hora_abertura, hora_fechamento, dias_funcionamento, widgets') // ✨ Adicionado Widgets
        .eq('slug', slug)
        .maybeSingle();

      if (error) throw error;
      if (data) setBarbeariaInfo(data);
    } catch (err) {
      console.error('Erro ao buscar barbearia:', err);
    } finally {
      setLoadingBarbearia(false);
    }
  };

  const buscarAgendamentosCliente = async () => {
    setLoadingAgendamentos(true);
    try {
      const { data } = await supabase
        .from('agendamentos')
        .select(`id, data_hora, status_atendimento, servicos (nome_servico, preco), barbeiros:usuarios!agendamentos_barbeiro_id_fkey (nome)`)
        .eq('cliente_id', user.id)
        .order('data_hora', { ascending: false })
        .limit(2);
      if (data) setMeusAgendamentos(data);
    } catch (err) { console.error(err); } finally { setLoadingAgendamentos(false); }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const formatarDiasFuncionamento = (diasArray) => {
    if (!diasArray || diasArray.length === 0) return 'Dias não informados';
    if (diasArray.length === 7) return 'Todos os dias';
    if (diasArray.length === 6 && diasArray.includes(1) && diasArray.includes(6)) return 'Segunda a Sábado';
    if (diasArray.length === 5 && diasArray.includes(1) && !diasArray.includes(6) && !diasArray.includes(0)) return 'Segunda a Sexta';
    const nomes = { 0: 'Dom', 1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex', 6: 'Sáb', 7: 'Dom' };
    return diasArray.map(d => nomes[d]).filter(Boolean).join(', ');
  };

  if (loadingBarbearia) return <div className="flex h-screen items-center justify-center bg-background"><div className="animate-spin h-8 w-8 border-4 border-brand border-t-transparent rounded-full"></div></div>;

  return (
    <div className="flex flex-col text-text-base bg-background min-h-screen pb-24">
      {/* HEADER */}
      <div className="bg-surface border-b border-border-line px-6 pt-10 pb-8 rounded-b-[2.5rem] shadow-xs md:rounded-3xl md:max-w-5xl md:mx-auto md:w-full md:mt-6 md:border">
        <div className="flex justify-between items-center mb-8">
          <div>
            <span className="text-text-muted text-xs font-bold uppercase tracking-wider block mb-1">Bem-vindo {barbeariaInfo ? 'à' : 'ao'}</span>
            <h1 className="text-3xl font-black text-brand flex items-center gap-2">
              <Scissors size={28} className="animate-pulse" /> {barbeariaInfo ? barbeariaInfo.nome : 'Horza App'}
            </h1>
          </div>
          <div className="h-14 w-14 rounded-full bg-brand/10 border-2 border-brand flex items-center justify-center text-brand font-bold shadow-xs">
            {user ? getIniciais() : <User size={24} />}
          </div>
        </div>

        {user ? (
          <div className="grid grid-cols-3 gap-3">
            <Link to="/area-cliente?tab=fidelidade" className="bg-background border border-border-line p-3 rounded-2xl flex flex-col items-center justify-center gap-1 hover:border-brand transition-colors group">
              <Star size={20} className="text-amber-500 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-black uppercase text-text-muted mt-1">Pontos</span>
              <span className="text-xs font-bold text-text-base">{profile?.saldo_pontos || 0}</span>
            </Link>
            <Link to="/area-cliente?tab=agendamentos" className="bg-background border border-border-line p-3 rounded-2xl flex flex-col items-center justify-center gap-1 hover:border-brand transition-colors group">
              <Clock size={20} className="text-blue-500 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-black uppercase text-text-muted mt-1">Histórico</span>
              <span className="text-xs font-bold text-text-base">Ver Tudo</span>
            </Link>
            <Link to="/area-cliente?tab=perfil" className="bg-background border border-border-line p-3 rounded-2xl flex flex-col items-center justify-center gap-1 hover:border-brand transition-colors group">
              <User size={20} className="text-brand group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-black uppercase text-text-muted mt-1">Sua Conta</span>
              <span className="text-xs font-bold text-text-base">Perfil</span>
            </Link>
          </div>
        ) : (
          <div className="bg-brand text-white p-5 rounded-2xl flex items-center justify-between shadow-md">
            <div><p className="font-bold text-base">Faça parte do clube!</p><p className="text-xs opacity-90 mt-0.5">Acumule pontos e ganhe prêmios.</p></div>
            <button onClick={onOpenLogin} className="bg-white text-brand text-xs font-black px-6 py-3 rounded-xl shadow-xs hover:bg-opacity-90 transition-all cursor-pointer">Entrar</button>
          </div>
        )}
      </div>

      <div className="w-full max-w-5xl mx-auto px-5 mt-6 space-y-8">
        
        {/* BOTÃO AGENDAR */}
        {barbeariaInfo && slug ? (
          <div className="bg-gradient-to-r from-brand to-amber-600 p-0.5 rounded-[2rem] shadow-lg">
            <Link to={`/${slug}/agendar`} className="block bg-surface p-8 rounded-[30px] relative overflow-hidden group hover:brightness-95 transition-all">
              <div className="relative z-10 flex flex-col justify-between h-full md:flex-row md:items-center">
                <div>
                  <span className="bg-brand text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest mb-3 inline-block shadow-xs">Ação Rápida</span>
                  <h2 className="text-3xl font-black text-text-base group-hover:text-brand transition-colors mb-2">Agendar Horário</h2>
                  <p className="text-sm font-medium text-text-muted max-w-xs md:max-w-md">Escolha o serviço, seu profissional favorito e garanta sua vaga.</p>
                </div>
                <div className="mt-6 md:mt-0 flex items-center gap-2 bg-background/50 backdrop-blur-sm border border-border-line px-5 py-3 rounded-2xl text-sm font-black text-brand uppercase tracking-wider w-fit">
                  Começar <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          </div>
        ) : (
          <div className="bg-surface border border-dashed border-border-line p-8 rounded-[30px] text-center">
            <div className="h-16 w-16 bg-brand/10 text-brand rounded-full flex items-center justify-center mx-auto mb-4"><Search size={32} /></div>
            <h2 className="text-2xl font-black text-text-base mb-2">Pesquise sua barbearia</h2>
          </div>
        )}

        {/* ✨ SESSÃO DE WIDGETS (CONFIGURADA PELO ADMIN) ✨ */}
        {barbeariaInfo?.widgets && barbeariaInfo.widgets.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-xs font-black text-text-muted uppercase tracking-widest flex items-center gap-2">
              <Sparkles size={16} className="text-brand" /> Novidades & Avisos
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {barbeariaInfo.widgets.map((widget, idx) => (
                <div key={idx} className="bg-surface border border-border-line rounded-3xl overflow-hidden shadow-sm">
                  {widget.type === 'imagem' && (
                    <img src={widget.content} alt="Aviso" className="w-full h-48 object-cover" />
                  )}
                  {widget.type === 'texto' && (
                    <div className="p-6">
                      <p className="text-sm font-medium text-text-base leading-relaxed" dangerouslySetInnerHTML={{__html: widget.content}}></p>
                    </div>
                  )}
                  {widget.type === 'video' && (
                    <div className="aspect-video w-full">
                      <iframe src={widget.content} className="w-full h-full" frameBorder="0" allowFullScreen></iframe>
                    </div>
                  )}
                  {widget.type === 'social' && (
                    <a href={widget.content} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-6 hover:bg-brand/5 transition-colors">
                      {widget.content.includes('instagram') ? <AtSign className="text-pink-500" /> : <Facebook className="text-blue-500" />}
                      <span className="font-bold text-sm text-text-base">Siga-nos nas Redes Sociais</span>
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RESTANTE DA PÁGINA */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-8">
            <div className="space-y-4">
              <h3 className="text-xs font-black text-text-muted uppercase tracking-widest flex items-center gap-2"><Clock size={16} className="text-brand" /> Próximos Atendimentos</h3>
              {!user ? (
                <div className="bg-surface border border-dashed border-border-line p-6 rounded-2xl text-center shadow-xs"><p className="text-sm font-bold text-text-muted">Faça login para ver sua agenda.</p></div>
              ) : meusAgendamentos.length === 0 ? (
                <div className="bg-surface border border-dashed border-border-line p-8 rounded-2xl text-center"><p className="text-sm font-bold text-text-muted">Nenhum agendamento pendente.</p></div>
              ) : (
                <div className="space-y-3">
                  {meusAgendamentos.map((ag) => (
                    <div key={ag.id} className="bg-surface border border-border-line p-4 rounded-2xl shadow-xs flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 bg-background border border-border-line rounded-xl flex flex-col items-center justify-center text-center font-black">
                          <span className="text-[10px] text-text-muted uppercase leading-none">{new Date(ag.data_hora).toLocaleDateString('pt-BR').split('/')[1]}</span>
                          <span className="text-base text-text-base leading-none mt-0.5">{new Date(ag.data_hora).toLocaleDateString('pt-BR').split('/')[0]}</span>
                        </div>
                        <div>
                          <p className="font-extrabold text-sm text-text-base">{ag.servicos?.nome_servico}</p>
                          <p className="text-xs text-text-muted mt-0.5">Com {ag.barbeiros?.nome.split(' ')[0]} às {new Date(ag.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                      <span className="bg-brand/10 text-brand text-[9px] font-black uppercase px-2 py-1 rounded-md">{ag.status_atendimento}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {barbeariaInfo && (
              <div className="space-y-4">
                <h3 className="text-xs font-black text-text-muted uppercase tracking-widest flex items-center gap-2"><MapPin size={16} className="text-brand" /> Nossa Unidade</h3>
                <div className="bg-surface p-5 rounded-2xl border border-border-line shadow-xs">
                  <p className="text-sm font-extrabold">Endereço</p>
                  <p className="text-xs text-text-muted mt-1">{barbeariaInfo.rua}, {barbeariaInfo.numero} - {barbeariaInfo.bairro}</p>
                  <hr className="my-3 border-border-line" />
                  <p className="text-sm font-extrabold">Horário</p>
                  <p className="text-xs text-text-muted mt-1">{formatarDiasFuncionamento(barbeariaInfo.dias_funcionamento)} <br/> Das {barbeariaInfo.hora_abertura?.substring(0,5)} às {barbeariaInfo.hora_fechamento?.substring(0,5)}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {user && isMobile && (
          <button onClick={handleLogout} className="w-full bg-red-500/5 hover:bg-red-500/10 p-4 rounded-2xl border border-red-500/20 flex text-red-500 mt-8 font-bold justify-center gap-2">
            <LogOut size={18} /> Sair da conta
          </button>
        )}
      </div>
    </div>
  );
}