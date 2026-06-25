import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import { Calendar, Clock, User, Phone, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight, Scissors, Filter } from 'lucide-react';

export default function AdminAgendaEquipe() {
  const { profile } = useAuth();
  const { showConfirm, showAlert } = useModal();
  
  const [agendamentos, setAgendamentos] = useState([]);
  const [barbeiros, setBarbeiros] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Controles de Data e Filtro
  const hojeFormatoHTML = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  const [dataSelecionada, setDataSelecionada] = useState(hojeFormatoHTML);
  const [barbeiroFiltro, setBarbeiroFiltro] = useState('todos');

  useEffect(() => {
    if (profile?.barbearia_id) {
      carregarBarbeiros();
    }
  }, [profile]);

  useEffect(() => {
    if (barbeiros.length > 0) {
      buscarAgendaGeral();
    }
  }, [dataSelecionada, barbeiroFiltro, barbeiros]);

  const carregarBarbeiros = async () => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nome')
        .eq('barbearia_id', profile.barbearia_id)
        .in('role', ['admin', 'gerente', 'funcionario']);
      
      if (error) throw error;
      setBarbeiros(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const buscarAgendaGeral = async () => {
    setLoading(true);
    try {
      const barbeirosIds = barbeiros.map(b => b.id);
      if (barbeirosIds.length === 0) return;

      const dataInicio = new Date(`${dataSelecionada}T00:00:00`).toISOString();
      const dataFim = new Date(`${dataSelecionada}T23:59:59`).toISOString();

      let query = supabase
        .from('agendamentos')
        .select(`
          id,
          data_hora,
          status_atendimento,
          nome_cliente_avulso,
          whatsapp_cliente_avulso,
          servicos (nome_servico, duracao_minutos),
          clientes:usuarios!agendamentos_cliente_id_fkey(nome, whatsapp),
          barbeiros:usuarios!agendamentos_barbeiro_id_fkey(nome)
        `)
        .gte('data_hora', dataInicio)
        .lte('data_hora', dataFim)
        .order('data_hora', { ascending: true });

      if (barbeiroFiltro === 'todos') {
        query = query.in('barbeiro_id', barbeirosIds);
      } else {
        query = query.eq('barbeiro_id', barbeiroFiltro);
      }

      const { data, error } = await query;
      if (error) throw error;
      setAgendamentos(data || []);
    } catch (err) {
      showAlert('Erro', 'Não foi possível carregar a agenda geral.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const mudarDia = (dias) => {
    const novaData = new Date(`${dataSelecionada}T12:00:00`);
    novaData.setDate(novaData.getDate() + dias);
    setDataSelecionada(novaData.toLocaleDateString('en-CA'));
  };

  const formatarTelefoneWhatsApp = (numero) => {
    if (!numero) return '';
    const limpo = numero.replace(/\D/g, '');
    return `55${limpo}`;
  };

  const atualizarStatus = async (id, novoStatus) => {
    const processarAtualizacao = async () => {
      try {
        await supabase.from('agendamentos').update({ status_atendimento: novoStatus }).eq('id', id);
        setAgendamentos(prev => prev.map(ag => ag.id === id ? { ...ag, status_atendimento: novoStatus } : ag));
        showAlert('Feito!', `O agendamento foi marcado como ${novoStatus.toUpperCase()}.`, 'success');
      } catch (err) {
        showAlert('Erro', 'Ocorreu um erro: ' + err.message, 'error');
      }
    };

    if (novoStatus === 'ausente' || novoStatus === 'cancelado') {
      showConfirm('Atenção', `Tem a certeza que deseja marcar este agendamento como ${novoStatus.toUpperCase()}?`, processarAtualizacao);
    } else {
      processarAtualizacao();
    }
  };

  return (
    <div className="p-4 md:p-10 pb-24 md:pb-10 max-w-5xl mx-auto">
      
      {/* CABEÇALHO */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-text-base">Agenda Geral da Equipe</h1>
        <p className="text-sm text-text-muted mt-1">Supervisione os agendamentos de todos os profissionais em tempo real.</p>
      </div>

      {/* CONTROLES: DATA E FILTRO */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        
        {/* Navegação de Data */}
        <div className="flex-1 bg-surface p-4 rounded-2xl border border-border-line flex items-center justify-between shadow-sm">
          <button onClick={() => mudarDia(-1)} className="p-2 hover:bg-background rounded-lg text-text-muted hover:text-brand transition-colors cursor-pointer">
            <ChevronLeft size={24} />
          </button>
          
          <div className="flex flex-col items-center">
            <input 
              type="date" 
              value={dataSelecionada} 
              onChange={(e) => setDataSelecionada(e.target.value)}
              className="bg-transparent font-bold text-text-base text-lg outline-none cursor-pointer text-center"
            />
            {dataSelecionada === hojeFormatoHTML && <span className="text-[10px] font-black text-brand uppercase tracking-wider mt-1">Hoje</span>}
          </div>

          <button onClick={() => mudarDia(1)} className="p-2 hover:bg-background rounded-lg text-text-muted hover:text-brand transition-colors cursor-pointer">
            <ChevronRight size={24} />
          </button>
        </div>

        {/* Filtro de Barbeiro */}
        <div className="bg-surface p-4 rounded-2xl border border-border-line flex items-center gap-3 shadow-sm min-w-[250px]">
          <div className="p-2 bg-brand/10 text-brand rounded-lg hidden sm:block">
            <Filter size={20} />
          </div>
          <div className="flex-1">
            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Filtrar por Profissional</label>
            <select 
              value={barbeiroFiltro} 
              onChange={(e) => setBarbeiroFiltro(e.target.value)} 
              className="w-full bg-background border border-border-line p-2 rounded-xl text-sm font-bold outline-none focus:border-brand cursor-pointer text-text-base"
            >
              <option value="todos">Toda a Equipe</option>
              {barbeiros.map(b => (
                <option key={b.id} value={b.id}>{b.nome}</option>
              ))}
            </select>
          </div>
        </div>

      </div>

      {/* LISTA DE AGENDAMENTOS */}
      <div className="animate-fadeIn">
        {loading ? (
          <div className="flex justify-center py-20"><div className="h-8 w-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div></div>
        ) : agendamentos.length === 0 ? (
          <div className="text-center py-20 bg-surface border border-border-line rounded-3xl">
            <Calendar size={32} className="mx-auto mb-4 text-text-muted opacity-50" />
            <h3 className="font-bold text-lg text-text-base mb-1">Agenda Livre</h3>
            <p className="text-sm text-text-muted">Não há agendamentos para os filtros selecionados neste dia.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {agendamentos.map((ag) => {
              const horaStr = new Date(ag.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
              const nomeCliente = ag.nome_cliente_avulso || ag.clientes?.nome || 'Cliente sem nome';
              const whatsappCliente = ag.whatsapp_cliente_avulso || ag.clientes?.whatsapp;
              const isAgendado = ag.status_atendimento === 'agendado';

              return (
                <div key={ag.id} className={`bg-surface p-5 rounded-2xl border transition-all ${isAgendado ? 'border-brand/30 shadow-sm' : 'border-border-line opacity-80'}`}>
                  
                  <div className="flex justify-between items-center mb-4 pb-3 border-b border-border-line/50">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-black ${isAgendado ? 'bg-brand text-white' : 'bg-background border border-border-line text-text-muted'}`}>
                        {horaStr}
                      </div>
                      <div>
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md 
                          ${ag.status_atendimento === 'concluido' ? 'bg-green-500/10 text-green-600' : 
                            ag.status_atendimento === 'ausente' ? 'bg-amber-500/10 text-amber-600' : 
                            ag.status_atendimento === 'cancelado' ? 'bg-red-500/10 text-red-600' : 
                            'bg-brand/10 text-brand'}`}
                        >
                          {ag.status_atendimento}
                        </span>
                      </div>
                    </div>

                    {/* Tag do Barbeiro */}
                    <div className="text-xs font-bold text-text-muted bg-background border border-border-line px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-brand/50"></div>
                      {ag.barbeiros?.nome.split(' ')[0]}
                    </div>
                  </div>

                  <div className="space-y-3 mb-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold text-text-base flex items-center gap-2">
                          <User size={16} className="text-text-muted"/> {nomeCliente}
                        </p>
                        <p className="text-sm font-semibold text-text-muted mt-1 flex items-center gap-2">
                          <Scissors size={16}/> {ag.servicos?.nome_servico} ({ag.servicos?.duracao_minutos} min)
                        </p>
                      </div>
                      
                      {whatsappCliente && (
                        <a 
                          href={`https://wa.me/${formatarTelefoneWhatsApp(whatsappCliente)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2.5 bg-green-500/10 text-green-600 rounded-full hover:bg-green-500/20 transition-colors"
                          title="Enviar mensagem no WhatsApp"
                        >
                          <Phone size={16} />
                        </a>
                      )}
                    </div>
                  </div>

                  {isAgendado && (
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <button 
                        onClick={() => atualizarStatus(ag.id, 'concluido')}
                        className="flex items-center justify-center gap-2 bg-background border border-border-line text-text-base p-2.5 rounded-xl font-bold text-xs hover:border-green-500 hover:text-green-600 transition-colors cursor-pointer"
                      >
                        <CheckCircle2 size={16} /> Concluído
                      </button>
                      <button 
                        onClick={() => atualizarStatus(ag.id, 'ausente')}
                        className="flex items-center justify-center gap-2 bg-background border border-border-line text-text-muted p-2.5 rounded-xl font-bold text-xs hover:text-amber-600 hover:border-amber-200 transition-colors cursor-pointer"
                      >
                        <AlertCircle size={16} /> Faltou
                      </button>
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}