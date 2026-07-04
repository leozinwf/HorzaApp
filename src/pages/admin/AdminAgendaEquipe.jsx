import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import { Calendar, Clock, User, Phone, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight, Scissors, Filter, Info, X } from 'lucide-react';

export default function AdminAgendaEquipe() {
  const { profile } = useAuth();
  const { showConfirm, showAlert } = useModal();
  
  const [agendamentos, setAgendamentos] = useState([]);
  const [barbeiros, setBarbeiros] = useState([]);
  const [configAgenda, setConfigAgenda] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const hojeFormatoHTML = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  const [dataSelecionada, setDataSelecionada] = useState(hojeFormatoHTML);
  const [barbeiroFiltro, setBarbeiroFiltro] = useState('todos');

  // Estado para Modal de Detalhes do Agendamento
  const [agendamentoDetalhe, setAgendamentoDetalhe] = useState(null);

  useEffect(() => {
    if (profile?.barbearia_id) {
      carregarConfigECarregarequipe();
    }
  }, [profile]);

  useEffect(() => {
    if (barbeiros.length > 0 && configAgenda) {
      buscarAgendaGeral();
    }
  }, [dataSelecionada, barbeiroFiltro, barbeiros, configAgenda]);

  const carregarConfigECarregarequipe = async () => {
    try {
      // Pega config da barbearia (Horários)
      const { data: config } = await supabase.from('barbearias').select('hora_abertura, hora_fechamento').eq('id', profile.barbearia_id).single();
      setConfigAgenda(config);

      // Pega os barbeiros
      const { data: equipe } = await supabase.from('usuarios').select('id, nome').eq('barbearia_id', profile.barbearia_id).in('role', ['admin', 'gerente', 'funcionario']);
      setBarbeiros(equipe || []);
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

      let query = supabase.from('agendamentos').select(`
          id, data_hora, status_atendimento, nome_cliente_avulso, whatsapp_cliente_avulso,
          servicos (nome_servico, duracao_minutos, preco), clientes:usuarios!agendamentos_cliente_id_fkey(nome, whatsapp),
          barbeiros:usuarios!agendamentos_barbeiro_id_fkey(nome)
        `).gte('data_hora', dataInicio).lte('data_hora', dataFim);

      if (barbeiroFiltro !== 'todos') query = query.eq('barbeiro_id', barbeiroFiltro);
      else query = query.in('barbeiro_id', barbeirosIds);

      const { data, error } = await query;
      if (error) throw error;
      setAgendamentos(data || []);
    } catch (err) {
      showAlert('Erro', 'Não foi possível carregar a agenda.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const mudarDia = (dias) => {
    const novaData = new Date(`${dataSelecionada}T12:00:00`);
    novaData.setDate(novaData.getDate() + dias);
    setDataSelecionada(novaData.toLocaleDateString('en-CA'));
  };

  // ✨ GERADOR DE SLOTS DE HORÁRIO
  const gerarSlots = () => {
    if (!configAgenda) return [];
    const slots = [];
    let atual = new Date(`2000-01-01T${configAgenda.hora_abertura || '09:00:00'}`);
    const fim = new Date(`2000-01-01T${configAgenda.hora_fechamento || '19:00:00'}`);

    while (atual <= fim) {
      slots.push(atual.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
      atual.setMinutes(atual.getMinutes() + 30); // Intervalo fixo de 30 min (pode adaptar)
    }
    return slots;
  };

  const slotsHorarios = gerarSlots();

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
            <input type="date" value={dataSelecionada} onChange={(e) => setDataSelecionada(e.target.value)} className="bg-transparent font-bold text-lg outline-none cursor-pointer text-center"/>
          </div>
          <button onClick={() => mudarDia(1)} className="p-2 hover:bg-background rounded-lg text-text-muted cursor-pointer"><ChevronRight size={24} /></button>
        </div>

        <div className="bg-surface p-4 rounded-2xl border border-border-line flex items-center gap-3 shadow-sm min-w-[250px]">
          <div className="p-2 bg-brand/10 text-brand rounded-lg hidden sm:block"><Filter size={20} /></div>
          <div className="flex-1">
            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Filtrar por Profissional</label>
            <select value={barbeiroFiltro} onChange={(e) => setBarbeiroFiltro(e.target.value)} className="w-full bg-background border border-border-line p-2 rounded-xl text-sm font-bold outline-none focus:border-brand cursor-pointer">
              <option value="todos">Toda a Equipe</option>
              {barbeiros.map(b => <option key={b.id} value={b.id}>{b.nome}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="animate-fadeIn">
        {loading ? (
          <div className="flex justify-center py-20"><div className="h-8 w-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* RENDERIZANDO OS SLOTS */}
            {slotsHorarios.map((slotTime) => {
              // Verifica se tem agendamento neste slot (Comparando HH:MM)
              const agendamentosNoSlot = agendamentos.filter(ag => {
                const agTime = new Date(ag.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
                return agTime === slotTime;
              });

              if (agendamentosNoSlot.length > 0) {
                // RENDERIZA SLOT OCUPADO
                return agendamentosNoSlot.map(ag => (
                  <div 
                    key={ag.id} 
                    onClick={() => setAgendamentoDetalhe(ag)}
                    className="bg-brand/5 border border-brand/20 p-4 rounded-2xl cursor-pointer hover:bg-brand/10 transition-colors shadow-sm flex flex-col justify-between"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-black text-brand text-lg">{slotTime}</span>
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded bg-brand text-white">
                        {ag.barbeiros?.nome.split(' ')[0]}
                      </span>
                    </div>
                    <div>
                      <p className="font-bold text-sm text-text-base truncate">{ag.nome_cliente_avulso || ag.clientes?.nome}</p>
                      <p className="text-xs text-text-muted flex items-center gap-1 mt-1"><Scissors size={12}/> {ag.servicos?.nome_servico}</p>
                    </div>
                  </div>
                ));
              } else {
                // RENDERIZA SLOT LIVRE
                return (
                  <div key={slotTime} className="bg-surface border border-dashed border-border-line p-4 rounded-2xl flex items-center justify-between opacity-60 hover:opacity-100 transition-opacity">
                    <span className="font-black text-text-muted text-lg">{slotTime}</span>
                    <span className="text-xs font-bold text-green-500 flex items-center gap-1"><CheckCircle2 size={14}/> Livre</span>
                  </div>
                );
              }
            })}
          </div>
        )}
      </div>

      {/* MODAL DETALHE DO AGENDAMENTO */}
      {agendamentoDetalhe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface rounded-3xl w-full max-w-sm shadow-2xl p-6 relative">
            <button onClick={() => setAgendamentoDetalhe(null)} className="absolute top-4 right-4 text-text-muted hover:bg-background p-2 rounded-full"><X size={20}/></button>
            <h3 className="text-xl font-black text-text-base mb-4 flex items-center gap-2"><Info className="text-brand"/> Detalhes da Reserva</h3>
            
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
                  <p className="text-xs text-text-muted font-bold uppercase mb-1">Serviço</p>
                  <p className="font-bold text-text-base text-sm truncate">{agendamentoDetalhe.servicos?.nome_servico}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-border-line flex gap-2">
                <a href={`https://wa.me/55${(agendamentoDetalhe.whatsapp_cliente_avulso || agendamentoDetalhe.clientes?.whatsapp)?.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex-1 bg-green-500/10 text-green-600 font-bold py-3 rounded-xl text-center text-sm hover:bg-green-500 hover:text-white transition-colors">
                  WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}