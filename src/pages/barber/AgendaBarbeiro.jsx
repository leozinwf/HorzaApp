import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import { Calendar, Clock, User, Phone, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight, Scissors, Lock, Unlock } from 'lucide-react';

export default function AgendaBarbeiro() {
  const { user, profile } = useAuth();
  const { showAlert, showConfirm } = useModal();
  const [agendamentos, setAgendamentos] = useState([]);
  const [configBarbearia, setConfigBarbearia] = useState(null);
  const [excecoes, setExcecoes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const hojeFormatoHTML = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  const [dataSelecionada, setDataSelecionada] = useState(hojeFormatoHTML);
  const [tab, setTab] = useState('agenda'); // 'agenda' ou 'bloqueios'

  useEffect(() => {
    if (user && profile?.barbearia_id) {
      carregarTudo();
    }
  }, [user, profile, dataSelecionada]);

  const carregarTudo = async () => {
    setLoading(true);
    try {
      // 1. Busca configurações da Barbearia
      const { data: config } = await supabase.from('barbearias').select('hora_abertura, hora_fechamento, dias_funcionamento').eq('id', profile.barbearia_id).single();
      setConfigBarbearia(config);

      // 2. Busca Exceções (Bloqueios/Liberações do dia)
      const { data: exc } = await supabase.from('excecoes_agenda').select('*').eq('barbeiro_id', user.id).eq('data', dataSelecionada);
      setExcecoes(exc || []);

      // 3. Busca Agendamentos do dia
      const dataInicio = new Date(`${dataSelecionada}T00:00:00`).toISOString();
      const dataFim = new Date(`${dataSelecionada}T23:59:59`).toISOString();
      const { data: ags } = await supabase.from('agendamentos').select('id, data_hora, status_atendimento, nome_cliente_avulso, whatsapp_cliente_avulso, servicos(nome_servico, duracao_minutos), usuarios(nome, whatsapp)').eq('barbeiro_id', user.id).gte('data_hora', dataInicio).lte('data_hora', dataFim).order('data_hora', { ascending: true });
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
    
    // Função interna que executa a gravação no banco
    const processarAtualizacao = async () => {
      try {
        await supabase.from('agendamentos').update({ status_atendimento: novoStatus }).eq('id', id);
        setAgendamentos(prev => prev.map(ag => ag.id === id ? { ...ag, status_atendimento: novoStatus } : ag));
        
        // Modal de Sucesso Customizada!
        showAlert('Feito!', `O agendamento foi marcado como ${novoStatus.toUpperCase()}.`, 'success');
      } catch(err) {
        showAlert('Erro', 'Ocorreu um erro: ' + err.message, 'error');
      }
    };

    // Abre a modal linda de Confirmação em vez do "window.confirm"
    if (novoStatus === 'ausente') {
       showConfirm('Marcar Falta?', 'Tem a certeza que este cliente não compareceu?', processarAtualizacao);
    } else {
       processarAtualizacao();
    }
  };

  // ✨ LÓGICA DE GERENCIAR HORÁRIOS (O CORAÇÃO DO SISTEMA) ✨
  const handleToggleHorario = async (horaBase, isAbertoPadrao) => {
    // Procura se já tem uma regra (exceção) para esta hora
    const excecaoExistente = excecoes.find(e => e.horario.startsWith(horaBase));
    
    if (excecaoExistente) {
      // Se clicou de novo, apaga a exceção e volta ao normal
      await supabase.from('excecoes_agenda').delete().eq('id', excecaoExistente.id);
      setExcecoes(prev => prev.filter(e => e.id !== excecaoExistente.id));
    } else {
      // Se não tem regra, cria uma. 
      // Se o horário era pra estar aberto, ele bloqueia. Se era pra estar fechado, ele libera.
      const tipo = isAbertoPadrao ? 'bloqueio' : 'liberacao';
      const { data } = await supabase.from('excecoes_agenda').insert([{
        barbeiro_id: user.id, data: dataSelecionada, horario: `${horaBase}:00`, tipo
      }]).select().single();
      
      if (data) setExcecoes(prev => [...prev, data]);
    }
  };

  // Gerador da grelha de horários (06:00 às 23:30)
  const gerarGridHorarios = () => {
    if (!configBarbearia) return [];
    const diaSemana = new Date(`${dataSelecionada}T12:00:00`).getDay();
    const isDiaPadrao = configBarbearia.dias_funcionamento.includes(diaSemana);
    
    let grid = [];
    for (let h = 6; h <= 23; h++) {
      for (let m = 0; m < 60; m += 30) {
        const horaFormatada = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        
        // Regra Padrão (Sem exceções)
        const isHoraPadrao = horaFormatada >= configBarbearia.hora_abertura.substring(0, 5) && horaFormatada < configBarbearia.hora_fechamento.substring(0, 5);
        const isAbertoPadrao = isDiaPadrao && isHoraPadrao;

        // Verifica o que o Barbeiro decidiu
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

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 mb-20">
      
      <div className="mb-6">
        <h1 className="text-2xl font-black text-text-base">Painel do Barbeiro</h1>
        <p className="text-sm text-text-muted">Acompanhe sua agenda e controle seus horários livremente.</p>
      </div>

      {/* CONTROLE DE DATA */}
      <div className="bg-surface p-4 rounded-2xl border border-border-line flex items-center justify-between mb-6 shadow-sm">
        <button onClick={() => mudarDia(-1)} className="p-2 hover:bg-background rounded-lg text-text-muted hover:text-brand transition-colors cursor-pointer"><ChevronLeft size={24} /></button>
        <div className="flex flex-col items-center">
          <input type="date" value={dataSelecionada} onChange={(e) => setDataSelecionada(e.target.value)} className="bg-transparent font-bold text-text-base text-lg outline-none cursor-pointer text-center" />
          {dataSelecionada === hojeFormatoHTML && <span className="text-[10px] font-black text-brand uppercase tracking-wider mt-1">Hoje</span>}
        </div>
        <button onClick={() => mudarDia(1)} className="p-2 hover:bg-background rounded-lg text-text-muted hover:text-brand transition-colors cursor-pointer"><ChevronRight size={24} /></button>
      </div>

      {/* ABAS */}
      <div className="flex gap-2 p-1 bg-surface border border-border-line rounded-xl mb-6">
        <button onClick={() => setTab('agenda')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all cursor-pointer ${tab === 'agenda' ? 'bg-brand text-white shadow-sm' : 'text-text-muted hover:text-text-base'}`}>Agendamentos</button>
        <button onClick={() => setTab('bloqueios')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all cursor-pointer ${tab === 'bloqueios' ? 'bg-brand text-white shadow-sm' : 'text-text-muted hover:text-text-base'}`}>Abrir / Fechar Horários</button>
      </div>

      {/* TELA DE GERENCIAR HORÁRIOS */}
      {tab === 'bloqueios' && (
        <div className="animate-fadeIn bg-surface p-6 rounded-2xl border border-border-line">
            <h3 className="font-bold mb-2 flex items-center gap-2"><Clock size={18}/> Gerenciar Horários</h3>
            <p className="text-xs text-text-muted mb-6">Toque num horário aberto para bloqueá-lo. Toque num horário fechado para criar um "Turno Extra".</p>
            
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
                {gerarGridHorarios().map(({ hora, isAbertoPadrao, statusFinal }) => {
                    let cores = '';
                    let icon = null;

                    if (statusFinal === 'aberto') cores = 'bg-background border-border-line text-text-base hover:border-brand';
                    if (statusFinal === 'fechado') cores = 'bg-background/50 border-transparent text-text-muted/40 opacity-60';
                    if (statusFinal === 'bloqueado') { cores = 'bg-red-500/10 border-red-500/30 text-red-600'; icon = <Lock size={12}/>; }
                    if (statusFinal === 'extra') { cores = 'bg-green-500/10 border-green-500/30 text-green-600'; icon = <Unlock size={12}/>; }

                    return (
                        <button 
                            key={hora} 
                            onClick={() => handleToggleHorario(hora, isAbertoPadrao)}
                            className={`p-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-center gap-1 ${cores}`}
                        >
                            {hora}
                            {icon}
                        </button>
                    )
                })}
            </div>
        </div>
      )}

      {/* TELA DE AGENDA (LISTA DE CLIENTES) */}
      {tab === 'agenda' && (
        <div className="space-y-4 animate-fadeIn">
            {loading ? (
                <div className="text-center py-10"><div className="h-8 w-8 border-4 border-brand border-t-transparent rounded-full animate-spin mx-auto"></div></div>
            ) : agendamentos.length === 0 ? (
                <div className="text-center py-16 bg-surface border border-border-line rounded-3xl">
                    <Calendar size={32} className="mx-auto mb-4 text-text-muted" />
                    <h3 className="font-bold text-lg text-text-base mb-1">Agenda Livre</h3>
                    <p className="text-sm text-text-muted">Nenhum cliente marcado.</p>
                </div>
            ) : (
                agendamentos.map((ag) => (
                    <div key={ag.id} className="bg-surface p-5 rounded-2xl border border-border-line">
                        <div className="flex justify-between items-center mb-4 pb-3 border-b border-border-line/50">
                            <span className="font-black text-xl">{new Date(ag.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                            <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 bg-brand/10 text-brand rounded-full">{ag.status_atendimento}</span>
                        </div>
                        <div className="mb-4">
                            <p className="font-bold text-text-base flex items-center gap-2"><User size={16}/> {ag.nome_cliente_avulso || ag.usuarios?.nome || 'Cliente'}</p>
                            <p className="text-sm text-text-muted flex items-center gap-2 mt-1"><Scissors size={16}/> {ag.servicos?.nome_servico}</p>
                        </div>
                        {ag.status_atendimento === 'agendado' && (
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => atualizarStatusAgendamento(ag.id, 'concluido')} className="bg-brand text-white p-3 rounded-xl font-bold text-xs cursor-pointer flex items-center justify-center gap-2"><CheckCircle2 size={16}/> Concluído</button>
                                <button onClick={() => atualizarStatusAgendamento(ag.id, 'ausente')} className="bg-background border border-border-line p-3 rounded-xl font-bold text-xs cursor-pointer flex items-center justify-center gap-2 text-text-muted hover:text-amber-600"><AlertCircle size={16}/> Faltou</button>
                            </div>
                        )}
                    </div>
                ))
            )}
        </div>
      )}
    </div>
  );
}