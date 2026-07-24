import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useOutletContext } from 'react-router-dom';
import { Calendar, CheckCircle2, TrendingUp, Clock, User, Scissors, AlertCircle } from 'lucide-react';
import { getDayBoundsISO } from '../../utils/formatters';
import ProSection from '../../components/shared/ProSection';
import { DashboardAvancadoBlock } from '../../components/shared/ProModuleBlocks';
import { FEATURE_KEYS } from '../../constants/planFeatures';

export default function DashboardAdmin() {
  const { profile } = useAuth();
  const { adminBarbeariaId } = useOutletContext();
  const [loading, setLoading] = useState(true);
  
  // Estados para as Métricas
  const [stats, setStats] = useState({
    totalAgendamentos: 0,
    concluidos: 0,
    faltas: 0,
    aguardandoResolucao: 0,
    receita: 0,
    proximos: []
  });

  useEffect(() => {
    if (adminBarbeariaId) buscarDadosHoje();
  }, [adminBarbeariaId]);

  const buscarDadosHoje = async () => {
    setLoading(true);
    try {
      const hojeHTML = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  const bounds = getDayBoundsISO(hojeHTML);
      const inicioDia = bounds.inicio;
      const fimDia = bounds.fim;

      // Busca todos os agendamentos de hoje vinculados a barbeiros desta barbearia
      const { data, error } = await supabase
        .from('agendamentos')
        .select(`
          id, data_hora, status_atendimento, nome_cliente_avulso,
          servicos (preco, nome_servico),
          barbeiros:usuarios!agendamentos_barbeiro_id_fkey(nome, barbearia_id),
          clientes:usuarios!agendamentos_cliente_id_fkey(nome)
        `)
        .eq('barbearia_id', adminBarbeariaId)
        .gte('data_hora', inicioDia)
        .lte('data_hora', fimDia)
        .order('data_hora', { ascending: true });

      if (error) throw error;

      // Filtra apenas os agendamentos da barbearia atual
      const agendamentosHoje = data || [];

      let receitaTotal = 0;
      let totalConcluidos = 0;
      let totalFaltas = 0;
      let aguardandoResolucao = 0;
      let pendentes = [];

      const agora = new Date();

      agendamentosHoje.forEach(ag => {
        const duracaoMs = (ag.servicos?.duracao_minutos || 30) * 60000;
        const fimAg = new Date(ag.data_hora).getTime() + duracaoMs;

        if (ag.status_atendimento === 'concluido') {
          totalConcluidos++;
          receitaTotal += ag.servicos?.preco || 0;
        } else if (ag.status_atendimento === 'ausente') {
          totalFaltas++;
        } else if (ag.status_atendimento === 'agendado') {
          if (new Date(ag.data_hora) > agora) {
            pendentes.push(ag);
          } else if (agora.getTime() >= fimAg) {
            aguardandoResolucao++;
          }
        }
      });

      setStats({
        totalAgendamentos: agendamentosHoje.length,
        concluidos: totalConcluidos,
        faltas: totalFaltas,
        aguardandoResolucao,
        receita: receitaTotal,
        proximos: pendentes.slice(0, 5)
      });

    } catch (err) {
      console.error('Erro ao buscar dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto mb-20">
      
      <div className="mb-8">
        <h1 className="text-2xl font-black text-text-base">Visão Geral</h1>
        <p className="text-sm text-text-muted mt-1">Acompanhe o desempenho da sua barbearia hoje.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="h-8 w-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div></div>
      ) : (
        <>
          {/* CARDS DE ESTATÍSTICAS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            
            <div className="bg-surface border border-border-line p-6 rounded-2xl shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <p className="text-sm font-bold text-text-muted uppercase">Agendamentos Hoje</p>
                <div className="p-2 bg-brand/10 text-brand rounded-lg"><Calendar size={20}/></div>
              </div>
              <p className="text-3xl font-black text-text-base">{stats.totalAgendamentos}</p>
            </div>

            <div className="bg-surface border border-border-line p-6 rounded-2xl shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <p className="text-sm font-bold text-text-muted uppercase">Cortes Concluídos</p>
                <div className="p-2 bg-green-500/10 text-green-500 rounded-lg"><CheckCircle2 size={20}/></div>
              </div>
              <p className="text-3xl font-black text-text-base">{stats.concluidos}</p>
            </div>

            <div className="bg-surface border border-border-line p-6 rounded-2xl shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <p className="text-sm font-bold text-text-muted uppercase">Faltas (No-show)</p>
                <div className="p-2 bg-amber-500/10 text-amber-600 rounded-lg"><AlertCircle size={20}/></div>
              </div>
              <p className="text-3xl font-black text-text-base">{stats.faltas}</p>
              {stats.aguardandoResolucao > 0 && (
                <p className="text-xs text-amber-600 font-bold mt-1">
                  {stats.aguardandoResolucao} aguardando confirmação na agenda
                </p>
              )}
            </div>

            <div className="bg-surface border border-border-line p-6 rounded-2xl shadow-sm border-l-4 border-l-brand">
              <div className="flex justify-between items-start mb-4">
                <p className="text-sm font-bold text-text-muted uppercase">Faturamento (Realizado)</p>
                <div className="p-2 bg-brand/10 text-brand rounded-lg"><TrendingUp size={20}/></div>
              </div>
              <p className="text-3xl font-black text-brand">
                R$ {stats.receita.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>

          </div>

          {/* LISTA DE PRÓXIMOS CLIENTES */}
          <div className="bg-surface border border-border-line rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-lg mb-6 flex items-center gap-2"><Clock className="text-brand"/> Próximos Atendimentos</h3>
            
            {stats.proximos.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-text-muted font-semibold">Nenhum cliente agendado para as próximas horas.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {stats.proximos.map((ag) => {
                  const horaStr = new Date(ag.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
                  const nomeCliente = ag.nome_cliente_avulso || ag.clientes?.nome || 'Cliente';
                  
                  return (
                    <div key={ag.id} className="flex flex-col sm:flex-row justify-between sm:items-center p-4 border border-border-line rounded-xl hover:border-brand/30 transition-colors gap-4">
                      
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-brand/10 text-brand rounded-full flex justify-center items-center font-black text-lg">
                          {horaStr}
                        </div>
                        <div>
                          <p className="font-bold text-text-base flex items-center gap-1.5"><User size={14} className="text-text-muted"/> {nomeCliente}</p>
                          <p className="text-sm text-text-muted flex items-center gap-1.5 mt-0.5"><Scissors size={14}/> {ag.servicos?.nome_servico} (Barbeiro: {ag.barbeiros?.nome.split(' ')[0]})</p>
                        </div>
                      </div>

                      <div className="font-bold text-brand bg-brand/5 px-4 py-2 rounded-lg text-sm whitespace-nowrap text-center">
                        R$ {ag.servicos?.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <ProSection
            featureKey={FEATURE_KEYS.DASHBOARD_AVANCADO}
            title="Dashboard Avançado"
            description="Comparativos, projeções e ranking de performance — Horza Pro."
            overlay
          >
            <DashboardAvancadoBlock />
          </ProSection>
        </>
      )}
    </div>
  );
}