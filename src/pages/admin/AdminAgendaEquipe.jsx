import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import { Calendar, Clock, User, Phone, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight, Scissors, Filter, Info, X, DollarSign, CreditCard, Wallet, PlusCircle, MinusCircle, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { getDayBoundsISO, getHojeFormatoHTML } from '../../utils/formatters';

export default function AdminAgendaEquipe() {
  const { profile } = useAuth();
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

  /** Minutos extras no fechamento só para o dia selecionado (sessão) */
  const [minutosExtraDia, setMinutosExtraDia] = useState(0);
  /** Horários ocultos manualmente neste dia */
  const [horariosOcultos, setHorariosOcultos] = useState([]);

  useEffect(() => {
    if (profile?.barbearia_id) {
      carregarConfigECarregarequipe();
    }
  }, [profile]);

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
      const { data: config } = await supabase.from('barbearias').select('hora_abertura, hora_fechamento').eq('id', profile.barbearia_id).single();
      setConfigAgenda(config);

      const { data: equipe } = await supabase.from('usuarios').select('id, nome').eq('barbearia_id', profile.barbearia_id).in('role', ['admin', 'gerente', 'funcionario']);
      setBarbeiros(equipe || []);
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
          id, data_hora, status_atendimento, forma_pagamento, nome_cliente_avulso, whatsapp_cliente_avulso,
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
        barbearia_id: profile.barbearia_id,
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
  };

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

  return (
    <div className="p-4 md:p-10 pb-24 md:pb-10 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-text-base">Agenda de Horários</h1>
        <p className="text-sm text-text-muted mt-1">Visualize horários livres e ocupados da equipe.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1 bg-surface p-4 rounded-2xl border border-border-line flex items-center justify-between shadow-sm">
          <button onClick={() => mudarDia(-1)} className="p-2 hover:bg-background rounded-lg text-text-muted cursor-pointer"><ChevronLeft size={24} /></button>
          <div className="flex flex-col items-center">
            <input type="date" value={dataSelecionada} onChange={(e) => setDataSelecionada(e.target.value)} className="bg-transparent font-bold text-lg outline-none cursor-pointer text-center text-text-base"/>
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

      <div className="animate-fadeIn">
        {loading && agendamentos.length === 0 && slotsHorarios.length === 0 ? (
          <div className="flex justify-center py-20"><div className="h-8 w-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {slotsHorarios.map((slotTime) => {
              const agendamentosNoSlot = agendamentos.filter(ag => {
                const agTime = new Date(ag.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
                return agTime === slotTime;
              });

              if (agendamentosNoSlot.length > 0) {
                return agendamentosNoSlot.map(ag => {
                  const isConcluido = ag.status_atendimento === 'concluido';
                  return (
                    <div 
                      key={ag.id} 
                      onClick={() => setAgendamentoDetalhe(ag)}
                      className={`border p-4 rounded-2xl cursor-pointer transition-colors shadow-sm flex flex-col justify-between ${isConcluido ? 'bg-green-500/5 border-green-500/20 hover:bg-green-500/10' : 'bg-brand/5 border-brand/20 hover:bg-brand/10'}`}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className={`font-black text-lg ${isConcluido ? 'text-green-600' : 'text-brand'}`}>{slotTime}</span>
                        <div className="flex gap-2">
                          {isConcluido && <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded bg-green-500 text-white">Pago</span>}
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded bg-surface border border-border-line text-text-muted">
                            {ag.barbeiros?.nome.split(' ')[0]}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className={`font-bold text-sm truncate ${isConcluido ? 'text-green-700/80 line-through' : 'text-text-base'}`}>{ag.nome_cliente_avulso || ag.clientes?.nome}</p>
                        <p className="text-xs text-text-muted flex items-center gap-1 mt-1"><Scissors size={12}/> {ag.servicos?.nome_servico}</p>
                      </div>
                    </div>
                  )
                });
              } else {
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
              }
            })}
          </div>
        )}
      </div>

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
                ) : !showCheckout ? (
                  <div className="flex gap-2">
                    <a href={`https://wa.me/55${(agendamentoDetalhe.whatsapp_cliente_avulso || agendamentoDetalhe.clientes?.whatsapp)?.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex-1 bg-surface border border-border-line text-text-base font-bold py-3 rounded-xl text-center text-sm hover:border-brand transition-colors">
                      WhatsApp
                    </a>
                    <button onClick={() => setShowCheckout(true)} className="flex-1 bg-brand text-white font-bold py-3 rounded-xl text-center text-sm hover:brightness-110 shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2">
                      <DollarSign size={16}/> Dar Baixa
                    </button>
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
    </div>
  );
}