import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import {
  Calendar, Clock, User, Phone, CheckCircle2, AlertCircle,
  ChevronLeft, ChevronRight, Scissors, Lock, Unlock, CalendarDays,
  Info, CalendarOff, RefreshCcw
} from 'lucide-react';
import { getDayBoundsISO, getHojeFormatoHTML } from '../../utils/formatters';

export default function AgendaBarbeiro() {
  const { user, profile } = useAuth();
  const { showAlert, showConfirm } = useModal();

  const [agendamentos, setAgendamentos] = useState([]);
  const [configBarbearia, setConfigBarbearia] = useState(null);
  const [excecoes, setExcecoes] = useState([]);
  const [loading, setLoading] = useState(true);

  const hojeFormatoHTML = getHojeFormatoHTML();
  const [dataSelecionada, setDataSelecionada] = useState(hojeFormatoHTML);
  const [tab, setTab] = useState('agenda');

  useEffect(() => {
    if (user && profile?.barbearia_id) {
      carregarTudo();
    }
  }, [user, profile, dataSelecionada]);

  const carregarTudo = async () => {
    setLoading(true);
    try {
      const { data: config } = await supabase.from('barbearias').select('hora_abertura, hora_fechamento, dias_funcionamento').eq('id', profile.barbearia_id).single();
      setConfigBarbearia(config);

      const { data: exc } = await supabase.from('excecoes_agenda').select('*').eq('barbeiro_id', user.id).eq('data', dataSelecionada);
      setExcecoes(exc || []);

      const { inicio: dataInicio, fim: dataFim } = getDayBoundsISO(dataSelecionada);

      // ✨ CORREÇÃO DO BUG: Explicitar qual "usuario" estamos puxando (o cliente)
      const { data: ags, error } = await supabase
        .from('agendamentos')
        .select(`
          id, data_hora, status_atendimento, nome_cliente_avulso, whatsapp_cliente_avulso, 
          servicos(nome_servico, duracao_minutos), 
          cliente:usuarios!agendamentos_cliente_id_fkey(nome, whatsapp)
        `)
        .eq('barbeiro_id', user.id)
        .gte('data_hora', dataInicio)
        .lte('data_hora', dataFim)
        .order('data_hora', { ascending: true });
      
      if (error) console.error("Erro na busca:", error);

      setAgendamentos(ags || []);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const mudarDia = (dias) => {
    const novaData = new Date(`${dataSelecionada}T12:00:00`);
    novaData.setDate(novaData.getDate() + dias);
    setDataSelecionada(novaData.toLocaleDateString('en-CA'));
  };

  const atualizarStatusAgendamento = async (id, novoStatus) => {
    const processarAtualizacao = async () => {
      try {
        if (novoStatus === 'concluido') {
          // A MÁGICA CONTINUA AQUI: Chama o banco para depositar as moedas e marcar concluído
          const { error } = await supabase.rpc('concluir_agendamento_e_pontuar', { p_agendamento_id: id });
          if (error) throw error;
        } else {
          await supabase.from('agendamentos').update({ status_atendimento: novoStatus }).eq('id', id);
        } 
        
        setAgendamentos(prev => prev.map(ag => ag.id === id ? { ...ag, status_atendimento: novoStatus } : ag));
        showAlert('Sucesso', `Status alterado para ${novoStatus.toUpperCase()}.`, 'success');
      } catch (err) {
        showAlert('Erro', 'Ocorreu um erro: ' + err.message, 'error');
      }
    };

    if (novoStatus === 'ausente') {
      showConfirm('Marcar Falta?', 'O cliente realmente não compareceu ao horário marcado?', processarAtualizacao);
    } else {
      processarAtualizacao();
    }
  };

  const handleToggleHorario = async (horaBase, isAbertoPadrao) => {
    const excecaoExistente = excecoes.find(e => e.horario.startsWith(horaBase));

    if (excecaoExistente) {
      await supabase.from('excecoes_agenda').delete().eq('id', excecaoExistente.id);
      setExcecoes(prev => prev.filter(e => e.id !== excecaoExistente.id));
    } else {
      const tipo = isAbertoPadrao ? 'bloqueio' : 'liberacao';
      const { data } = await supabase.from('excecoes_agenda').insert([{
        barbeiro_id: user.id, data: dataSelecionada, horario: `${horaBase}:00`, tipo
      }]).select().single();

      if (data) setExcecoes(prev => [...prev, data]);
    }
  };

  const bloquearDiaTodo = async () => {
    showConfirm('Fechar o Dia?', 'Deseja bloquear todos os seus horários de expediente para este dia?', async () => {
      setLoading(true);
      try {
        await supabase.from('excecoes_agenda').delete().eq('barbeiro_id', user.id).eq('data', dataSelecionada);

        const diaSemana = new Date(`${dataSelecionada}T12:00:00`).getDay();
        const isDiaPadrao = configBarbearia.dias_funcionamento.includes(diaSemana);

        if (isDiaPadrao) {
          const insercoesBulk = [];
          for (let h = 6; h <= 23; h++) {
            for (let m = 0; m < 60; m += 30) {
              const horaFormatada = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
              const isHoraPadrao = horaFormatada >= configBarbearia.hora_abertura.substring(0, 5) && horaFormatada < configBarbearia.hora_fechamento.substring(0, 5);

              if (isHoraPadrao) {
                insercoesBulk.push({ barbeiro_id: user.id, data: dataSelecionada, horario: `${horaFormatada}:00`, tipo: 'bloqueio' });
              }
            }
          }
          if (insercoesBulk.length > 0) {
            await supabase.from('excecoes_agenda').insert(insercoesBulk);
          }
        }
        await carregarTudo();
        showAlert('Agenda Fechada', 'Todos os horários deste dia foram bloqueados com sucesso.', 'success');
      } catch (err) {
        showAlert('Erro', 'Não foi possível fechar a agenda.', 'error');
        setLoading(false);
      }
    });
  };

  const restaurarDia = async () => {
    showConfirm('Restaurar Horários?', 'Isso irá remover todos os bloqueios e turnos extras, voltando ao horário padrão da barbearia.', async () => {
      setLoading(true);
      try {
        await supabase.from('excecoes_agenda').delete().eq('barbeiro_id', user.id).eq('data', dataSelecionada);
        await carregarTudo();
        showAlert('Restaurado', 'Os horários do dia voltaram ao padrão.', 'success');
      } catch (err) {
        showAlert('Erro', 'Não foi possível restaurar os horários.', 'error');
        setLoading(false);
      }
    });
  };

  const gerarGridHorarios = () => {
    if (!configBarbearia) return [];
    const diaSemana = new Date(`${dataSelecionada}T12:00:00`).getDay();
    const isDiaPadrao = configBarbearia.dias_funcionamento.includes(diaSemana);

    let grid = [];
    for (let h = 6; h <= 23; h++) {
      for (let m = 0; m < 60; m += 30) {
        const horaFormatada = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        const isHoraPadrao = horaFormatada >= configBarbearia.hora_abertura.substring(0, 5) && horaFormatada < configBarbearia.hora_fechamento.substring(0, 5);
        const isAbertoPadrao = isDiaPadrao && isHoraPadrao;

        const excecao = excecoes.find(e => e.horario.startsWith(horaFormatada));
        let statusFinal = 'fechado';

        if (isAbertoPadrao) {
          statusFinal = (excecao?.tipo === 'bloqueio') ? 'bloqueado' : 'aberto';
        } else {
          statusFinal = (excecao?.tipo === 'liberacao') ? 'extra' : 'fechado';
        }

        grid.push({ hora: horaFormatada, isAbertoPadrao, statusFinal });
      }
    }
    return grid;
  };

  const dataFormatadaPt = new Date(`${dataSelecionada}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 mb-24 md:mb-10">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-brand/10 p-3 rounded-2xl text-brand"><CalendarDays size={28} /></div>
        <div>
          <h1 className="text-2xl font-black text-text-base">Sua Agenda</h1>
          <p className="text-sm text-text-muted mt-0.5">Controle os seus horários e acompanhe os clientes de hoje.</p>
        </div>
      </div>

      <div className="bg-surface p-2 rounded-[2rem] border border-border-line flex items-center justify-between mb-8 shadow-sm">
        <button onClick={() => mudarDia(-1)} className="p-3 bg-background hover:bg-border-line/50 rounded-full text-text-muted hover:text-brand transition-colors cursor-pointer"><ChevronLeft size={24} /></button>
        <div className="flex flex-col items-center relative py-2">
          <input type="date" value={dataSelecionada} onChange={(e) => setDataSelecionada(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
          <span className="font-black text-text-base text-lg capitalize">{dataFormatadaPt.split(',')[0]}</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-muted">{dataFormatadaPt.split(',')[1]}</span>
            {dataSelecionada === hojeFormatoHTML && <span className="text-[10px] font-black bg-brand/10 text-brand px-2 py-0.5 rounded-md uppercase tracking-wider">Hoje</span>}
          </div>
        </div>
        <button onClick={() => mudarDia(1)} className="p-3 bg-background hover:bg-border-line/50 rounded-full text-text-muted hover:text-brand transition-colors cursor-pointer"><ChevronRight size={24} /></button>
      </div>

      <div className="flex p-1.5 bg-surface border border-border-line rounded-2xl mb-8 shadow-xs">
        <button onClick={() => setTab('agenda')} className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all cursor-pointer ${tab === 'agenda' ? 'bg-brand text-white shadow-md' : 'text-text-muted hover:text-text-base'}`}>Compromissos</button>
        <button onClick={() => setTab('bloqueios')} className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all cursor-pointer ${tab === 'bloqueios' ? 'bg-brand text-white shadow-md' : 'text-text-muted hover:text-text-base'}`}>Gerir Horários</button>
      </div>

      {tab === 'bloqueios' && (
        <div className="animate-fadeIn space-y-6">
          <div className="bg-blue-500/10 border border-blue-500/20 p-5 rounded-3xl flex gap-4 text-blue-600">
            <Info size={24} className="shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-bold mb-1">Como personalizar a sua agenda?</p>
              <p className="opacity-90 leading-relaxed">Este ecrã sobrepõe o horário padrão apenas no dia <strong>{dataSelecionada.split('-').reverse().join('/')}</strong>. Clique num horário verde para o <strong>Bloquear</strong> ou num cinzento para abrir um <strong>Turno Extra</strong>.</p>
            </div>
          </div>

          <div className="bg-surface p-6 sm:p-8 rounded-3xl border border-border-line shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-border-line">
              <h3 className="font-black text-lg flex items-center gap-2"><Clock size={20} className="text-brand" /> Grelha de Horários</h3>
              <div className="flex w-full sm:w-auto gap-2">
                <button onClick={restaurarDia} disabled={loading} className="flex-1 sm:flex-none px-4 py-2.5 bg-background border border-border-line rounded-xl text-xs font-bold text-text-base hover:border-brand hover:text-brand transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"><RefreshCcw size={14} /> Restaurar Padrão</button>
                <button onClick={bloquearDiaTodo} disabled={loading} className="flex-1 sm:flex-none px-4 py-2.5 bg-red-500/10 border border-red-500/20 text-red-600 rounded-xl text-xs font-bold hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"><CalendarOff size={14} /> Fechar o Dia</button>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-10"><div className="h-8 w-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div></div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                {gerarGridHorarios().map(({ hora, isAbertoPadrao, statusFinal }) => {
                  let estiloBase = "relative p-3 rounded-2xl text-sm font-black border-2 transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 overflow-hidden group";
                  let classes = '';
                  let icone = null;
                  let subtexto = '';

                  if (statusFinal === 'aberto') { classes = 'bg-background border-border-line text-text-base hover:border-red-500 hover:text-red-500 hover:bg-red-500/5'; icone = <Unlock size={14} className="opacity-50 group-hover:hidden" />; subtexto = 'Livre'; }
                  if (statusFinal === 'fechado') { classes = 'bg-background/40 border-transparent text-text-muted/40 hover:border-green-500 hover:text-green-500 hover:bg-green-500/5'; icone = <Lock size={14} className="opacity-30 group-hover:hidden" />; subtexto = 'Fechado'; }
                  if (statusFinal === 'bloqueado') { classes = 'bg-red-500/10 border-red-500 text-red-600 shadow-sm shadow-red-500/10'; icone = <Lock size={14} />; subtexto = 'Bloqueado'; }
                  if (statusFinal === 'extra') { classes = 'bg-green-500/10 border-green-500 text-green-600 shadow-sm shadow-green-500/10'; icone = <Unlock size={14} />; subtexto = 'Extra'; }

                  return (
                    <button key={hora} onClick={() => handleToggleHorario(hora, isAbertoPadrao)} className={`${estiloBase} ${classes}`}>
                      <span className="z-10">{hora}</span>
                      <div className="flex items-center gap-1 z-10 text-[9px] uppercase tracking-wider">{icone}{subtexto}</div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'agenda' && (
        <div className="animate-fadeIn">
          {loading ? (
            <div className="flex justify-center py-20"><div className="h-10 w-10 border-4 border-brand border-t-transparent rounded-full animate-spin"></div></div>
          ) : agendamentos.length === 0 ? (
            <div className="text-center py-24 bg-surface border border-dashed border-border-line rounded-[2rem]">
              <div className="bg-background w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border border-border-line"><Calendar size={32} className="text-text-muted" /></div>
              <h3 className="font-black text-xl text-text-base mb-1">Agenda Livre</h3>
              <p className="text-sm text-text-muted">Nenhum cliente agendado para este dia.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {agendamentos.map((ag) => {
                // ✨ CORREÇÃO AQUI NO RENDER (Agora usamos ag.cliente em vez de ag.usuarios)
                const clienteNome = ag.nome_cliente_avulso || ag.cliente?.nome || 'Cliente';
                const clienteTelefone = ag.whatsapp_cliente_avulso || ag.cliente?.whatsapp || null;
                const isCancelado = ag.status_atendimento === 'cancelado';
                const isConcluido = ag.status_atendimento === 'concluido';
                const isAusente = ag.status_atendimento === 'ausente';

                return (
                  <div key={ag.id} className={`bg-surface p-6 rounded-[2rem] border shadow-sm transition-all ${isCancelado ? 'border-red-500/20 opacity-75 grayscale' : isConcluido ? 'border-green-500/20' : isAusente ? 'border-amber-500/20 opacity-75' : 'border-border-line hover:border-brand/30'}`}>
                    <div className="flex justify-between items-start mb-5 pb-4 border-b border-border-line/60">
                      <div className="flex items-center gap-4">
                        <div className="bg-brand text-white text-xl font-black px-4 py-2 rounded-2xl shadow-md">
                          {new Date(ag.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}
                        </div>
                        <div>
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg ${isCancelado ? 'bg-red-500/10 text-red-500' : isConcluido ? 'bg-green-500/10 text-green-600' : isAusente ? 'bg-amber-500/10 text-amber-600' : 'bg-brand/10 text-brand'}`}>
                            {ag.status_atendimento}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mb-6 flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <div className="bg-background border border-border-line p-2.5 rounded-full text-text-muted"><User size={18} /></div>
                        <div>
                          <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Cliente</p>
                          <p className="font-black text-text-base text-lg">{clienteNome}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="bg-background border border-border-line p-2.5 rounded-full text-text-muted"><Scissors size={18} /></div>
                        <div>
                          <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Serviço</p>
                          <p className="font-bold text-text-base">{ag.servicos?.nome_servico} <span className="text-text-muted font-normal">({ag.servicos?.duracao_minutos} min)</span></p>
                        </div>
                      </div>

                      {clienteTelefone && (
                        <div className="flex items-center gap-3">
                          <div className="bg-background border border-border-line p-2.5 rounded-full text-text-muted"><Phone size={18} /></div>
                          <div>
                            <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Contacto</p>
                            <a href={`https://wa.me/55${clienteTelefone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="font-bold text-brand hover:underline">{clienteTelefone}</a>
                          </div>
                        </div>
                      )}
                    </div>

                    {ag.status_atendimento === 'agendado' && (
                      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border-line/60">
                        <button onClick={() => atualizarStatusAgendamento(ag.id, 'ausente')} className="bg-background border border-border-line p-3.5 rounded-2xl font-bold text-sm cursor-pointer flex items-center justify-center gap-2 text-text-base hover:text-amber-600 hover:border-amber-500/30 transition-colors"><AlertCircle size={18} /> Faltou</button>
                        <button onClick={() => atualizarStatusAgendamento(ag.id, 'concluido')} className="bg-brand text-white p-3.5 rounded-2xl font-bold text-sm cursor-pointer flex items-center justify-center gap-2 hover:brightness-110 shadow-md shadow-brand/20 transition-all"><CheckCircle2 size={18} /> Concluído</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}