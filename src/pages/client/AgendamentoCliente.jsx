import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { Calendar, Clock, User, CheckCircle2, ChevronRight, ArrowLeft, X, AlertTriangle, Mail, Phone, LogIn, Check, Scissors } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { dateTimeToISO } from '../../utils/formatters';
import AdicionarCalendario from '../../components/shared/AdicionarCalendario';
import { notificarNovoAgendamento } from '../../services/agendamentoNotificacaoService';

export default function AgendamentoCliente({ onOpenLogin }) {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { slug } = useParams(); // CAPTURA DA URL

  const [barbeariaContext, setBarbeariaContext] = useState(null);
  const [servicos, setServicos] = useState([]);
  const [barbeiros, setBarbeiros] = useState([]);
  const [carregandoBarbeiros, setCarregandoBarbeiros] = useState(false);
  
  const [passo, setPasso] = useState(1);
  const [servicoSelecionado, setServicoSelecionado] = useState(null);
  const [barbeiroSelecionado, setBarbeiroSelecionado] = useState(null);
  const [data, setData] = useState('');
  const [horario, setHorario] = useState('');
  
  const [horariosDisponiveis, setHorariosDisponiveis] = useState([]);
  const [carregandoHorarios, setCarregandoHorarios] = useState(false);
  const [loading, setLoading] = useState(false);

  const [nomeGuest, setNomeGuest] = useState('');
  const [whatsappGuest, setWhatsappGuest] = useState('');
  const [emailGuest, setEmailGuest] = useState('');
  const [jaTinhaConta, setJaTinhaConta] = useState(false);
  const [agendamentoId, setAgendamentoId] = useState(null);

  const finalizarAgendamento = async (novoId) => {
    setAgendamentoId(novoId);
    localStorage.removeItem('agendamento_pendente');
    setPasso(4);
    notificarNovoAgendamento(novoId);
  };

  const getDadosCliente = () => ({
    nome: user ? (profile?.nome || user.user_metadata?.nome) : nomeGuest,
    email: user ? (profile?.email || user.email) : emailGuest,
    whatsapp: user ? profile?.whatsapp : whatsappGuest,
  });

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const hoje = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }); 

  // Inicia carregando o contexto da barbearia pela URL
  useEffect(() => {
    if (slug) {
      carregarContextoBarbearia();
    }
  }, [slug]);

  // Recupera rascunho apenas após a barbearia estar carregada
  useEffect(() => {
    if (barbeariaContext) {
      recuperarRascunho();
    }
  }, [barbeariaContext]);

  // Busca os barbeiros apenas QUANDO o serviço for escolhido
  useEffect(() => {
    if (servicoSelecionado?.barbearia_id) {
      buscarBarbeiros(servicoSelecionado.barbearia_id);
    }
  }, [servicoSelecionado]);

  // Busca os horários ao preencher os requisitos da Etapa 3
  useEffect(() => {
    if (passo === 3 && data && barbeiroSelecionado) {
      buscarDisponibilidade();
      setHorario(''); 
    }
  }, [data, barbeiroSelecionado, passo]);

  const carregarContextoBarbearia = async () => {
    try {
      const { data, error } = await supabase
        .from('barbearias')
        .select('*')
        .eq('slug', slug)
        .single();
      
      if (error) throw error;
      
      if (data) {
        setBarbeariaContext(data);
        carregarServicos(data.id); // Carrega os serviços DESTA barbearia
      }
    } catch (err) {
      console.error('Erro ao buscar contexto da barbearia:', err);
    }
  };

  const carregarServicos = async (barbeariaId) => {
    try {
      const { data: servicosData } = await supabase
        .from('servicos')
        .select('*')
        .eq('barbearia_id', barbeariaId)
        .eq('ativo', true);
        
      if (servicosData) setServicos(servicosData);
    } catch (err) {
      console.error('Erro ao carregar serviços:', err.message);
    }
  };

  const recuperarRascunho = () => {
    const rascunho = localStorage.getItem('agendamento_pendente');
    if (rascunho) {
      const dados = JSON.parse(rascunho);
      // Evita carregar rascunho de outra barbearia
      if (dados.servico.barbearia_id === barbeariaContext.id) {
        setServicoSelecionado(dados.servico);
        setBarbeiroSelecionado(dados.barbeiro);
        setData(dados.data);
        setHorario(dados.horario);
        setPasso(3);
      }
    }
  };

  const buscarBarbeiros = async (barbeariaId) => {
    setCarregandoBarbeiros(true);
    try {
      const { data: barbeirosData, error } = await supabase
        .from('usuarios')
        .select('id, nome, avatar_url, role, exibe_na_agenda, ativo')
        .eq('barbearia_id', barbeariaId)
        .in('role', ['admin', 'gerente', 'funcionario'])
        .eq('ativo', true);

      if (error) throw error;

      const visiveis = (barbeirosData || []).filter(
        (b) => b.exibe_na_agenda !== false
      );

      setBarbeiros(visiveis);
    } catch (err) {
      console.error('Erro ao buscar barbeiros:', err.message);
      setBarbeiros([]);
    } finally {
      setCarregandoBarbeiros(false);
    }
  };

  const buscarDisponibilidade = async () => {
    setCarregandoHorarios(true);
    try {
      const { data: config } = await supabase.from('barbearias').select('hora_abertura, hora_fechamento, dias_funcionamento').eq('id', servicoSelecionado.barbearia_id).single();
      const { data: excecoes } = await supabase.from('excecoes_agenda').select('*').eq('barbeiro_id', barbeiroSelecionado.id).eq('data', data);
      
      const dataInicio = new Date(`${data}T00:00:00`).toISOString();
      const dataFim = new Date(`${data}T23:59:59`).toISOString();
      const { data: agendamentosDia } = await supabase.from('agendamentos').select('data_hora, servicos(duracao_minutos)').eq('barbeiro_id', barbeiroSelecionado.id).not('status_atendimento', 'eq', 'cancelado').not('status_atendimento', 'eq', 'ausente').gte('data_hora', dataInicio).lte('data_hora', dataFim);

      const horarios = gerarHorarios(config, excecoes || [], agendamentosDia || [], data);
      setHorariosDisponiveis(horarios);
    } catch (err) {
      console.error(err);
    } finally {
      setCarregandoHorarios(false);
    }
  };

  const gerarHorarios = (config, excecoes, agendamentosDia, dataEscolhida) => {
    if (!config) return [];
    const diaSemana = new Date(`${dataEscolhida}T12:00:00`).getDay();
    const isDiaPadrao = config.dias_funcionamento.includes(diaSemana);
    
    const agoraBrString = new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' });
    const agora = new Date(agoraBrString);
    const duracaoDesejada = servicoSelecionado?.duracao_minutos || 30;

    let horariosLivres = [];

    for (let h = 6; h <= 23; h++) {
      for (let m = 0; m < 60; m += 30) {
        const horaStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        
        const isHoraPadrao = horaStr >= config.hora_abertura.substring(0, 5) && horaStr < config.hora_fechamento.substring(0, 5);
        const isAbertoPadrao = isDiaPadrao && isHoraPadrao;

        const excecao = excecoes.find(e => e.horario.startsWith(horaStr));
        const isAberto = (isAbertoPadrao && (!excecao || excecao.tipo !== 'bloqueio')) || (!isAbertoPadrao && excecao?.tipo === 'liberacao');

        if (!isAberto) continue; 

        const horaAtualSlot = new Date(`${dataEscolhida}T${horaStr}:00`);
        if (dataEscolhida === hoje && horaAtualSlot < agora) continue;

        const slotFim = new Date(horaAtualSlot.getTime() + duracaoDesejada * 60000);
        const conflito = agendamentosDia.some(ag => {
          const agInicio = new Date(ag.data_hora);
          const duracaoConcorrente = ag.servicos?.duracao_minutos || 30;
          const agFim = new Date(agInicio.getTime() + duracaoConcorrente * 60000);
          return (horaAtualSlot < agFim && slotFim > agInicio);
        });

        if (!conflito) horariosLivres.push(horaStr);
      }
    }
    return horariosLivres;
  };

  const handleWhatsappChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
    value = value.replace(/(\d)(\d{4})$/, '$1-$2');
    setWhatsappGuest(value.substring(0, 15));
  };

  const handleConfirmarAgendamento = async (e) => {
    e.preventDefault();

    if (!data || !horario) {
      alert('Selecione uma data e um horário válidos.');
      return;
    }

    setLoading(true);

    try {
      let ip = null;
      try {
        const res = await fetch('https://api.ipify.org?format=json');
        const ipData = await res.json();
        ip = ipData.ip;

        const { data: podeAgendar } = await supabase.rpc('verificar_limite_agendamentos', { ip_requisitante: ip });
        if (!podeAgendar) {
          alert('Muitas tentativas de agendamento detectadas. Tente novamente em uma hora.');
          return;
        }

        await supabase.from('agendamento_logs').insert([{ ip_address: ip }]);
      } catch (ipError) {
        console.warn('Verificação de IP indisponível, continuando agendamento:', ipError);
      }

      const dataHoraIso = dateTimeToISO(data, horario);

      if (user) {
        const { data: inserted, error } = await supabase.from('agendamentos').insert([{
          barbearia_id: servicoSelecionado.barbearia_id,
          cliente_id: user.id,
          barbeiro_id: barbeiroSelecionado.id,
          servico_id: servicoSelecionado.id,
          data_hora: dataHoraIso,
          status_pagamento: 'pagar_na_hora',
          status_atendimento: 'agendado'
        }]).select('id').single();

        if (error) throw error;
        await finalizarAgendamento(inserted.id);
      } else {
        if (!nomeGuest || !whatsappGuest || !emailGuest) {
          alert('Preencha os seus dados para podermos confirmar a sua reserva.');
          return;
        }

        const senhaTemporaria = Math.random().toString(36).slice(-10) + 'A1!';
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: emailGuest,
          password: senhaTemporaria
        });

        let novoUserId = null;

        if (authError) {
          if (authError.message.includes('User already registered')) {
            setJaTinhaConta(true);
            alert('Este e-mail já possui conta. Faça login para concluir o agendamento.');
            onOpenLogin?.();
            return;
          }
          throw authError;
        }

        novoUserId = authData.user?.id;
        if (novoUserId) {
          const { error: profileError } = await supabase.from('usuarios').insert([{
            id: novoUserId,
            nome: nomeGuest,
            whatsapp: whatsappGuest,
            role: 'cliente'
          }]);
          if (profileError) throw profileError;
        }

        const { data: agInserted, error: agError } = await supabase.from('agendamentos').insert([{
          barbearia_id: servicoSelecionado.barbearia_id,
          cliente_id: novoUserId,
          barbeiro_id: barbeiroSelecionado.id,
          servico_id: servicoSelecionado.id,
          data_hora: dataHoraIso,
          status_pagamento: 'pagar_na_hora',
          status_atendimento: 'agendado',
          nome_cliente_avulso: nomeGuest,
          whatsapp_cliente_avulso: whatsappGuest
        }]).select('id').single();

        if (agError) throw agError;
        await finalizarAgendamento(agInserted.id);
      }
    } catch (err) {
      alert('Erro ao processar agendamento: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetarECancelarTudo = () => {
    localStorage.removeItem('agendamento_pendente');
    setServicoSelecionado(null);
    setBarbeiroSelecionado(null);
    setData('');
    setHorario('');
    setNomeGuest('');
    setWhatsappGuest('');
    setEmailGuest('');
    setJaTinhaConta(false);
    setPasso(1);
    setIsCancelModalOpen(false);
    navigate(`/${slug}`);
  };

  const progresso = ((passo - 1) / 3) * 100;

  if (!barbeariaContext) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-brand border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col text-text-base pb-24 bg-background min-h-screen font-sans">
      <div className="flex-1 flex justify-center pt-8 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-xl">
          
          {passo < 4 && (
            <div className="mb-10">
              <div className="flex items-center justify-between mb-8">
                <button 
                  onClick={() => passo > 1 ? setPasso(passo - 1) : setIsCancelModalOpen(true)}
                  className="p-2 -ml-2 rounded-full text-text-muted hover:bg-surface hover:text-text-base transition-colors"
                >
                  <ArrowLeft size={24} />
                </button>
                <h1 className="text-lg font-black text-text-base">Nova Reserva</h1>
                <div className="w-10"></div>
              </div>

              <div className="relative px-2">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1.5 bg-border-line rounded-full z-0 overflow-hidden">
                  <div 
                    className="h-full bg-brand rounded-full transition-all duration-500 ease-out" 
                    style={{ width: `${progresso}%` }}
                  ></div>
                </div>
                
                <div className="relative z-10 flex justify-between">
                  {[1, 2, 3, 4].map((p) => (
                    <div 
                      key={p}
                      onClick={() => p < passo && setPasso(p)}
                      className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-black transition-all duration-300 ${
                        passo === p 
                          ? 'bg-brand text-white shadow-lg shadow-brand/30 scale-110' 
                          : passo > p 
                            ? 'bg-brand text-white cursor-pointer hover:scale-110'
                            : 'bg-surface border-2 border-border-line text-text-muted'
                      }`}
                    >
                      {passo > p || (p === 4 && passo === 4) ? <Check size={16} strokeWidth={3} /> : p}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {passo === 1 && (
            <div className="space-y-5 animate-fadeIn">
              <div>
                <h2 className="text-2xl font-black text-text-base">O que vamos fazer?</h2>
                <p className="text-sm text-text-muted mt-1">Selecione um serviço na {barbeariaContext.nome}.</p>
              </div>

              <div className="space-y-3">
                {servicos.length === 0 ? (
                  <div className="bg-surface p-5 rounded-3xl border border-dashed border-border-line text-center">
                    <p className="font-bold text-text-muted">Nenhum serviço disponível no momento.</p>
                  </div>
                ) : (
                  servicos.map((servico) => (
                    <button 
                      key={servico.id}
                      onClick={() => { setServicoSelecionado(servico); setPasso(2); }}
                      className="w-full bg-surface p-5 rounded-3xl border border-border-line shadow-sm hover:border-brand/60 hover:shadow-md transition-all text-left flex items-center group cursor-pointer"
                    >
                      <div className="bg-background border border-border-line h-12 w-12 rounded-2xl flex items-center justify-center mr-4 text-text-muted group-hover:text-brand transition-colors">
                        <Scissors size={22} />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-text-base text-lg">{servico.nome_servico}</p>
                        <p className="text-xs text-text-muted mt-0.5 flex items-center gap-1 font-medium"><Clock size={12}/> {servico.duracao_minutos} min</p>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <p className="font-black text-text-base text-lg">R$ {Number(servico.preco).toFixed(2)}</p>
                        <ChevronRight size={20} className="text-border-line group-hover:text-brand transition-colors transform group-hover:translate-x-1" />
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {passo === 2 && (
            <div className="space-y-5 animate-fadeIn">
              <div>
                <h2 className="text-2xl font-black text-text-base">Escolha o Profissional</h2>
                <p className="text-sm text-text-muted mt-1">Quem vai realizar o seu {servicoSelecionado?.nome_servico}?</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {carregandoBarbeiros ? (
                  <div className="col-span-2 flex justify-center p-10"><div className="h-6 w-6 border-2 border-brand border-t-transparent rounded-full animate-spin"></div></div>
                ) : barbeiros.length === 0 ? (
                  <div className="col-span-2 bg-amber-500/10 border border-amber-500/20 p-6 rounded-2xl text-center">
                    <p className="font-bold text-amber-700 mb-1">Nenhum profissional disponível</p>
                    <p className="text-sm text-text-muted">Peça ao administrador para ativar &quot;Aparece na Agenda&quot; em Permissões ou adicionar membros na Equipe.</p>
                  </div>
                ) : (
                  barbeiros.map((barbeiro) => (
                    <button 
                      key={barbeiro.id}
                      onClick={() => { setBarbeiroSelecionado(barbeiro); setPasso(3); }}
                      className="bg-surface p-6 rounded-3xl border border-border-line shadow-sm hover:border-brand/60 hover:shadow-md transition-all flex flex-col items-center text-center gap-4 cursor-pointer group"
                    >
                      <div className="relative">
                        <div className="h-20 w-20 bg-background rounded-full flex items-center justify-center text-text-muted border-2 border-border-line group-hover:border-brand group-hover:text-brand transition-all shadow-sm">
                          <User size={36} strokeWidth={1.5} />
                        </div>
                        <div className="absolute -bottom-2 -right-2 h-8 w-8 bg-surface rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="h-6 w-6 bg-brand rounded-full flex items-center justify-center text-white shadow-sm">
                            <Check size={14} strokeWidth={3} />
                          </div>
                        </div>
                      </div>
                      <p className="font-bold text-text-base text-lg">{barbeiro.nome.split(' ')[0]}</p>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
          
          {passo === 3 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h2 className="text-2xl font-black text-text-base">Data e Horário</h2>
                <p className="text-sm text-text-muted mt-1">Quase lá! Escolha quando você deseja ser atendido.</p>
              </div>
              
              <form onSubmit={handleConfirmarAgendamento} className="space-y-6">
                
                <div className="bg-surface p-5 sm:p-6 rounded-3xl border border-border-line shadow-sm space-y-6">
                  <div>
                    <label className="block text-xs font-black text-text-muted mb-2 uppercase tracking-wider">Selecione o Dia</label>
                    <div className="relative">
                      <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input 
                        required 
                        type="date" 
                        min={hoje} 
                        value={data} 
                        onChange={(e) => setData(e.target.value)} 
                        className="w-full bg-background border border-border-line rounded-2xl py-3.5 pl-12 pr-4 text-sm font-bold text-text-base focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all cursor-pointer" 
                      />
                    </div>
                  </div>

                  {data && (
                    <div className="animate-fadeIn pt-4 border-t border-border-line">
                      <label className="block text-xs font-black text-text-muted mb-4 uppercase tracking-wider">Horários Disponíveis</label>
                      {carregandoHorarios ? (
                        <div className="flex justify-center py-6"><div className="h-6 w-6 border-2 border-brand border-t-transparent rounded-full animate-spin"></div></div>
                      ) : horariosDisponiveis.length === 0 ? (
                        <div className="bg-background border border-border-line p-5 rounded-2xl text-center">
                          <p className="text-sm font-bold text-text-base">Nenhum horário livre.</p>
                          <p className="text-xs text-text-muted mt-1">Tente selecionar outro dia.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                          {horariosDisponiveis.map(hora => (
                            <button
                              type="button"
                              key={hora}
                              onClick={() => setHorario(hora)}
                              className={`py-3 px-2 rounded-2xl text-sm font-black transition-all cursor-pointer ${
                                horario === hora 
                                  ? 'bg-brand text-white shadow-md shadow-brand/20 scale-105' 
                                  : 'bg-background border border-border-line text-text-base hover:border-brand hover:text-brand'
                              }`}
                            >
                              {hora}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {!user && horario && (
                  <div className="bg-brand/5 p-5 sm:p-6 rounded-3xl border border-brand/20 space-y-5 animate-fadeIn">
                    <div>
                      <h3 className="font-black text-brand text-lg">Seus Dados</h3>
                      <p className="text-xs text-brand/70 font-medium">Precisamos disso para confirmar a sua reserva.</p>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-black text-brand/80 uppercase mb-1.5">Nome Completo</label>
                        <input required={!user} type="text" value={nomeGuest} onChange={(e) => setNomeGuest(e.target.value)} placeholder="Ex: Lucas Ramos" className="w-full rounded-2xl bg-white dark:bg-background border-none p-3.5 text-sm font-bold text-text-base outline-none focus:ring-2 focus:ring-brand shadow-sm transition-all" />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black text-brand/80 uppercase mb-1.5">WhatsApp / Celular</label>
                          <input required={!user} type="tel" value={whatsappGuest} onChange={handleWhatsappChange} placeholder="(11) 99999-0000" className="w-full rounded-2xl bg-white dark:bg-background border-none p-3.5 text-sm font-bold text-text-base outline-none focus:ring-2 focus:ring-brand shadow-sm transition-all" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-brand/80 uppercase mb-1.5">Seu E-mail</label>
                          <input required={!user} type="email" value={emailGuest} onChange={(e) => setEmailGuest(e.target.value)} placeholder="exemplo@email.com" className="w-full rounded-2xl bg-white dark:bg-background border-none p-3.5 text-sm font-bold text-text-base outline-none focus:ring-2 focus:ring-brand shadow-sm transition-all" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  <div className="flex items-center justify-between mb-4 px-2">
                    <p className="text-sm font-bold text-text-muted">Total a pagar no local</p>
                    <p className="text-xl font-black text-text-base">R$ {Number(servicoSelecionado?.preco).toFixed(2)}</p>
                  </div>
                  
                  <button 
                    type="submit" 
                    disabled={loading || !horario} 
                    className="w-full cursor-pointer rounded-2xl bg-brand py-4 text-base font-black text-white hover:brightness-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand/25 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <><div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Processando...</>
                    ) : (
                      'Confirmar Agendamento'
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {passo === 4 && (
            <div className="bg-surface p-8 sm:p-10 rounded-[2rem] border border-border-line shadow-xl text-center animate-fadeIn">
              <div className="relative mx-auto w-24 h-24 mb-6">
                <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping"></div>
                <div className="relative h-24 w-24 bg-green-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-green-500/30">
                  <CheckCircle2 size={48} strokeWidth={2.5} />
                </div>
              </div>
              
              <h2 className="text-3xl font-black text-text-base mb-2">Tudo Certo!</h2>
              <p className="text-sm font-bold text-brand mb-8 uppercase tracking-widest">{servicoSelecionado?.nome_servico} garantido.</p>
              
              <div className="bg-background rounded-2xl p-5 mb-8 text-left border border-border-line">
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border-line">
                  <div className="h-12 w-12 bg-surface rounded-full flex items-center justify-center border border-border-line"><User size={20} className="text-text-muted"/></div>
                  <div>
                    <p className="text-xs font-bold text-text-muted uppercase">Profissional</p>
                    <p className="font-bold text-text-base">{barbeiroSelecionado?.nome}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-surface rounded-full flex items-center justify-center border border-border-line"><Calendar size={20} className="text-text-muted"/></div>
                  <div>
                    <p className="text-xs font-bold text-text-muted uppercase">Data e Hora</p>
                    <p className="font-bold text-text-base">{data.split('-').reverse().join('/')} às {horario}</p>
                  </div>
                </div>
              </div>

              {jaTinhaConta ? (
                <p className="text-sm text-text-muted mb-8 leading-relaxed">
                  O e-mail <strong>{emailGuest}</strong> já possui cadastro. <strong>Faça login</strong> para acompanhar o seu agendamento no painel!
                </p>
              ) : !user && emailGuest ? (
                <p className="text-sm text-text-muted mb-8 leading-relaxed">
                  Enviamos um link para o e-mail <strong>{emailGuest}</strong>. Confirme sua conta para facilitar seus próximos acessos.
                </p>
              ) : null}

              <div className="border-t border-border-line pt-6 mb-6">
                <AdicionarCalendario
                  barbearia={barbeariaContext}
                  servico={servicoSelecionado}
                  barbeiro={barbeiroSelecionado}
                  data={data}
                  horario={horario}
                  clienteNome={getDadosCliente().nome}
                  clienteEmail={getDadosCliente().email}
                  clienteWhatsapp={getDadosCliente().whatsapp}
                />
              </div>
              
              <div className="flex flex-col gap-3">
                {jaTinhaConta && (
                  <button onClick={() => { onOpenLogin(); navigate(`/${slug}`); }} className="w-full bg-brand text-white py-3.5 rounded-2xl text-sm font-bold hover:brightness-105 transition-all shadow-md cursor-pointer flex items-center justify-center gap-2">
                    <LogIn size={18}/> Fazer Login Agora
                  </button>
                )}
                <button onClick={() => navigate(`/${slug}`)} className={`w-full bg-surface border border-border-line py-3.5 rounded-2xl text-sm font-bold text-text-base hover:border-brand transition-all cursor-pointer`}>
                  Voltar para a Barbearia
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {isCancelModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-background/80 backdrop-blur-md p-4 animate-fadeIn">
          <div className="bg-surface border border-border-line w-full max-w-sm rounded-[2rem] p-8 shadow-2xl relative animate-scaleIn">
            <div className="h-16 w-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mx-auto mb-5"><AlertTriangle size={32} /></div>
            <h3 className="text-xl font-black text-text-base mb-2 text-center">Cancelar Reserva?</h3>
            <p className="text-sm text-text-muted mb-8 text-center leading-relaxed">Todo o progresso das suas escolhas será perdido e você voltará para a página principal.</p>
            
            <div className="flex flex-col gap-3">
              <button type="button" onClick={resetarECancelarTudo} className="w-full py-3.5 rounded-2xl bg-red-500 hover:bg-red-600 text-sm font-black text-white shadow-md shadow-red-500/20 transition-colors cursor-pointer">
                Sim, cancelar tudo
              </button>
              <button type="button" onClick={() => setIsCancelModalOpen(false)} className="w-full py-3.5 rounded-2xl bg-background border border-border-line text-sm font-bold text-text-base hover:border-brand transition-colors cursor-pointer">
                Não, continuar agendando
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}