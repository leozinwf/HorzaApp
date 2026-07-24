import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useOutletContext } from 'react-router-dom';
import { useModal } from '../../context/ModalContext';
import { Calendar, Clock, User, Phone, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight, Scissors, Filter, Info, X, DollarSign, CreditCard, Wallet, PlusCircle, MinusCircle, RotateCcw, CalendarClock } from 'lucide-react';
import toast from 'react-hot-toast';
import { getDayBoundsISO, getHojeFormatoHTML, dateTimeToISO } from '../../utils/formatters';
import ProSection from '../../components/shared/ProSection';
import { AgendaInteligenteBlock } from '../../components/shared/ProModuleBlocks';
import { FEATURE_KEYS } from '../../constants/planFeatures';

const parseHorarioMinutos = (horaStr) => {
  const [h, m] = String(horaStr).split(':').map((n) => parseInt(n, 10));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
};

const slotNoPassado = (dataSelecionada, slotTime) => {
  const hoje = getHojeFormatoHTML();
  if (dataSelecionada < hoje) return true;
  if (dataSelecionada > hoje) return false;
  const agoraMin = new Date().getHours() * 60 + new Date().getMinutes();
  const slotMin = parseHorarioMinutos(slotTime);
  return slotMin != null && slotMin <= agoraMin;
};

const horarioAgendamento = (ag) =>
  new Date(ag.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });

const duracaoAgendamentoMin = (ag) => ag.servicos?.duracao_minutos || 30;

const agendamentoIniciaNoSlot = (ag, slotTime) => horarioAgendamento(ag) === slotTime;

const slotCobertoPorAgendamento = (ag, slotTime, dataSelecionada) => {
  const inicio = new Date(ag.data_hora).getTime();
  const fim = inicio + duracaoAgendamentoMin(ag) * 60000;
  const slotMin = parseHorarioMinutos(slotTime);
  if (slotMin == null) return false;
  const slotInicio = new Date(dateTimeToISO(dataSelecionada, slotTime)).getTime();
  const slotFim = slotInicio + 30 * 60000;
  return slotInicio < fim && slotFim > inicio;
};

const agendamentoExpiradoSemResolucao = (ag, dataSelecionada) => {
  if (ag.status_atendimento !== 'agendado') return false;
  const hoje = getHojeFormatoHTML();
  if (dataSelecionada < hoje) return true;
  if (dataSelecionada > hoje) return false;
  const fim = new Date(ag.data_hora).getTime() + duracaoAgendamentoMin(ag) * 60000;
  return Date.now() >= fim;
};

const gerarHorariosLivres = ({
  config,
  excecoes = [],
  agendamentosDia = [],
  dataEscolhida,
  duracaoMinutos = 30,
  excluirAgendamentoId = null,
  permitirPassado = false,
}) => {
  if (!config) return [];
  const dias = config.dias_funcionamento || [0, 1, 2, 3, 4, 5, 6];
  const diaSemana = new Date(`${dataEscolhida}T12:00:00`).getDay();
  const isDiaPadrao = dias.includes(diaSemana);
  const hoje = getHojeFormatoHTML();
  const agoraBrString = new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' });
  const agora = new Date(agoraBrString);
  const abertura = (config.hora_abertura || '09:00:00').substring(0, 5);
  const fechamento = (config.hora_fechamento || '19:00:00').substring(0, 5);
  const horariosLivres = [];

  for (let h = 6; h <= 23; h++) {
    for (let m = 0; m < 60; m += 30) {
      const horaStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      const isHoraPadrao = horaStr >= abertura && horaStr < fechamento;
      const isAbertoPadrao = isDiaPadrao && isHoraPadrao;
      const excecao = excecoes.find((e) => e.horario?.startsWith(horaStr));
      const isAberto = (isAbertoPadrao && (!excecao || excecao.tipo !== 'bloqueio'))
        || (!isAbertoPadrao && excecao?.tipo === 'liberacao');
      if (!isAberto) continue;

      const horaAtualSlot = new Date(dateTimeToISO(dataEscolhida, horaStr));
      if (!permitirPassado && dataEscolhida === hoje && horaAtualSlot < agora) continue;

      const slotFim = new Date(horaAtualSlot.getTime() + duracaoMinutos * 60000);
      const conflito = agendamentosDia.some((ag) => {
        if (excluirAgendamentoId && ag.id === excluirAgendamentoId) return false;
        const agInicio = new Date(ag.data_hora);
        const duracaoConcorrente = ag.servicos?.duracao_minutos || 30;
        const agFim = new Date(agInicio.getTime() + duracaoConcorrente * 60000);
        return horaAtualSlot < agFim && slotFim > agInicio;
      });

      if (!conflito) horariosLivres.push(horaStr);
    }
  }
  return horariosLivres;
};

