import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabaseClient';
import { useModal } from '../../context/ModalContext';
import { useNavigate } from 'react-router-dom';
import { 
  Scissors, LogOut, Calendar as CalendarIcon, 
  CheckCircle2, XCircle, Clock, User, DollarSign, Plus, X, Phone 
} from 'lucide-react';

export default function AgendaBarbeiro() {
  const { user, profile, logout } = useAuth();
  const { showConfirm, showAlert } = useModal();
  const navigate = useNavigate();

  const [agendamentos, setAgendamentos] = useState([]);
  const [servicosDisponiveis, setServicosDisponiveis] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [dataSelecionada, setDataSelecionada] = useState(new Date().toISOString().split('T')[0]);
  const [resumoMes, setResumoMes] = useState({ cortes: 0, valorGerado: 0 });

  // Controle do Formulário Manual de Balcão
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [nomeClienteManual, setNomeClienteManual] = useState('');
  const [whatsappClienteManual, setWhatsappClienteManual] = useState('');
  const [servicoSelecionado, setServicoSelecionado] = useState('');
  const [horaSelecionada, setHoraSelecionada] = useState('14:00');

  useEffect(() => {
    if (user?.id && profile?.barbearia_id) {
      buscarAgendaDoDia();
      calcularResumoDoMes();
      carregarServiciosDaBarbearia();
    }
  }, [user, profile, dataSelecionada]);

  const buscarAgendaDoDia = async () => {
    setLoading(true);
    try {
      const inicioDoDia = `${dataSelecionada}T00:00:00.000Z`;
      const fimDoDia = `${dataSelecionada}T23:59:59.999Z`;

      const { data, error } = await supabase
        .from('agendamentos')
        .select(`
          id, data_hora, status_atendimento, nome_cliente_avulso, whatsapp_cliente_avulso,
          servicos (nome_servico, preco, duracao_minutos),
          cliente:usuarios!agendamentos_cliente_id_fkey (nome, whatsapp)
        `)
        .eq('barbeiro_id', user.id)
        .gte('data_hora', inicioDoDia)
        .lte('data_hora', fimDoDia)
        .order('data_hora', { ascending: true });

      if (error) throw error;
      setAgendamentos(data || []);
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const carregarServiciosDaBarbearia = async () => {
    try {
      const { data } = await supabase
        .from('servicos')
        .select('*')
        .eq('barbearia_id', profile.barbearia_id);
      setServicosDisponiveis(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const calcularResumoDoMes = async () => {
    try {
      const hoje = new Date();
      const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString();
      const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59).toISOString();

      const { data } = await supabase
        .from('agendamentos')
        .select('servicos(preco)')
        .eq('barbeiro_id', user.id)
        .eq('status_atendimento', 'concluido')
        .gte('data_hora', primeiroDiaMes)
        .lte('data_hora', ultimoDiaMes);

      const totalCortes = data?.length || 0;
      const totalValor = data?.reduce((acc, curr) => acc + Number(curr.servicos?.preco || 0), 0) || 0;

      setResumoMes({ cortes: totalCortes, valorGerado: totalValor });
    } catch (err) {
      console.error(err);
    }
  };

  const handleSalvarAgendamentoManual = async (e) => {
    e.preventDefault();
    if (!nomeClienteManual || !servicoSelecionado) return;

    try {
      // Mescla o dia escolhido na tela com a hora do input
      const dataHoraISO = new Date(`${dataSelecionada}T${horaSelecionada}:00`).toISOString();

      const { error } = await supabase.from('agendamentos').insert([{
        barbearia_id: profile.barbearia_id,
        barbeiro_id: user.id,
        servico_id: servicoSelecionado,
        data_hora: dataHoraISO,
        status_atendimento: 'concluido', // Já cria direto como concluído
        nome_cliente_avulso: nomeClienteManual,
        whatsapp_cliente_avulso: whatsappClienteManual
      }]);

      if (error) throw error;

      showAlert('Sucesso', 'Atendimento de balcão lançado com sucesso!');
      setIsManualModalOpen(false);
      setNomeClienteManual('');
      setWhatsappClienteManual('');
      buscarAgendaDoDia();
      calcularResumoDoMes();
    } catch (err) {
      showAlert('Erro', err.message);
    }
  };

  const alterarStatus = async (id, novoStatus) => {
    const acaoTexto = novoStatus === 'concluido' ? 'marcar como CONCLUÍDO' : 'informar FALTA';
    showConfirm('Atualizar Status', `Deseja ${acaoTexto}?`, async () => {
      try {
        await supabase.from('agendamentos').update({ status_atendimento: novoStatus }).eq('id', id);
        buscarAgendaDoDia();
        calcularResumoDoMes();
      } catch (err) {
        showAlert('Erro', err.message);
      }
    });
  };

  return (
    <div className="min-h-screen bg-background text-text-base pb-10">
      
      {/* HEADER */}
      <header className="bg-surface border-b border-b-border-line px-6 py-4 flex justify-between items-center shadow-xs sticky top-0 z-40">
        <div className="flex items-center gap-2 text-brand font-bold text-lg">
          <Scissors size={24} /> Painel do Profissional
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setIsManualModalOpen(true)} className="bg-brand hover:bg-brand-hover text-white text-xs font-bold p-2 px-3 rounded-xl flex items-center gap-1 cursor-pointer transition-colors">
            <Plus size={16}/> Encaixe Manual
          </button>
          <button onClick={async () => { await logout(); navigate('/login'); }} className="text-text-muted hover:text-red-500 flex items-center gap-1.5 text-xs font-bold cursor-pointer">
            <LogOut size={16} /> Sair
          </button>
        </div>
      </header>

      <main className="p-6 max-w-2xl mx-auto space-y-6">
        {/* RESUMOS */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-surface p-4 rounded-2xl border border-border-line text-center shadow-xs">
            <Scissors size={18} className="text-brand mx-auto mb-1" />
            <span className="text-[10px] font-bold text-text-muted uppercase">Cortes Concluídos</span>
            <p className="text-xl font-black mt-0.5">{resumoMes.cortes}</p>
          </div>
          <div className="bg-surface p-4 rounded-2xl border border-border-line text-center shadow-xs">
            <DollarSign size={18} className="text-green-500 mx-auto mb-1" />
            <span className="text-[10px] font-bold text-text-muted uppercase">Sua Produção</span>
            <p className="text-xl font-black mt-0.5">R$ {resumoMes.valorGerado.toFixed(2)}</p>
          </div>
        </div>

        {/* CALENDÁRIO */}
        <div className="bg-surface p-4 rounded-2xl border border-border-line shadow-xs">
          <label className="block text-xs font-bold text-text-muted uppercase mb-2 flex items-center gap-1.5"><CalendarIcon size={14}/> Visualizar Dia</label>
          <input type="date" value={dataSelecionada} onChange={(e) => setDataSelecionada(e.target.value)} className="w-full bg-background border border-border-line p-2.5 rounded-xl text-sm font-bold text-text-base outline-none focus:border-brand" />
        </div>

        {/* LISTAGEM */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-2"><Clock size={14}/> Linha do Tempo ({agendamentos.length})</h2>
          
          {loading ? (
            <p className="p-10 text-center text-xs text-text-muted">Buscando sua escala...</p>
          ) : agendamentos.length === 0 ? (
            <p className="p-10 text-center text-xs text-text-muted bg-surface rounded-2xl border border-dashed border-border-line">Nenhum atendimento na linha do tempo para esta data.</p>
          ) : (
            agendamentos.map(ag => {
              const hora = new Date(ag.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
              const isConcluido = ag.status_atendimento === 'concluido';
              const isAusente = ag.status_atendimento === 'ausente';
              
              // Resolve se é um cliente logado do app ou avulso digitado pelo barbeiro
              const nomeExibicao = ag.cliente?.nome || ag.nome_cliente_avulso || 'Cliente Avulso';

              return (
                <div key={ag.id} className={`bg-surface p-4 rounded-2xl border shadow-xs flex flex-col gap-3 ${isConcluido ? 'border-green-500/20 opacity-70' : isAusente ? 'border-red-500/20 opacity-70' : 'border-border-line'}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className={`text-xs font-black p-2 rounded-xl text-white ${isConcluido ? 'bg-green-500' : isAusente ? 'bg-red-400' : 'bg-brand'}`}>{hora}</div>
                      <div>
                        <p className="font-bold text-sm text-text-base flex items-center gap-1"><User size={13}/> {nomeExibicao} {(!ag.cliente?.nome) && <span className="text-[9px] bg-background border px-1.5 py-0.5 rounded text-text-muted font-normal">Balcão</span>}</p>
                        <p className="text-xs text-text-muted mt-0.5">{ag.servicos?.nome_servico} • {ag.servicos?.duracao_minutos} min</p>
                      </div>
                    </div>
                    <span className="text-xs font-black text-brand">R$ {Number(ag.servicos?.preco).toFixed(2)}</span>
                  </div>

                  {ag.status_atendimento === 'agendado' && (
                    <div className="flex gap-2 border-t border-border-line pt-3">
                      <button onClick={() => alterarStatus(ag.id, 'ausente')} className="flex-1 bg-background border p-2 rounded-xl text-xs font-bold text-text-muted hover:text-red-500 flex items-center justify-center gap-1 cursor-pointer"><XCircle size={14}/> Faltou</button>
                      <button onClick={() => alterarStatus(ag.id, 'concluido')} className="flex-1 bg-brand text-white p-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"><CheckCircle2 size={14}/> Concluir</button>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </main>

      {/* 🚀 MODAL: NOVO ATENDIMENTO DE BALCÃO MANUAL */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-surface w-full max-w-sm rounded-3xl p-5 border border-border-line shadow-2xl relative">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-sm text-text-base uppercase tracking-wider">Lançar Corte Manual</h3>
              <button onClick={() => setIsManualModalOpen(false)} className="text-text-muted hover:text-text-base"><X size={18}/></button>
            </div>

            <form onSubmit={handleSalvarAgendamentoManual} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-text-muted uppercase mb-1">Nome do Cliente *</label>
                <input required type="text" value={nomeClienteManual} onChange={(e) => setNomeClienteManual(e.target.value)} placeholder="Ex: Cliente Balcão 1" className="w-full rounded-xl bg-background border border-border-line p-2.5 text-xs text-text-base outline-none focus:border-brand" />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-text-muted uppercase mb-1">WhatsApp (Opcional)</label>
                <input type="tel" value={whatsappClienteManual} onChange={(e) => setWhatsappClienteManual(e.target.value)} placeholder="(00) 00000-0000" className="w-full rounded-xl bg-background border border-border-line p-2.5 text-xs text-text-base outline-none focus:border-brand" />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-text-muted uppercase mb-1">Serviço Realizado *</label>
                <select required value={servicoSelecionado} onChange={(e) => setServicoSelecionado(e.target.value)} className="w-full rounded-xl bg-background border border-border-line p-2.5 text-xs text-text-base outline-none focus:border-brand cursor-pointer">
                  <option value="" disabled>Selecione...</option>
                  {servicosDisponiveis.map(s => (
                    <option key={s.id} value={s.id}>{s.nome_servico} (R$ {Number(s.preco).toFixed(2)})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-text-muted uppercase mb-1">Horário do Atendimento *</label>
                <input required type="time" value={horaSelecionada} onChange={(e) => setHoraSelecionada(e.target.value)} className="w-full rounded-xl bg-background border border-border-line p-2.5 text-xs text-text-base outline-none focus:border-brand" />
              </div>

              <button type="submit" className="w-full bg-brand text-white font-bold p-3 rounded-xl text-xs transition-colors shadow-xs cursor-pointer">Concluir & Lançar no Caixa</button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}