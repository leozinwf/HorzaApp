import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useIsMobile } from '../../hooks/useIsMobile';
import { supabase } from '../../services/supabaseClient';
import { 
  Scissors, 
  User, 
  Clock, 
  MapPin, 
  LogOut, 
  Star, 
  CalendarDays, 
  ChevronRight,
  Sparkles,
  Sun,
  BookOpen,
  PartyPopper,
  Heart,
  Tag,
  Gift
} from 'lucide-react';

export default function HomeCliente({ onOpenLogin }) {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  const [meusAgendamentos, setMeusAgendamentos] = useState([]);
  const [loadingAgendamentos, setLoadingAgendamentos] = useState(false);
  
  // ✨ Novo estado para armazenar as informações da Barbearia
  const [barbeariaInfo, setBarbeariaInfo] = useState(null);

  useEffect(() => {
    buscarInfoBarbearia(); // Busca as infos da empresa para todos (logados ou não)
    
    if (user) {
      buscarAgendamentosCliente();
    }
  }, [user]);

  // ✨ Função para buscar os dados da tabela 'barbearias'
  const buscarInfoBarbearia = async () => {
    try {
      const { data, error } = await supabase
        .from('barbearias')
        .select('nome, rua, numero, bairro, cidade, estado, hora_abertura, hora_fechamento, dias_funcionamento')
        .limit(1)
        .maybeSingle(); // ⬅️ A MÁGICA ACONTECE AQUI! Substituímos o .single()

      if (error) {
        console.error('Erro retornado pelo Supabase:', error);
        return;
      }

      if (data) {
        setBarbeariaInfo(data);
      }
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

  // ✨ Função auxiliar para formatar os dias de funcionamento vindos do banco
  const formatarDiasFuncionamento = (diasArray) => {
    if (!diasArray || diasArray.length === 0) return 'Dias não informados';
    
    // Considerando o padrão onde 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb
    if (diasArray.length === 7) return 'Todos os dias';
    if (diasArray.length === 6 && diasArray.includes(1) && diasArray.includes(6)) return 'Segunda a Sábado';
    if (diasArray.length === 5 && diasArray.includes(1) && !diasArray.includes(6) && !diasArray.includes(0)) return 'Segunda a Sexta';

    const nomes = { 0: 'Dom', 1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex', 6: 'Sáb', 7: 'Dom' };
    const diasFormatados = diasArray.map(d => nomes[d]).filter(Boolean);
    return diasFormatados.join(', ');
  };

  // ==========================================
  // LÓGICA DO CALENDÁRIO SAZONAL (PRÓXIMOS 6)
  // ==========================================
  const hoje = new Date();
  const mesAtual = hoje.getMonth(); 
  const diaAtual = hoje.getDate();

  const nomesMeses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const calendarioEventos = [
    { mes: 0, diaSort: 1, valor: '01', titulo: 'Ano Novo', desc: 'Comece o ano com o visual renovado.' },
    { mes: 0, diaSort: 15, icone: <Sun size={20} strokeWidth={2.5}/>, titulo: 'Férias de Verão', desc: 'Aproveite as férias para mudar o estilo.' },
    { mes: 1, diaSort: 10, icone: <BookOpen size={20} strokeWidth={2.5}/>, titulo: 'Volta às Aulas', desc: 'Início do ano letivo com estilo e confiança.' },
    { mes: 1, diaSort: 15, icone: <PartyPopper size={20} strokeWidth={2.5}/>, titulo: 'Carnaval', desc: 'Cabelo na régua para curtir a folia.' },
    { mes: 2, diaSort: 8, valor: '08', titulo: 'Dia da Mulher', desc: 'Dia de homenagens especiais.' },
    { mes: 2, diaSort: 15, valor: '15', titulo: 'Dia do Consumidor', desc: 'Fique de olho nas condições especiais.' },
    { mes: 3, diaSort: 10, icone: <Gift size={20} strokeWidth={2.5}/>, titulo: 'Páscoa & Sexta Santa', desc: 'Feriado prolongado para relaxar.' },
    { mes: 3, diaSort: 21, valor: '21', titulo: 'Tiradentes', desc: 'Feriado nacional.' },
    { mes: 4, diaSort: 1, valor: '01', titulo: 'Dia do Trabalhador', desc: 'Cuide de você neste feriado.' },
    { mes: 4, diaSort: 12, icone: <Heart size={20} strokeWidth={2.5}/>, titulo: 'Dia das Mães', desc: 'Homenageie quem você ama.' },
    { mes: 5, diaSort: 12, valor: '12', titulo: 'Dia dos Namorados', desc: 'Esteja impecável para o seu amor.' },
    { mes: 5, diaSort: 24, valor: '24', titulo: 'São João e Festas', desc: 'O mês inteiro de arraiá.' },
    { mes: 6, diaSort: 15, icone: <Sun size={20} strokeWidth={2.5}/>, titulo: 'Férias Escolares', desc: 'Tempo livre para um trato no visual.' },
    { mes: 7, diaSort: 11, icone: <User size={20} strokeWidth={2.5}/>, titulo: 'Dia dos Pais', desc: 'O paizão merece um trato de respeito.' },
    { mes: 8, diaSort: 7, valor: '07', titulo: 'Independência', desc: 'Feriado nacional.' },
    { mes: 8, diaSort: 15, valor: '15', titulo: 'Dia do Cliente', desc: 'Nossa homenagem a você.' },
    { mes: 8, diaSort: 23, valor: '23', titulo: 'Início da Primavera', desc: 'Clima novo, corte novo.' },
    { mes: 9, diaSort: 12, valor: '12', titulo: 'Dia das Crianças', desc: 'Feriado Nacional.' },
    { mes: 9, diaSort: 31, valor: '31', titulo: 'Halloween', desc: 'Estilo de arrepiar!' },
    { mes: 10, diaSort: 2, valor: '02', titulo: 'Finados & Movembro', desc: 'Conscientização da saúde masculina.' },
    { mes: 10, diaSort: 15, valor: '15', titulo: 'Proclamação', desc: 'Feriado nacional.' },
    { mes: 10, diaSort: 29, icone: <Tag size={20} strokeWidth={2.5}/>, titulo: 'Black Friday', desc: 'Aproveite nossos descontos.' },
    { mes: 11, diaSort: 15, icone: <Gift size={20} strokeWidth={2.5}/>, titulo: 'Campanha de Natal', desc: 'Agendas lotam rápido. Antecipe-se!' },
    { mes: 11, diaSort: 25, valor: '25', titulo: 'Natal', desc: 'Celebre as festas com muito estilo.' },
    { mes: 11, diaSort: 31, valor: '31', titulo: 'Réveillon', desc: 'Entre no ano novo com o pé direito.' }
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

  return (
    <div className="flex flex-col text-text-base bg-background min-h-screen pb-24">
      
      {/* HEADER / BANNER */}
      <div className="bg-surface border-b border-border-line px-6 pt-10 pb-6 rounded-b-[2.5rem] shadow-xs md:rounded-3xl md:max-w-4xl md:mx-auto md:w-full md:mt-6 md:border">
        <div className="flex justify-between items-center mb-6">
          <div>
            <span className="text-text-muted text-xs font-bold uppercase tracking-wider block mb-1">Painel do Cliente</span>
            <h1 className="text-2xl font-black text-brand flex items-center gap-2">
              <Scissors size={26} className="animate-pulse" /> {barbeariaInfo?.nome || 'BarberSaaS'}
            </h1>
          </div>
          <div className="h-12 w-12 rounded-full bg-brand/10 border-2 border-brand flex items-center justify-center text-brand font-bold shadow-xs">
            {user ? profile?.nome?.substring(0, 2).toUpperCase() : <User size={22} />}
          </div>
        </div>

        {user ? (
          <div className="bg-background/80 p-4 rounded-2xl border border-border-line flex items-center justify-between">
            <div>
              <p className="text-xs text-text-muted">Conta Conectada</p>
              <p className="text-base font-extrabold text-text-base">Olá, {profile?.nome}!</p>
            </div>
            <div className="flex gap-1.5 bg-brand/10 text-brand px-3 py-1.5 rounded-xl text-xs font-black">
              <Star size={14} fill="currentColor" /> Cliente VIP
            </div>
          </div>
        ) : (
          <div className="bg-brand text-white p-5 rounded-2xl flex items-center justify-between shadow-md">
            <div>
              <p className="font-bold text-base">Crie sua conta ou faça login</p>
              <p className="text-xs opacity-90 mt-0.5">Para salvar seus históricos e pontos.</p>
            </div>
            <button 
              onClick={onOpenLogin} 
              className="bg-white text-brand text-xs font-black px-5 py-3 rounded-xl shadow-xs hover:bg-opacity-90 transition-all cursor-pointer"
            >
              Entrar
            </button>
          </div>
        )}
      </div>

      <div className="w-full max-w-4xl mx-auto px-5 mt-6 space-y-8">
        
        {/* BOTÃO DE AGENDAMENTO PRINCIPAL */}
        <div className="space-y-3">
          <div className="bg-linear-to-r from-brand to-amber-600 p-0.5 rounded-3xl shadow-md">
            <Link to="/agendar" className="block bg-surface p-6 rounded-[23px] relative overflow-hidden group hover:brightness-95 transition-all">
              <div className="relative z-10 flex flex-col justify-between h-full">
                <div>
                  <span className="bg-brand text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest mb-3 inline-block shadow-xs">
                    Agende Agora
                  </span>
                  <h2 className="text-2xl font-black text-text-base group-hover:text-brand transition-colors">
                    Reservar Meu Horário
                  </h2>
                  <p className="text-sm font-medium text-text-muted mt-1 max-w-xs">
                    Escolha o serviço, profissional e garanta sua vaga.
                  </p>
                </div>
                <div className="mt-5 flex items-center gap-2 text-sm font-black text-brand uppercase tracking-wider">
                  Iniciar Agendamento <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
              <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 bg-brand/5 p-8 rounded-full group-hover:scale-110 transition-transform">
                <CalendarDays size={110} className="text-brand/10" />
              </div>
            </Link>
          </div>
        </div>

        {/* MEUS AGENDAMENTOS */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-text-muted uppercase tracking-widest flex items-center gap-2">
              <Clock size={14} className="text-brand" /> Seus Agendamentos
            </h3>
          </div>

          {!user ? (
            <div className="bg-surface border border-border-line p-6 rounded-2xl text-center shadow-xs">
              <p className="text-sm font-bold text-text-muted">Faça login para acompanhar o status e horários.</p>
            </div>
          ) : loadingAgendamentos ? (
            <div className="bg-surface border border-border-line p-6 rounded-2xl flex justify-center">
              <div className="h-5 w-5 border-2 border-brand border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : meusAgendamentos.length === 0 ? (
            <div className="bg-surface border border-dashed border-border-line p-8 rounded-2xl text-center">
              <p className="text-sm font-bold text-text-muted">Nenhum agendamento recente encontrado.</p>
              <Link to="/agendar" className="text-xs text-brand font-black mt-2 inline-block hover:underline">Agendar meu primeiro corte →</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                        <p className="text-xs text-text-muted mt-0.5">Com: {ag.barbeiros?.nome.split(' ')[0]} • às {horaFormatada}</p>
                      </div>
                    </div>
                    <div>
                      <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-md tracking-wider block text-center ${
                        isCancelado ? 'bg-red-500/10 text-red-500' :
                        isConcluido ? 'bg-green-500/10 text-green-600' :
                        'bg-brand/10 text-brand'
                      }`}>
                        {ag.status_atendimento}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* CALENDÁRIO VISUAL (Próximos 6 Eventos) */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-black text-text-muted uppercase tracking-widest flex items-center gap-2">
              <Sparkles size={14} className="text-brand" /> Calendário da Barbearia
            </h3>
          </div>
          
          <div className="bg-surface border border-border-line rounded-3xl p-5 shadow-xs flex flex-col">
            <div className="border-b border-border-line pb-3 mb-4">
              <p className="text-sm font-black text-text-base">Próximos Eventos do Ano</p>
              <p className="text-xs text-text-muted mt-0.5">Fique atento aos períodos mais disputados e garanta o seu horário antes de todo mundo.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {proximosEventos.map((evento, idx) => (
                <div key={idx} className={`p-3 rounded-2xl border flex items-center gap-4 transition-all ${
                  evento.isPast 
                    ? 'bg-background/40 border-border-line/50 opacity-60 grayscale' 
                    : 'bg-surface border-border-line shadow-sm hover:border-brand/40'
                }`}>
                  
                  <div className={`flex-shrink-0 w-14 h-14 rounded-xl flex flex-col items-center justify-center border ${
                    evento.isPast ? 'bg-surface border-border-line' : 'bg-brand/10 border-brand/20'
                  }`}>
                    <span className={`text-[9px] font-black uppercase ${evento.isPast ? 'text-text-muted' : 'text-brand'}`}>
                      {nomesMeses[evento.mes].substring(0, 3)}
                    </span>
                    
                    <div className={`mt-0.5 ${evento.isPast ? 'text-text-muted' : 'text-brand'}`}>
                      {evento.valor ? (
                        <span className="text-lg font-black leading-none">{evento.valor}</span>
                      ) : (
                        <div className="flex items-center justify-center opacity-90 mt-0.5">
                          {evento.icone}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0 py-1">
                    <div className="flex justify-between items-start mb-1">
                      <h5 className={`font-bold text-sm leading-tight truncate pr-2 ${evento.isPast ? 'text-text-muted' : 'text-text-base'}`}>
                        {evento.titulo}
                      </h5>
                      <span className={`shrink-0 text-[8px] font-black px-2 py-1 rounded-md uppercase tracking-wider ${
                        evento.isPast ? 'bg-background border border-border-line text-text-muted' : 'bg-brand text-white'
                      }`}>
                        {evento.isPast ? 'Já foi' : 'Fica atento'}
                      </span>
                    </div>
                    <p className="text-[11px] text-text-muted leading-tight line-clamp-1">{evento.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ✨ INFORMAÇÕES DA UNIDADE INTEGRADAS AO BANCO */}
        <div className="space-y-3">
          <h3 className="text-xs font-black text-text-muted uppercase tracking-widest">
            Nossa Unidade
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-surface p-4 rounded-2xl border border-border-line flex items-center gap-4 shadow-xs">
              <div className="bg-brand/10 p-3 rounded-xl text-brand"><MapPin size={20} /></div>
              <div>
                <p className="text-sm font-extrabold text-text-base">Localização</p>
                <p className="text-xs text-text-muted mt-0.5">
                  {barbeariaInfo 
                    ? `${barbeariaInfo.rua || 'Endereço não definido'}, ${barbeariaInfo.numero || 'S/N'} - ${barbeariaInfo.bairro || ''}`
                    : 'Carregando endereço...'}
                </p>
              </div>
            </div>
            <div className="bg-surface p-4 rounded-2xl border border-border-line flex items-center gap-4 shadow-xs">
              <div className="bg-brand/10 p-3 rounded-xl text-brand"><Clock size={20} /></div>
              <div>
                <p className="text-sm font-extrabold text-text-base">Horário de Funcionamento</p>
                <p className="text-xs text-text-muted mt-0.5">
                  {barbeariaInfo 
                    ? `${formatarDiasFuncionamento(barbeariaInfo.dias_funcionamento)} das ${barbeariaInfo.hora_abertura?.substring(0, 5) || '09:00'} às ${barbeariaInfo.hora_fechamento?.substring(0, 5) || '19:00'}`
                    : 'Carregando horários...'}
                </p>
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
    </div>
  );
}