export default function AdminAgendaEquipe() {
  const { profile } = useAuth();
  const { adminBarbeariaId } = useOutletContext();
  const { showConfirm } = useModal();
  
  const [agendamentos, setAgendamentos] = useState([]);
  const [barbeiros, setBarbeiros] = useState([]);
  const [configAgenda, setConfigAgenda] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const hojeFormatoHTML = getHojeFormatoHTML();
  const [dataSelecionada, setDataSelecionada] = useState(hojeFormatoHTML);
  const [barbeiroFiltro, setBarbeiroFiltro] = useState('todos');

  // Estados para Modal de Detalhes do Agendamento
  const [agendamentoDetalhe, setAgendamentoDetalhe] = useState(null);
  
  // Estados para o Checkout (Baixa de Pagamento)
  const [showCheckout, setShowCheckout] = useState(false);
  const [formaPagamento, setFormaPagamento] = useState('dinheiro');
  const [processandoBaixa, setProcessandoBaixa] = useState(false);
  const [showReagendamento, setShowReagendamento] = useState(false);
  const [dataReagendamento, setDataReagendamento] = useState('');
  const [horarioReagendamento, setHorarioReagendamento] = useState('');
  const [horariosReagendamento, setHorariosReagendamento] = useState([]);
  const [carregandoHorariosReag, setCarregandoHorariosReag] = useState(false);
  const [salvandoReagendamento, setSalvandoReagendamento] = useState(false);

  /** Minutos extras no fechamento só para o dia selecionado (sessão) */
  const [minutosExtraDia, setMinutosExtraDia] = useState(0);
  /** Horários ocultos manualmente neste dia */
  const [horariosOcultos, setHorariosOcultos] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [showLancamentoManual, setShowLancamentoManual] = useState(false);
  const [slotManual, setSlotManual] = useState(null);
  const [salvandoManual, setSalvandoManual] = useState(false);
  const [formManual, setFormManual] = useState({
    nome: '',
    whatsapp: '',
    servicoId: '',
    barbeiroId: '',
    horaInicio: '',
    horaFim: '',
  });

  useEffect(() => {
    if (adminBarbeariaId) {
      carregarConfigECarregarequipe();
    }
  }, [adminBarbeariaId]);

  useEffect(() => {
    if (!configAgenda) return;

    if (barbeiros.length === 0) {
      setAgendamentos([]);
      setLoading(false);
      return;
    }

    buscarAgendaGeral();
  }, [dataSelecionada, barbeiroFiltro, barbeiros, configAgenda]);

  const carregarConfigECarregarequipe = async () => {
    if (!configAgenda) setLoading(true);
    try {
      const { data: config } = await supabase.from('barbearias').select('hora_abertura, hora_fechamento, dias_funcionamento').eq('id', adminBarbeariaId).single();
      setConfigAgenda(config);

      const { data: equipe } = await supabase.from('usuarios').select('id, nome').eq('barbearia_id', adminBarbeariaId).in('role', ['admin', 'gerente', 'funcionario']);
      setBarbeiros(equipe || []);

      const { data: listaServicos } = await supabase
        .from('servicos')
        .select('id, nome_servico, duracao_minutos, preco')
        .eq('barbearia_id', adminBarbeariaId)
        .eq('ativo', true)
        .order('nome_servico');
      setServicos(listaServicos || []);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar configurações da agenda.');
      setConfigAgenda({});
      setLoading(false);
    }
  };

  const buscarAgendaGeral = async () => {
    if (agendamentos.length === 0) setLoading(true);
    try {
      const barbeirosIds = barbeiros.map(b => b.id);
      if (barbeirosIds.length === 0) return;

      const { inicio: dataInicio, fim: dataFim } = getDayBoundsISO(dataSelecionada);

      let query = supabase.from('agendamentos').select(`
          id, data_hora, status_atendimento, forma_pagamento, barbeiro_id, servico_id,
          nome_cliente_avulso, whatsapp_cliente_avulso,
          servicos (nome_servico, duracao_minutos, preco), clientes:usuarios!agendamentos_cliente_id_fkey(nome, whatsapp),
          barbeiros:usuarios!agendamentos_barbeiro_id_fkey(nome)
        `).gte('data_hora', dataInicio).lte('data_hora', dataFim);

      if (barbeiroFiltro !== 'todos') query = query.eq('barbeiro_id', barbeiroFiltro);
      else query = query.in('barbeiro_id', barbeirosIds);

      const { data, error } = await query;
      if (error) throw error;
      setAgendamentos(data || []);
    } catch (err) {
      toast.error('Não foi possível carregar a agenda.');
    } finally {
      setLoading(false);
    }
  };

  const mudarDia = (dias) => {
    const novaData = new Date(`${dataSelecionada}T12:00:00`);
    novaData.setDate(novaData.getDate() + dias);
    setDataSelecionada(novaData.toLocaleDateString('en-CA'));
  };

  // ✨ FUNÇÃO PARA DAR BAIXA NO AGENDAMENTO (PAGAMENTO)
  const handleDarBaixa = async () => {
    if (agendamentoDetalhe?.status_atendimento === 'concluido') {
      toast.error('Este agendamento já foi finalizado.');
      return;
    }

    setProcessandoBaixa(true);
    try {
      const { error: rpcError } = await supabase.rpc('concluir_agendamento_e_pontuar', {
        p_agendamento_id: agendamentoDetalhe.id
      });
      if (rpcError) throw rpcError;

      const { error: pagamentoError } = await supabase
        .from('agendamentos')
        .update({ forma_pagamento: formaPagamento })
        .eq('id', agendamentoDetalhe.id);

      if (pagamentoError) throw pagamentoError;

      const nomeCliente = agendamentoDetalhe.nome_cliente_avulso || agendamentoDetalhe.clientes?.nome || 'Cliente';
      const { error: financeiroError } = await supabase.from('transacoes').insert([{
        barbearia_id: adminBarbeariaId,
        tipo: 'entrada',
        descricao: `Serviço: ${agendamentoDetalhe.servicos?.nome_servico} - Cliente: ${nomeCliente}`,
        valor: agendamentoDetalhe.servicos?.preco || 0,
        categoria: 'Serviços',
        forma_pagamento: formaPagamento,
        data_transacao: new Date().toISOString(),
        status: 'concluido'
      }]);

      if (financeiroError) throw financeiroError;

      toast.success('Atendimento finalizado e pagamento registrado!');
      setAgendamentoDetalhe(null);
      setShowCheckout(false);
      buscarAgendaGeral();

    } catch (err) {
      toast.error('Erro ao dar baixa: ' + err.message);
    } finally {
      setProcessandoBaixa(false);
    }
  };

  const fecharModal = () => {
    setAgendamentoDetalhe(null);
    setShowCheckout(false);
    setShowReagendamento(false);
    setDataReagendamento('');
    setHorarioReagendamento('');
    setHorariosReagendamento([]);
  };

  const abrirReagendamento = () => {
    if (!agendamentoDetalhe) return;
    const dataAtual = new Date(agendamentoDetalhe.data_hora).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
    setDataReagendamento(dataAtual);
    setHorarioReagendamento('');
    setShowReagendamento(true);
    setShowCheckout(false);
  };

  useEffect(() => {
    if (!showReagendamento || !agendamentoDetalhe || !dataReagendamento || !configAgenda) return;

    let ativo = true;
    const carregarHorarios = async () => {
      setCarregandoHorariosReag(true);
      try {
        const { data: excecoes } = await supabase
          .from('excecoes_agenda')
          .select('*')
          .eq('barbeiro_id', agendamentoDetalhe.barbeiro_id)
          .eq('data', dataReagendamento);

        const { inicio, fim } = getDayBoundsISO(dataReagendamento);
        const { data: agsDia } = await supabase
          .from('agendamentos')
          .select('id, data_hora, servicos(duracao_minutos)')
          .eq('barbeiro_id', agendamentoDetalhe.barbeiro_id)
          .not('status_atendimento', 'eq', 'cancelado')
          .not('status_atendimento', 'eq', 'ausente')
          .gte('data_hora', inicio)
          .lte('data_hora', fim);

        if (!ativo) return;

        const livres = gerarHorariosLivres({
          config: configAgenda,
          excecoes: excecoes || [],
          agendamentosDia: agsDia || [],
          dataEscolhida: dataReagendamento,
          duracaoMinutos: agendamentoDetalhe.servicos?.duracao_minutos || 30,
          excluirAgendamentoId: agendamentoDetalhe.id,
          permitirPassado: false,
        });

        setHorariosReagendamento(livres);
        setHorarioReagendamento((atual) => (livres.includes(atual) ? atual : ''));
      } catch {
        if (ativo) {
          setHorariosReagendamento([]);
          toast.error('Não foi possível carregar horários disponíveis.');
        }
      } finally {
        if (ativo) setCarregandoHorariosReag(false);
      }
    };

    carregarHorarios();
    return () => { ativo = false; };
  }, [showReagendamento, agendamentoDetalhe, dataReagendamento, configAgenda]);

  const handleConfirmarReagendamento = async () => {
    if (!agendamentoDetalhe || !dataReagendamento || !horarioReagendamento) {
      toast.error('Selecione a data e o novo horário.');
      return;
    }

    const hoje = getHojeFormatoHTML();
    if (dataReagendamento === hoje) {
      const agoraSp = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
      const minutosAgora = agoraSp.getHours() * 60 + agoraSp.getMinutes();
      const minutosSlot = parseHorarioMinutos(horarioReagendamento);
      if (minutosSlot != null && minutosSlot <= minutosAgora) {
        toast.error('Este horário já passou. Escolha um horário futuro.');
        return;
      }
    }

    setSalvandoReagendamento(true);
    try {
      const novaDataHora = dateTimeToISO(dataReagendamento, horarioReagendamento);
      const { error } = await supabase
        .from('agendamentos')
        .update({ data_hora: novaDataHora })
        .eq('id', agendamentoDetalhe.id);

      if (error) throw error;

      toast.success('Agendamento reagendado! O horário anterior foi liberado.');
      setDataSelecionada(dataReagendamento);
      fecharModal();
      buscarAgendaGeral();
    } catch (err) {
      toast.error('Erro ao reagendar: ' + err.message);
    } finally {
      setSalvandoReagendamento(false);
    }
  };

  const handleMarcarAusente = async (ag) => {
    try {
      const { error } = await supabase
        .from('agendamentos')
        .update({ status_atendimento: 'ausente' })
        .eq('id', ag.id);
      if (error) throw error;
      toast.success('Registrado: cliente não compareceu.');
      setAgendamentoDetalhe(null);
      setShowCheckout(false);
      buscarAgendaGeral();
    } catch (err) {
      toast.error('Erro ao registrar falta: ' + err.message);
    }
  };

  const confirmarFalta = (ag) => {
    showConfirm(
      'Cliente faltou?',
      `Confirmar que ${ag.nome_cliente_avulso || ag.clientes?.nome || 'o cliente'} não compareceu às ${horarioAgendamento(ag)}? Isso entra nas métricas de no-show.`,
      () => handleMarcarAusente(ag)
    );
  };

  const abrirResolucaoAtendimento = (ag) => {
    setAgendamentoDetalhe(ag);
    setShowCheckout(true);
  };

  const pendentesResolucao = agendamentos.filter((ag) =>
    agendamentoExpiradoSemResolucao(ag, dataSelecionada)
  );

  const detalhePrecisaResolucao = agendamentoDetalhe
    ? agendamentoExpiradoSemResolucao(agendamentoDetalhe, dataSelecionada)
    : false;

  useEffect(() => {
    setMinutosExtraDia(0);
    setHorariosOcultos([]);
  }, [dataSelecionada]);

  const estenderHorarioDia = (minutos = 60) => {
    setMinutosExtraDia((prev) => prev + minutos);
    toast.success(`+${minutos} min adicionados ao expediente deste dia.`);
  };

  const removerExtensao = () => {
    setMinutosExtraDia(0);
    toast.success('Extensão de horário removida.');
  };

  const ocultarHorario = (slotTime) => {
    setHorariosOcultos((prev) => (prev.includes(slotTime) ? prev : [...prev, slotTime]));
    toast.success(`Horário ${slotTime} ocultado neste dia.`);
  };

  const restaurarHorariosOcultos = () => {
    setHorariosOcultos([]);
    toast.success('Horários ocultos restaurados.');
  };

  const gerarSlots = () => {
    if (!configAgenda) return [];
    const slots = [];
    let atual = new Date(`2000-01-01T${configAgenda.hora_abertura || '09:00:00'}`);
    const fimBase = new Date(`2000-01-01T${configAgenda.hora_fechamento || '19:00:00'}`);
    const fim = new Date(fimBase.getTime() + minutosExtraDia * 60000);

    while (atual <= fim) {
      slots.push(atual.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
      atual.setMinutes(atual.getMinutes() + 30);
    }
    return slots;
  };

  const slotsHorarios = gerarSlots().filter((s) => !horariosOcultos.includes(s));

  const abrirLancamentoManual = (slotTime) => {
    const proximoSlot = slotsHorarios.find((s) => parseHorarioMinutos(s) > parseHorarioMinutos(slotTime));
    setSlotManual(slotTime);
    setFormManual({
      nome: '',
      whatsapp: '',
      servicoId: servicos[0]?.id || '',
      barbeiroId: barbeiroFiltro !== 'todos' ? barbeiroFiltro : (barbeiros[0]?.id || ''),
      horaInicio: slotTime,
      horaFim: proximoSlot || slotTime,
    });
    setShowLancamentoManual(true);
  };

  const opcoesHoraFim = (horaInicio) =>
    slotsHorarios.filter((s) => parseHorarioMinutos(s) > parseHorarioMinutos(horaInicio));

  const handleSalvarLancamentoManual = async (e) => {
    e.preventDefault();
    if (!formManual.servicoId || !formManual.barbeiroId || !formManual.horaInicio || !formManual.horaFim) {
      toast.error('Preencha serviço, profissional e horários.');
      return;
    }
    if (parseHorarioMinutos(formManual.horaFim) <= parseHorarioMinutos(formManual.horaInicio)) {
      toast.error('O horário final deve ser depois do inicial.');
      return;
    }

    setSalvandoManual(true);
    try {
      const minutosRange = parseHorarioMinutos(formManual.horaFim) - parseHorarioMinutos(formManual.horaInicio);
      let servicoId = formManual.servicoId;
      const servicoEscolhido = servicos.find((s) => s.id === servicoId);
      if (servicoEscolhido && servicoEscolhido.duracao_minutos < minutosRange) {
        const compativel = servicos.find((s) => s.duracao_minutos >= minutosRange);
        if (compativel) servicoId = compativel.id;
      }

      const whatsappDigits = (formManual.whatsapp || '11999999999').replace(/\D/g, '').slice(0, 11);

      const { error } = await supabase.from('agendamentos').insert([{
        barbearia_id: adminBarbeariaId,
        barbeiro_id: formManual.barbeiroId,
        servico_id: servicoId,
        data_hora: dateTimeToISO(dataSelecionada, formManual.horaInicio),
        status_pagamento: 'pagar_na_hora',
        status_atendimento: 'agendado',
        nome_cliente_avulso: formManual.nome.trim() || 'Cliente avulso',
        whatsapp_cliente_avulso: whatsappDigits,
      }]);

      if (error) throw error;
      toast.success('Atendimento lançado manualmente.');
      setShowLancamentoManual(false);
      setSlotManual(null);
      buscarAgendaGeral();
    } catch (err) {
      toast.error('Erro ao lançar: ' + err.message);
    } finally {
      setSalvandoManual(false);
    }
  };

  return (
    <div className="p-4 md:p-10 md:pb-10 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-text-base">Agenda de Horários</h1>
        <p className="text-sm text-text-muted mt-1">Visualize horários livres e ocupados da equipe.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1 bg-surface p-4 rounded-2xl border border-border-line flex items-center justify-between shadow-sm">
          <button onClick={() => mudarDia(-1)} className="p-2 hover:bg-background rounded-lg text-text-muted cursor-pointer"><ChevronLeft size={24} /></button>
          <div className="flex flex-col items-center">
            <input type="date" value={dataSelecionada} onChange={(e) => setDataSelecionada(e.target.value)} className="bg-transparent font-bold text-lg outline-none cursor-pointer text-center text-text-base [color-scheme:light] dark:[color-scheme:dark]"/>
          </div>
          <button onClick={() => mudarDia(1)} className="p-2 hover:bg-background rounded-lg text-text-muted cursor-pointer"><ChevronRight size={24} /></button>
        </div>

        <div className="bg-surface p-4 rounded-2xl border border-border-line flex items-center gap-3 shadow-sm min-w-[250px]">
          <div className="p-2 bg-brand/10 text-brand rounded-lg hidden sm:block"><Filter size={20} /></div>
          <div className="flex-1">
            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Filtrar por Profissional</label>
            <select value={barbeiroFiltro} onChange={(e) => setBarbeiroFiltro(e.target.value)} className="w-full bg-background border border-border-line p-2 rounded-xl text-sm font-bold text-text-base outline-none focus:border-brand cursor-pointer">
              <option value="todos">Toda a Equipe</option>
              {barbeiros.map(b => <option key={b.id} value={b.id}>{b.nome}</option>)}
            </select>
          </div>
        </div>

        <div className="bg-surface p-4 rounded-2xl border border-border-line shadow-sm flex flex-col gap-2 min-w-[220px]">
          <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider">Estender expediente do dia</label>
          <div className="flex gap-2">
            <button type="button" onClick={() => estenderHorarioDia(30)} className="flex-1 bg-background border border-border-line py-2 rounded-xl text-xs font-bold hover:border-brand cursor-pointer">
              +30 min
            </button>
            <button type="button" onClick={() => estenderHorarioDia(60)} className="flex-1 bg-brand text-white py-2 rounded-xl text-xs font-bold hover:brightness-110 cursor-pointer flex items-center justify-center gap-1">
              <PlusCircle size={14} /> +1h
            </button>
            <button type="button" onClick={() => estenderHorarioDia(120)} className="flex-1 bg-background border border-border-line py-2 rounded-xl text-xs font-bold hover:border-brand cursor-pointer">
              +2h
            </button>
          </div>
          {minutosExtraDia > 0 && (
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] text-brand font-bold">+{minutosExtraDia} min extra</p>
              <button type="button" onClick={removerExtensao} className="text-[10px] font-bold text-red-500 hover:underline cursor-pointer flex items-center gap-1">
                <RotateCcw size={12} /> Remover extensão
              </button>
            </div>
          )}
          {horariosOcultos.length > 0 && (
            <button type="button" onClick={restaurarHorariosOcultos} className="text-[10px] font-bold text-text-muted hover:text-brand cursor-pointer">
              Restaurar {horariosOcultos.length} horário(s) oculto(s)
            </button>
          )}
        </div>
      </div>

      {pendentesResolucao.length > 0 && (
        <div className="mb-6 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={20} />
            <div>
              <p className="font-black text-amber-800 text-sm">
                {pendentesResolucao.length} horário{pendentesResolucao.length > 1 ? 's' : ''} aguardando confirmação
              </p>
              <p className="text-xs text-amber-700/90 mt-0.5">
                Informe se o cliente faltou ou se o atendimento foi realizado — usado nas métricas da barbearia.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="animate-fadeIn">
        {loading && agendamentos.length === 0 && slotsHorarios.length === 0 ? (
          <div className="flex justify-center py-20"><div className="h-8 w-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {slotsHorarios.map((slotTime) => {
              const agendamentosNoSlot = agendamentos.filter((ag) => agendamentoIniciaNoSlot(ag, slotTime));
              const cobertoPorOutro = agendamentos.some(
                (ag) => !agendamentoIniciaNoSlot(ag, slotTime) && slotCobertoPorAgendamento(ag, slotTime, dataSelecionada)
              );
              const passou = slotNoPassado(dataSelecionada, slotTime);

              if (cobertoPorOutro) return null;

              if (agendamentosNoSlot.length > 0) {
                return agendamentosNoSlot.map(ag => {
                  const isConcluido = ag.status_atendimento === 'concluido';
                  const isAusente = ag.status_atendimento === 'ausente';
                  const precisaResolucao = agendamentoExpiradoSemResolucao(ag, dataSelecionada);

                  return (
                    <div
                      key={ag.id}
                      onClick={() => !precisaResolucao && setAgendamentoDetalhe(ag)}
                      className={`border p-4 rounded-2xl transition-colors shadow-sm flex flex-col justify-between ${
                        precisaResolucao
                          ? 'border-amber-500/50 bg-amber-500/5 ring-2 ring-amber-500/20'
                          : isConcluido
                            ? 'bg-green-500/5 border-green-500/20 hover:bg-green-500/10 cursor-pointer'
                            : isAusente
                              ? 'bg-amber-500/5 border-amber-500/20 opacity-80'
                              : 'bg-brand/5 border-brand/20 hover:bg-brand/10 cursor-pointer'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className={`font-black text-lg ${
                          precisaResolucao ? 'text-amber-700' : isConcluido ? 'text-green-600' : isAusente ? 'text-amber-600' : 'text-brand'
                        }`}>
                          {slotTime}
                        </span>
                        <div className="flex gap-2 flex-wrap justify-end">
                          {precisaResolucao && (
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded bg-amber-500 text-white animate-pulse">
                              Pendente
                            </span>
                          )}
                          {isConcluido && (
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded bg-green-500 text-white">Concluído</span>
                          )}
                          {isAusente && (
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded bg-amber-500/20 text-amber-700 border border-amber-500/30">Faltou</span>
                          )}
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded bg-surface border border-border-line text-text-muted">
                            {ag.barbeiros?.nome.split(' ')[0]}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className={`font-bold text-sm truncate ${
                          isConcluido ? 'text-green-700/80 line-through' : isAusente ? 'text-amber-700/80 line-through' : 'text-text-base'
                        }`}>
                          {ag.nome_cliente_avulso || ag.clientes?.nome}
                        </p>
                        <p className="text-xs text-text-muted flex items-center gap-1 mt-1">
                          <Scissors size={12}/> {ag.servicos?.nome_servico}
                        </p>
                      </div>

                      {precisaResolucao && (
                        <div className="mt-4 pt-3 border-t border-amber-500/20 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); confirmarFalta(ag); }}
                            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-amber-500/40 bg-surface text-xs font-black text-amber-700 hover:bg-amber-500/10 cursor-pointer"
                          >
                            <AlertCircle size={14} /> Cliente faltou
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); abrirResolucaoAtendimento(ag); }}
                            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-brand text-white text-xs font-black hover:brightness-110 cursor-pointer"
                          >
                            <CheckCircle2 size={14} /> Atendimento feito
                          </button>
                        </div>
                      )}
                    </div>
                  );
                });
              }

              if (passou) {
                return (
                  <div
                    key={slotTime}
                    className="bg-background/60 border border-border-line/60 p-4 rounded-2xl flex items-center justify-between opacity-50"
                  >
                    <div>
                      <span className="font-black text-text-muted/70 text-lg line-through decoration-text-muted/40">{slotTime}</span>
                      <p className="text-[10px] font-bold text-text-muted mt-1 uppercase tracking-wider">Horário passado · sem registro</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => abrirLancamentoManual(slotTime)}
                      className="text-[10px] font-black uppercase tracking-wider px-3 py-2 rounded-xl border border-border-line bg-surface text-text-muted hover:text-brand hover:border-brand/40 cursor-pointer whitespace-nowrap"
                    >
                      Lançar manual
                    </button>
                  </div>
                );
              }

              return (
                  <div key={slotTime} className="bg-surface border border-dashed border-border-line p-4 rounded-2xl flex items-center justify-between opacity-80 hover:opacity-100 transition-opacity group">
                    <span className="font-black text-text-muted text-lg">{slotTime}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-green-500 flex items-center gap-1"><CheckCircle2 size={14}/> Livre</span>
                      <button
                        type="button"
                        onClick={() => ocultarHorario(slotTime)}
                        className="opacity-100 sm:opacity-0 group-hover:opacity-100 p-1.5 rounded-lg border border-border-line text-red-500 hover:bg-red-500/10 cursor-pointer"
                        title="Ocultar este horário"
                      >
                        <MinusCircle size={16} />
                      </button>
                    </div>
                  </div>
                );
            })}
          </div>
        )}
      </div>

      <ProSection
        featureKey={FEATURE_KEYS.AGENDA_INTELIGENTE}
        title="Agenda Inteligente"
        description="Lista de espera, recorrentes e encaixe automático — Horza Pro."
        overlay
      >
        <AgendaInteligenteBlock />
      </ProSection>

      {/* MODAL DETALHE DO AGENDAMENTO & CHECKOUT */}
      {agendamentoDetalhe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface rounded-3xl w-full max-w-sm shadow-2xl p-6 relative">
            <button onClick={fecharModal} className="absolute top-4 right-4 text-text-muted hover:bg-background p-2 rounded-full cursor-pointer"><X size={20}/></button>
            <h3 className="text-xl font-black text-text-base mb-4 flex items-center gap-2"><Info className="text-brand"/> Resumo da Reserva</h3>
            
            <div className="space-y-4">
              <div className="bg-background border border-border-line p-4 rounded-xl">
                <p className="text-xs text-text-muted font-bold uppercase mb-1">Cliente</p>
                <p className="font-bold text-text-base">{agendamentoDetalhe.nome_cliente_avulso || agendamentoDetalhe.clientes?.nome}</p>
                <p className="text-sm text-text-muted">{agendamentoDetalhe.whatsapp_cliente_avulso || agendamentoDetalhe.clientes?.whatsapp}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-background border border-border-line p-4 rounded-xl">
                  <p className="text-xs text-text-muted font-bold uppercase mb-1">Horário</p>
                  <p className="font-bold text-brand">{new Date(agendamentoDetalhe.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}</p>
                </div>
                <div className="bg-background border border-border-line p-4 rounded-xl">
                  <p className="text-xs text-text-muted font-bold uppercase mb-1">Valor</p>
                  <p className="font-bold text-text-base text-sm truncate">R$ {Number(agendamentoDetalhe.servicos?.preco || 0).toFixed(2).replace('.', ',')}</p>
                </div>
              </div>

              {/* SESSÃO DE BAIXA E PAGAMENTO */}
              <div className="pt-4 border-t border-border-line">
                {agendamentoDetalhe.status_atendimento === 'concluido' ? (
                  <div className="bg-green-500/10 text-green-600 p-4 rounded-xl text-center flex flex-col items-center justify-center gap-1">
                    <CheckCircle2 size={24} />
                    <span className="font-black text-sm uppercase tracking-wider">Atendimento Finalizado</span>
                    <span className="text-xs font-bold opacity-80">Pago via {agendamentoDetalhe.forma_pagamento}</span>
                  </div>
                ) : agendamentoDetalhe.status_atendimento === 'ausente' ? (
                  <div className="bg-amber-500/10 text-amber-700 p-4 rounded-xl text-center flex flex-col items-center justify-center gap-1">
                    <AlertCircle size={24} />
                    <span className="font-black text-sm uppercase tracking-wider">Cliente não compareceu</span>
                    <span className="text-xs font-bold opacity-80">Registrado para métricas de no-show</span>
                  </div>
                ) : detalhePrecisaResolucao && !showCheckout ? (
                  <div className="space-y-3">
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                      <p className="text-sm font-black text-amber-800">Horário já passou</p>
                      <p className="text-xs text-amber-700 mt-1">Confirme o que aconteceu com este agendamento:</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => confirmarFalta(agendamentoDetalhe)}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-amber-500/40 bg-surface font-bold text-sm text-amber-700 hover:bg-amber-500/10 cursor-pointer"
                    >
                      <AlertCircle size={18} /> Cliente faltou (no-show)
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCheckout(true)}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-brand text-white font-bold text-sm hover:brightness-110 cursor-pointer"
                    >
                      <CheckCircle2 size={18} /> Atendimento realizado — dar baixa
                    </button>
                    <button
                      type="button"
                      onClick={abrirReagendamento}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-border-line bg-background font-bold text-sm hover:border-brand cursor-pointer"
                    >
                      <CalendarClock size={16} /> Reagendar para outro horário
                    </button>
                  </div>
                ) : showReagendamento ? (
                  <div className="animate-slideUp space-y-4">
                    <div className="bg-brand/5 border border-brand/20 rounded-xl p-4">
                      <p className="text-sm font-black text-text-base flex items-center gap-2">
                        <CalendarClock size={18} className="text-brand" /> Reagendar reserva
                      </p>
                      <p className="text-xs text-text-muted mt-1">
                        O horário atual será liberado automaticamente para novos agendamentos.
                      </p>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-text-muted uppercase tracking-wider mb-2">Nova data</label>
                      <input
                        type="date"
                        value={dataReagendamento}
                        onChange={(e) => {
                          setDataReagendamento(e.target.value);
                          setHorarioReagendamento('');
                        }}
                        className="w-full rounded-xl bg-background border border-border-line p-3 text-sm font-bold text-text-base focus:border-brand outline-none cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-text-muted uppercase tracking-wider mb-2">Novo horário</label>
                      {carregandoHorariosReag ? (
                        <div className="flex justify-center py-6">
                          <div className="h-6 w-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : horariosReagendamento.length === 0 ? (
                        <p className="text-sm text-text-muted text-center py-4 bg-background rounded-xl border border-dashed border-border-line">
                          Nenhum horário livre nesta data para {agendamentoDetalhe.barbeiros?.nome?.split(' ')[0] || 'este profissional'}.
                        </p>
                      ) : (
                        <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto horza-scroll">
                          {horariosReagendamento.map((h) => (
                            <button
                              key={h}
                              type="button"
                              onClick={() => setHorarioReagendamento(h)}
                              className={`py-2.5 rounded-xl text-sm font-black border transition-colors cursor-pointer ${
                                horarioReagendamento === h
                                  ? 'bg-brand text-white border-brand'
                                  : 'bg-background border-border-line hover:border-brand/40'
                              }`}
                            >
                              {h}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowReagendamento(false)}
                        className="flex-1 bg-background border border-border-line py-3 rounded-xl text-sm font-bold hover:bg-border-line cursor-pointer"
                      >
                        Voltar
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmarReagendamento}
                        disabled={salvandoReagendamento || !horarioReagendamento}
                        className="flex-1 bg-brand text-white py-3 rounded-xl text-sm font-black hover:brightness-110 disabled:opacity-50 cursor-pointer"
                      >
                        {salvandoReagendamento ? 'Salvando...' : 'Confirmar'}
                      </button>
                    </div>
                  </div>
                ) : !showCheckout ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <a href={`https://wa.me/55${(agendamentoDetalhe.whatsapp_cliente_avulso || agendamentoDetalhe.clientes?.whatsapp)?.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex-1 bg-surface border border-border-line text-text-base font-bold py-3 rounded-xl text-center text-sm hover:border-brand transition-colors">
                        WhatsApp
                      </a>
                      <button onClick={() => setShowCheckout(true)} className="flex-1 bg-brand text-white font-bold py-3 rounded-xl text-center text-sm hover:brightness-110 shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2">
                        <DollarSign size={16}/> Dar Baixa
                      </button>
                    </div>
                    {agendamentoDetalhe.status_atendimento === 'agendado' && (
                      <button
                        type="button"
                        onClick={abrirReagendamento}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-border-line bg-background font-bold text-sm text-text-base hover:border-brand hover:text-brand cursor-pointer"
                      >
                        <CalendarClock size={16} /> Reagendar horário
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="animate-slideUp space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-text-muted uppercase tracking-wider mb-2">Forma de Pagamento</label>
                      <div className="grid grid-cols-3 gap-2">
                        <button onClick={() => setFormaPagamento('dinheiro')} className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${formaPagamento === 'dinheiro' ? 'bg-brand/10 border-brand text-brand' : 'bg-background border-border-line text-text-muted hover:border-brand/50'}`}>
                          <Wallet size={20} className="mb-1" /> Dinheiro
                        </button>
                        <button onClick={() => setFormaPagamento('cartao')} className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${formaPagamento === 'cartao' ? 'bg-brand/10 border-brand text-brand' : 'bg-background border-border-line text-text-muted hover:border-brand/50'}`}>
                          <CreditCard size={20} className="mb-1" /> Cartão
                        </button>
                        <button onClick={() => setFormaPagamento('pix')} className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${formaPagamento === 'pix' ? 'bg-brand/10 border-brand text-brand' : 'bg-background border-border-line text-text-muted hover:border-brand/50'}`}>
                          <svg className="w-5 h-5 mb-1" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5L20 8.5L12 14.5L4 8.5L12 2.5ZM12 5.5L8 8.5L12 11.5L16 8.5L12 5.5ZM12 10.5L20 16.5L12 22.5L4 16.5L12 10.5ZM12 13.5L8 16.5L12 19.5L16 16.5L12 13.5Z"/></svg> PIX
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setShowCheckout(false)} className="w-1/3 bg-background border border-border-line text-text-base py-3 rounded-xl text-sm font-bold hover:bg-border-line transition-colors cursor-pointer">
                        Cancelar
                      </button>
                      <button onClick={handleDarBaixa} disabled={processandoBaixa} className="w-2/3 bg-green-500 text-white py-3 rounded-xl text-sm font-black hover:brightness-110 shadow-md transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2">
                        {processandoBaixa ? 'Processando...' : <><CheckCircle2 size={18}/> Confirmar R$ {Number(agendamentoDetalhe.servicos?.preco || 0).toFixed(2).replace('.', ',')}</>}
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {showLancamentoManual && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface rounded-3xl w-full max-w-md shadow-2xl p-6 relative">
            <button
              type="button"
              onClick={() => setShowLancamentoManual(false)}
              className="absolute top-4 right-4 text-text-muted hover:bg-background p-2 rounded-full cursor-pointer"
            >
              <X size={20} />
            </button>
            <h3 className="text-xl font-black text-text-base mb-1 flex items-center gap-2">
              <PlusCircle className="text-brand" size={22} /> Lançamento manual
            </h3>
            <p className="text-xs text-text-muted mb-5">
              Registre um corte ou barba retroativo para {slotManual} em {new Date(`${dataSelecionada}T12:00:00`).toLocaleDateString('pt-BR')}.
            </p>

            <form onSubmit={handleSalvarLancamentoManual} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-text-muted uppercase mb-1">Cliente (opcional)</label>
                <input
                  value={formManual.nome}
                  onChange={(e) => setFormManual((f) => ({ ...f, nome: e.target.value }))}
                  placeholder="Ex: João — avulso"
                  className="w-full rounded-xl bg-background border border-border-line p-3 text-sm focus:border-brand outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-text-muted uppercase mb-1">WhatsApp (opcional)</label>
                <input
                  value={formManual.whatsapp}
                  onChange={(e) => setFormManual((f) => ({ ...f, whatsapp: e.target.value }))}
                  placeholder="(11) 99999-9999"
                  className="w-full rounded-xl bg-background border border-border-line p-3 text-sm focus:border-brand outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-text-muted uppercase mb-1">Serviço *</label>
                <select
                  required
                  value={formManual.servicoId}
                  onChange={(e) => setFormManual((f) => ({ ...f, servicoId: e.target.value }))}
                  className="w-full rounded-xl bg-background border border-border-line p-3 text-sm font-bold focus:border-brand outline-none cursor-pointer"
                >
                  <option value="">Selecione...</option>
                  {servicos.map((s) => (
                    <option key={s.id} value={s.id}>{s.nome_servico} ({s.duracao_minutos} min)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-text-muted uppercase mb-1">Profissional *</label>
                <select
                  required
                  value={formManual.barbeiroId}
                  onChange={(e) => setFormManual((f) => ({ ...f, barbeiroId: e.target.value }))}
                  className="w-full rounded-xl bg-background border border-border-line p-3 text-sm font-bold focus:border-brand outline-none cursor-pointer"
                >
                  {barbeiros.map((b) => (
                    <option key={b.id} value={b.id}>{b.nome}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-text-muted uppercase mb-1">Início *</label>
                  <select
                    required
                    value={formManual.horaInicio}
                    onChange={(e) => {
                      const horaInicio = e.target.value;
                      const fims = opcoesHoraFim(horaInicio);
                      setFormManual((f) => ({
                        ...f,
                        horaInicio,
                        horaFim: fims.includes(f.horaFim) ? f.horaFim : (fims[0] || horaInicio),
                      }));
                    }}
                    className="w-full rounded-xl bg-background border border-border-line p-3 text-sm font-bold focus:border-brand outline-none cursor-pointer"
                  >
                    {slotsHorarios.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-text-muted uppercase mb-1">Até *</label>
                  <select
                    required
                    value={formManual.horaFim}
                    onChange={(e) => setFormManual((f) => ({ ...f, horaFim: e.target.value }))}
                    className="w-full rounded-xl bg-background border border-border-line p-3 text-sm font-bold focus:border-brand outline-none cursor-pointer"
                  >
                    {opcoesHoraFim(formManual.horaInicio).map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <p className="text-[10px] text-text-muted">
                O intervalo selecionado ajuda a registrar o período do atendimento. O agendamento será criado no horário de início.
              </p>

              <button
                type="submit"
                disabled={salvandoManual || servicos.length === 0}
                className="w-full bg-brand text-white font-black py-3.5 rounded-xl hover:brightness-110 disabled:opacity-50 cursor-pointer"
              >
                {salvandoManual ? 'Salvando...' : 'Confirmar lançamento'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}