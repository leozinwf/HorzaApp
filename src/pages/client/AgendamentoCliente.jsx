import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { Calendar, Clock, User, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useIsMobile } from '../../hooks/useIsMobile';

import TopMenu from '../../components/layout/TopMenu';
import BottomMenu from '../../components/layout/BottomMenu';

export default function AgendamentoCliente() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [servicos, setServicos] = useState([]);
  const [barbeiros, setBarbeiros] = useState([]);
  
  const [passo, setPasso] = useState(1);
  const [servicoSelecionado, setServicoSelecionado] = useState(null);
  const [barbeiroSelecionado, setBarbeiroSelecionado] = useState(null);
  const [data, setData] = useState('');
  const [horario, setHorario] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    carregarDadosPublicos();
    recuperarRascunho();
  }, []);

  const recuperarRascunho = () => {
    const rascunho = localStorage.getItem('agendamento_pendente');
    if (rascunho) {
      const dados = JSON.parse(rascunho);
      setServicoSelecionado(dados.servico);
      setBarbeiroSelecionado(dados.barbeiro);
      setData(dados.data);
      setHorario(dados.horario);
      setPasso(3); // Pula direto para a confirmação
    }
  };

  const carregarDadosPublicos = async () => {
    try {
      const { data: servicosData } = await supabase.from('servicos').select('*');
      if (servicosData) setServicos(servicosData);

      const { data: barbeirosData } = await supabase.from('usuarios').select('id, nome').in('role', ['admin', 'funcionario']);
      if (barbeirosData) setBarbeiros(barbeirosData);
    } catch (err) {
      console.error('Erro ao carregar dados:', err.message);
    }
  };

  const handleConfirmarAgendamento = async () => {
    if (!data || !horario) {
      alert('Selecione uma data e um horário válidos.');
      return;
    }

    if (!user) {
      // Salva TUDO no localStorage para reconstruir a tela visualmente depois
      localStorage.setItem('agendamento_pendente', JSON.stringify({
        servico: servicoSelecionado,
        barbeiro: barbeiroSelecionado,
        data,
        horario
      }));
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('agendamentos').insert([{
        barbearia_id: servicoSelecionado.barbearia_id,
        cliente_id: user.id,
        barbeiro_id: barbeiroSelecionado.id,
        servico_id: servicoSelecionado.id,
        data_hora: `${data}T${horario}:00Z`,
        status_pagamento: 'pagar_na_hora'
      }]);

      if (error) throw error;
      
      // Limpa o rascunho pois já agendou com sucesso
      localStorage.removeItem('agendamento_pendente');
      setPasso(4); 
    } catch (err) {
      alert('Erro ao agendar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-text-base pb-24 md:pb-8">
      
      {!isMobile && <TopMenu />}

      <div className="flex-1 flex justify-center p-4">
        <div className="w-full max-w-lg mt-4 md:mt-8">
          
          {/* Barra de Progresso */}
          <div className="flex justify-between mb-8 px-4 relative">
            <div className="absolute top-4 left-0 h-0.5 bg-border-line w-full -z-10"></div>
            <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs ${passo >= 1 ? 'bg-brand text-white shadow-sm' : 'bg-border-line text-text-muted'}`}>1</div>
            <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs ${passo >= 2 ? 'bg-brand text-white shadow-sm' : 'bg-border-line text-text-muted'}`}>2</div>
            <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs ${passo >= 3 ? 'bg-brand text-white shadow-sm' : 'bg-border-line text-text-muted'}`}>3</div>
            <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs ${passo >= 4 ? 'bg-green-500 text-white shadow-sm' : 'bg-border-line text-text-muted'}`}>✓</div>
          </div>

          {/* ... [O RESTANTE DO CÓDIGO DOS PASSOS 1, 2, 3 E 4 PERMANECE EXATAMENTE IGUAL AO ANTERIOR] ... */}
          
          {/* PASSO 3: Data e Hora (Pequeno ajuste visual) */}
          {passo === 3 && (
            <div className="space-y-4 bg-surface p-6 rounded-2xl border border-border-line shadow-sm">
              <h2 className="text-sm font-bold text-text-muted mb-4 uppercase tracking-wider">3. Quando quer agendar?</h2>
              
              <div>
                <label className="block text-xs font-bold text-text-muted mb-1 uppercase tracking-wider">Data</label>
                <input type="date" value={data} onChange={(e) => setData(e.target.value)} className="w-full rounded-xl bg-background border border-border-line p-3 text-sm focus:border-brand outline-none text-text-base" />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted mb-1 uppercase tracking-wider">Horário</label>
                <input type="time" value={horario} onChange={(e) => setHorario(e.target.value)} className="w-full rounded-xl bg-background border border-border-line p-3 text-sm focus:border-brand outline-none text-text-base" />
              </div>

              <div className="bg-background p-4 rounded-xl border border-border-line text-xs text-text-muted space-y-1 mt-4">
                <p><span className="font-semibold text-text-base">Serviço:</span> {servicoSelecionado?.nome_servico}</p>
                <p><span className="font-semibold text-text-base">Profissional:</span> {barbeiroSelecionado?.nome}</p>
              </div>

              <div className="flex gap-2 mt-6">
                <button onClick={() => { setPasso(2); localStorage.removeItem('agendamento_pendente'); }} className="w-1/3 rounded-xl bg-background border border-border-line p-3 text-xs font-bold text-text-muted hover:bg-border-line cursor-pointer flex items-center justify-center gap-1"><ArrowLeft size={14}/> Voltar</button>
                <button disabled={loading} onClick={handleConfirmarAgendamento} className="w-2/3 cursor-pointer rounded-xl bg-brand p-3 text-sm font-bold text-white hover:bg-brand-hover transition-colors disabled:opacity-50 shadow-sm">
                  {loading ? 'A guardar...' : 'Confirmar Horário'}
                </button>
              </div>
            </div>
          )}

          {/* Outros passos omitidos para brevidade, mas devem ser copiados da resposta anterior */}

        </div>
      </div>

      {isMobile && <BottomMenu />}
    </div>
  );
}