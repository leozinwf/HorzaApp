import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useIsMobile } from '../../hooks/useIsMobile';
import { supabase } from '../../services/supabaseClient';
import { 
  Scissors, User, Clock, MapPin, LogOut, Star, CalendarDays, 
  ChevronRight, Sparkles, Sun, BookOpen, PartyPopper, Heart, Tag, Gift, Wallet 
} from 'lucide-react';

export default function HomeCliente({ onOpenLogin }) {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { slug } = useParams();
  
  const [meusAgendamentos, setMeusAgendamentos] = useState([]);
  const [loadingAgendamentos, setLoadingAgendamentos] = useState(false);
  const [barbeariaInfo, setBarbeariaInfo] = useState(null);

  useEffect(() => {
    if (slug) buscarInfoBarbearia();
    if (user) buscarAgendamentosCliente();
  }, [user, slug]);

  const buscarInfoBarbearia = async () => {
    try {
      const { data, error } = await supabase
        .from('barbearias')
        .select('id, nome, slug, rua, numero, bairro, cidade, estado, hora_abertura, hora_fechamento, dias_funcionamento')
        .eq('slug', slug)
        .maybeSingle();

      if (error) throw error;
      if (data) setBarbeariaInfo(data);
    } catch (err) {
      console.error('Erro de conexão ao buscar barbearia:', err);
    }
  };

  const buscarAgendamentosCliente = async () => {
    setLoadingAgendamentos(true);
    try {
      const { data, error } = await supabase
        .from('agendamentos')
        .select(`
          id,
          data_hora,
          status_atendimento,
          servicos (nome_servico, preco),
          barbeiros:usuarios!agendamentos_barbeiro_id_fkey (nome)
        `)
        .eq('cliente_id', user.id)
        .order('data_hora', { ascending: false })
        .limit(2);

      if (!error && data) setMeusAgendamentos(data);
    } catch (err) {
      console.error('Erro ao buscar agendamentos:', err);
    } finally {
      setLoadingAgendamentos(false);
    }
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
    const diasFormatados = diasArray.map(d => nomes[d]).filter(Boolean);
    return diasFormatados.join(', ');
  };

  const hoje = new Date();
  const mesAtual = hoje.getMonth();
  const diaAtual = hoje.getDate();

  const nomesMeses = [
    'Janeiro', 'Fev', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const calendarioEventos = [
    { mes: 0, diaSort: 1, valor: '01', titulo: 'Ano Novo', desc: 'Comece o ano com o visual renovado.' },
    { mes: 0, diaSort: 15, icone: <Sun size={20} strokeWidth={2.5} />, titulo: 'Férias de Verão', desc: 'Aproveite as férias para mudar o estilo.' },
    { mes: 1, diaSort: 10, icone: <BookOpen size={20} strokeWidth={2.5} />, titulo: 'Volta às Aulas', desc: 'Início do ano letivo com estilo e confiança.' },
    { mes: 1, diaSort: 15, icone: <PartyPopper size={20} strokeWidth={2.5} />, titulo: 'Carnaval', desc: 'Cabelo na régua para curtir a folia.' },
    { mes: 2, diaSort: 8, valor: '08', titulo: 'Dia da Mulher', desc: 'Dia de homenagens especiais.' },
    { mes: 2, diaSort: 15, valor: '15', titulo: 'Dia do Consumidor', desc: 'Fique de olho nas condições especiais.' },
    { mes: 3, diaSort: 10, icone: <Gift size={20} strokeWidth={2.5} />, titulo: 'Páscoa', desc: 'Feriado prolongado para relaxar.' },
    { mes: 3, diaSort: 21, valor: '21', titulo: 'Tiradentes', desc: 'Feriado nacional.' },
    { mes: 4, diaSort: 1, valor: '01', titulo: 'Dia do Trabalhador', desc: 'Cuide de você neste feriado.' },
    { mes: 4, diaSort: 12, icone: <Heart size={20} strokeWidth={2.5} />, titulo: 'Dia das Mães', desc: 'Homenageie quem você ama.' },
    { mes: 5, diaSort: 12, valor: '12', titulo: 'Dia dos Namorados', desc: 'Esteja impecável para o seu amor.' },
    { mes: 5, diaSort: 24, valor: '24', titulo: 'São João', desc: 'O mês inteiro de arraiá.' },
    { mes: 6, diaSort: 15, icone: <Sun size={20} strokeWidth={2.5} />, titulo: 'Férias Escolares', desc: 'Tempo livre para um trato no visual.' },
    { mes: 7, diaSort: 11, icone: <User size={20} strokeWidth={2.5} />, titulo: 'Dia dos Pais', desc: 'O paizão merece um trato de respeito.' },
    { mes: 8, diaSort: 7, valor: '07', titulo: 'Independência', desc: 'Feriado nacional.' },
    { mes: 8, diaSort: 15, valor: '15', titulo: 'Dia do Cliente', desc: 'Nossa homenagem a você.' },
    { mes: 8, diaSort: 23, valor: '23', titulo: 'Primavera', desc: 'Clima novo, corte novo.' },
    { mes: 9, diaSort: 12, valor: '12', titulo: 'Dia das Crianças', desc: 'Feriado Nacional.' },
    { mes: 9, diaSort: 31, valor: '31', titulo: 'Halloween', desc: 'Estilo de arrepiar!' },
    { mes: 10, diaSort: 2, valor: '02', titulo: 'Novembro Azul', desc: 'Conscientização da saúde masculina.' },
    { mes: 10, diaSort: 15, valor: '15', titulo: 'Proclamação', desc: 'Feriado nacional.' },
    { mes: 10, diaSort: 29, icone: <Tag size={20} strokeWidth={2.5} />, titulo: 'Black Friday', desc: 'Aproveite nossos descontos.' },
    { mes: 11, diaSort: 15, icone: <Gift size={20} strokeWidth={2.5} />, titulo: 'Natal', desc: 'Agendas lotam rápido. Antecipe-se!' },
    { mes: 11, diaSort: 31, valor: '31', titulo: 'Réveillon', desc: 'Entre no ano novo com estilo.' }
  ];

  const obterProximos6Eventos = () => {
    let eventosFiltrados = [];
    let mesesAvaliados = 0;

    while (eventosFiltrados.length < 6 && mesesAvaliados < 12) {
      const mesVerificacao = (mesAtual + mesesAvaliados) % 12;
      const eventosDesteMes = calendarioEventos
        .filter(e => e.mes === mesVerificacao)
        .sort((a, b) => a.diaSort - b.diaSort);

      for (const evento of eventosDesteMes) {
        if (eventosFiltrados.length < 6) {
          const isPast = mesesAvaliados === 0 && evento.diaSort < diaAtual;
          eventosFiltrados.push({ ...evento, isPast });
        }
      }
      mesesAvaliados++;
    }
    return eventosFiltrados;
  };

  const proximosEventos = obterProximos6Eventos();

  if (!barbeariaInfo) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-brand border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col text-text-base bg-background min-h-screen pb-24">
      {/* HEADER / BANNER */}
      <div className="bg-surface border-b border-border-line px-6 pt-10 pb-8 rounded-b-[2.5rem] shadow-xs md:rounded-3xl md:max-w-5xl md:mx-auto md:w-full md:mt-6 md:border">
        <div className="flex justify-between items-center mb-8">
          <div>
            <span className="text-text-muted text-xs font-bold uppercase tracking-wider block mb-1">Bem-vindo à</span>
            <h1 className="text-3xl font-black text-brand flex items-center gap-2">
              <Scissors size={28} className="animate-pulse" /> {barbeariaInfo.nome}
            </h1>
          </div>
          <div className="h-14 w-14 rounded-full bg-brand/10 border-2 border-brand flex items-center justify-center text-brand font-bold shadow-xs">
            {user ? profile?.nome?.substring(0, 2).toUpperCase() : <User size={24} />}
          </div>
        </div>

        {user ? (
          <div className="grid grid-cols-3 gap-3">
            <Link to="/area-cliente" className="bg-background border border-border-line p-3 rounded-2xl flex flex-col items-center justify-center gap-1 hover:border-brand transition-colors group">
              <Star size={20} className="text-amber-500 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-black uppercase text-text-muted mt-1">Pontos</span>
              <span className="text-xs font-bold text-text-base">{profile?.saldo_pontos || 0}</span>
            </Link>
            <Link to="/area-cliente" className="bg-background border border-border-line p-3 rounded-2xl flex flex-col items-center justify-center gap-1 hover:border-brand transition-colors group">
              <Clock size={20} className="text-blue-500 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-black uppercase text-text-muted mt-1">Histórico</span>
              <span className="text-xs font-bold text-text-base">Ver Tudo</span>
            </Link>
            <Link to="/area-cliente" className="bg-background border border-border-line p-3 rounded-2xl flex flex-col items-center justify-center gap-1 hover:border-brand transition-colors group">
              <User size={20} className="text-brand group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-black uppercase text-text-muted mt-1">Sua Conta</span>
              <span className="text-xs font-bold text-text-base">Perfil</span>
            </Link>
          </div>
        ) : (
          <div className="bg-brand text-white p-5 rounded-2xl flex items-center justify-between shadow-md">
            <div>
              <p className="font-bold text-base">Faça parte do clube!</p>
              <p className="text-xs opacity-90 mt-0.5">Acumule pontos e ganhe prêmios.</p>
            </div>
            <button
              onClick={onOpenLogin}
              className="bg-white text-brand text-xs font-black px-6 py-3 rounded-xl shadow-xs hover:bg-opacity-90 transition-all cursor-pointer"
            >
              Entrar
            </button>
          </div>
        )}
      </div>

      <div className="w-full max-w-5xl mx-auto px-5 mt-6 space-y-8">
        
        {/* BOTÃO DE AGENDAMENTO PRINCIPAL */}
        <div className="bg-gradient-to-r from-brand to-amber-600 p-0.5 rounded-[2rem] shadow-lg">
          <Link to={`/${slug}/agendar`} className="block bg-surface p-8 rounded-[30px] relative overflow-hidden group hover:brightness-95 transition-all">
            <div className="relative z-10 flex flex-col justify-between h-full md:flex-row md:items-center">
              <div>
                <span className="bg-brand text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest mb-3 inline-block shadow-xs">
                  Ação Rápida
                </span>
                <h2 className="text-3xl font-black text-text-base group-hover:text-brand transition-colors mb-2">
                  Agendar Horário
                </h2>
                <p className="text-sm font-medium text-text-muted max-w-xs md:max-w-md">
                  Escolha o serviço, seu profissional favorito e garanta sua vaga agora mesmo.
                </p>
              </div>
              <div className="mt-6 md:mt-0 flex items-center gap-2 bg-background/50 backdrop-blur-sm border border-border-line px-5 py-3 rounded-2xl text-sm font-black text-brand uppercase tracking-wider w-fit">
                Começar <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 bg-brand/5 p-10 rounded-full group-hover:scale-110 transition-transform hidden sm:block">
              <CalendarDays size={140} className="text-brand/10" />
            </div>
          </Link>
        </div>

        {/* MÚLTIPLAS COLUNAS NO DESKTOP */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* COLUNA ESQUERDA: AGENDAMENTOS E INFORMAÇÕES */}
          <div className="space-y-8">
            
            {/* MEUS AGENDAMENTOS */}
            <div className="space-y-4">
              <h3 className="text-xs font-black text-text-muted uppercase tracking-widest flex items-center gap-2">
                <Clock size={16} className="text-brand" /> Próximos Atendimentos
              </h3>

              {!user ? (
                <div className="bg-surface border border-dashed border-border-line p-6 rounded-2xl text-center shadow-xs">
                  <p className="text-sm font-bold text-text-muted">Faça login para ver sua agenda.</p>
                </div>
              ) : loadingAgendamentos ? (
                <div className="bg-surface border border-border-line p-6 rounded-2xl flex justify-center">
                  <div className="h-5 w-5 border-2 border-brand border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : meusAgendamentos.length === 0 ? (
                <div className="bg-surface border border-dashed border-border-line p-8 rounded-2xl text-center">
                  <p className="text-sm font-bold text-text-muted">Nenhum agendamento pendente.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {meusAgendamentos.map((ag) => {
                    const dataFormatada = new Date(ag.data_hora).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                    const horaFormatada = new Date(ag.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
                    const isCancelado = ag.status_atendimento === 'cancelado';
                    const isConcluido = ag.status_atendimento === 'concluido';

                    return (
                      <div key={ag.id} className="bg-surface border border-border-line p-4 rounded-2xl shadow-xs flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 bg-background border border-border-line rounded-xl flex flex-col items-center justify-center text-center font-black">
                            <span className="text-[10px] text-text-muted uppercase leading-none">{dataFormatada.split('/')[1]}</span>
                            <span className="text-base text-text-base leading-none mt-0.5">{dataFormatada.split('/')[0]}</span>
                          </div>
                          <div>
                            <p className="font-extrabold text-sm text-text-base">{ag.servicos?.nome_servico}</p>
                            <p className="text-xs text-text-muted mt-0.5">Com {ag.barbeiros?.nome.split(' ')[0]} às {horaFormatada}</p>
                          </div>
                        </div>
                        <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-md tracking-wider text-center ${isCancelado ? 'bg-red-500/10 text-red-500' : isConcluido ? 'bg-green-500/10 text-green-600' : 'bg-brand/10 text-brand'}`}>
                          {ag.status_atendimento}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* INFORMAÇÕES DA UNIDADE */}
            <div className="space-y-4">
              <h3 className="text-xs font-black text-text-muted uppercase tracking-widest flex items-center gap-2">
                <MapPin size={16} className="text-brand" /> Nossa Unidade
              </h3>
              <div className="grid grid-cols-1 gap-3">
                <div className="bg-surface p-5 rounded-2xl border border-border-line flex items-center gap-4 shadow-xs">
                  <div className="bg-background border border-border-line p-3 rounded-xl text-text-muted"><MapPin size={20} /></div>
                  <div>
                    <p className="text-sm font-extrabold text-text-base">Localização</p>
                    <p className="text-xs text-text-muted mt-1 leading-relaxed">
                      {`${barbeariaInfo.rua || 'Endereço não definido'}, ${barbeariaInfo.numero || 'S/N'} - ${barbeariaInfo.bairro || ''}`}
                    </p>
                  </div>
                </div>
                <div className="bg-surface p-5 rounded-2xl border border-border-line flex items-center gap-4 shadow-xs">
                  <div className="bg-background border border-border-line p-3 rounded-xl text-text-muted"><Clock size={20} /></div>
                  <div>
                    <p className="text-sm font-extrabold text-text-base">Horário de Funcionamento</p>
                    <p className="text-xs text-text-muted mt-1 leading-relaxed">
                      {`${formatarDiasFuncionamento(barbeariaInfo.dias_funcionamento)}`} <br/>
                      {`Das ${barbeariaInfo.hora_abertura?.substring(0, 5) || '09:00'} às ${barbeariaInfo.hora_fechamento?.substring(0, 5) || '19:00'}`}
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* COLUNA DIREITA: CALENDÁRIO VISUAL (CARROSSEL) */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-text-muted uppercase tracking-widest flex items-center gap-2">
              <Sparkles size={16} className="text-brand" /> Fique Atento
            </h3>

            <div className="bg-surface border border-border-line rounded-3xl p-6 shadow-xs">
              <div className="mb-6">
                <p className="text-lg font-black text-text-base">Eventos do Ano</p>
                <p className="text-xs text-text-muted mt-1">Garanta seu horário com antecedência nas datas mais disputadas da barbearia.</p>
              </div>

              {/* Carrossel Horizontal para não ocupar muito espaço vertical */}
              <div className="flex overflow-x-auto gap-4 pb-4 hide-scrollbar snap-x">
                {proximosEventos.map((evento, idx) => (
                  <div key={idx} className={`min-w-[200px] sm:min-w-[240px] p-4 rounded-2xl border snap-start transition-all flex flex-col ${evento.isPast
                      ? 'bg-background/40 border-border-line/50 opacity-60 grayscale'
                      : 'bg-background border-border-line shadow-sm hover:border-brand/40'
                    }`}>

                    <div className="flex items-center justify-between mb-4">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center border ${evento.isPast ? 'bg-surface border-border-line text-text-muted' : 'bg-brand/10 border-brand/20 text-brand'}`}>
                        {evento.valor ? <span className="font-black">{evento.valor}</span> : evento.icone}
                      </div>
                      <span className={`text-[9px] font-black uppercase ${evento.isPast ? 'text-text-muted' : 'text-brand'}`}>
                        {nomesMeses[evento.mes]}
                      </span>
                    </div>

                    <div>
                      <h5 className={`font-bold text-sm leading-tight mb-1 ${evento.isPast ? 'text-text-muted' : 'text-text-base'}`}>
                        {evento.titulo}
                      </h5>
                      <p className="text-xs text-text-muted leading-relaxed line-clamp-2">{evento.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* LOGOUT */}
        {user && isMobile && (
          <button
            onClick={handleLogout}
            className="w-full bg-red-500/5 hover:bg-red-500/10 p-4 rounded-2xl border border-red-500/20 flex items-center justify-center text-red-500 mt-8 shadow-xs font-bold gap-2 transition-colors cursor-pointer"
          >
            <LogOut size={18} /> Sair da conta
          </button>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}