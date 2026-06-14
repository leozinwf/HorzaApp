import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabaseClient';
import { TrendingUp, Users, Calendar as CalendarIcon, Clock } from 'lucide-react';

export default function DashboardAdmin() {
  const { profile } = useAuth();
  const [agendamentosHoje, setAgendamentosHoje] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.barbearia_id) buscarAgendamentosDoDia();
  }, [profile]);

  const buscarAgendamentosDoDia = async () => {
    try {
      const hoje = new Date().toISOString().split('T')[0];
      const inicioDoDia = `${hoje}T00:00:00.000Z`;
      const fimDoDia = `${hoje}T23:59:59.999Z`;

      const { data, error } = await supabase
        .from('agendamentos')
        .select(`
          id, data_hora, status_pagamento,
          servicos (nome_servico, preco),
          usuarios!agendamentos_cliente_id_fkey (nome),
          barbeiro:usuarios!agendamentos_barbeiro_id_fkey (nome)
        `)
        .eq('barbearia_id', profile.barbearia_id)
        .gte('data_hora', inicioDoDia)
        .lte('data_hora', fimDoDia)
        .order('data_hora', { ascending: true });

      if (error) throw error;
      setAgendamentosHoje(data || []);
    } catch (err) {
      console.error('Erro:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const totalCortes = agendamentosHoje.length;
  const faturamentoPrevisto = agendamentosHoje.reduce((acc, a) => acc + Number(a.servicos?.preco || 0), 0);

  return (
    <div className="p-6 md:p-10">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-text-base">Visão Geral</h1>
        <p className="text-sm text-text-muted">Acompanhe o movimento de hoje.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-surface p-6 rounded-2xl border border-border-line shadow-sm flex items-center gap-4">
          <div className="bg-brand/10 p-4 rounded-xl text-brand"><CalendarIcon size={24} /></div>
          <div>
            <p className="text-xs font-bold text-text-muted uppercase tracking-wider">Cortes Hoje</p>
            <p className="text-2xl font-extrabold text-text-base">{totalCortes}</p>
          </div>
        </div>
        <div className="bg-surface p-6 rounded-2xl border border-border-line shadow-sm flex items-center gap-4">
          <div className="bg-green-500/10 p-4 rounded-xl text-green-500"><TrendingUp size={24} /></div>
          <div>
            <p className="text-xs font-bold text-text-muted uppercase tracking-wider">Faturamento</p>
            <p className="text-2xl font-extrabold text-text-base">R$ {faturamentoPrevisto.toFixed(2)}</p>
          </div>
        </div>
        <div className="bg-surface p-6 rounded-2xl border border-border-line shadow-sm flex items-center gap-4">
          <div className="bg-blue-500/10 p-4 rounded-xl text-blue-500"><Users size={24} /></div>
          <div>
            <p className="text-xs font-bold text-text-muted uppercase tracking-wider">Equipe</p>
            <p className="text-2xl font-extrabold text-text-base">Ativa</p>
          </div>
        </div>
      </div>

      <div className="bg-surface rounded-2xl border border-border-line shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border-line"><h2 className="text-lg font-bold">Próximos Clientes</h2></div>
        {loading ? <p className="p-6 text-text-muted text-sm text-center">Carregando...</p> : agendamentosHoje.length === 0 ? <p className="p-6 text-text-muted text-sm text-center">Sem agendamentos para hoje.</p> : (
          <ul className="divide-y divide-border-line">
            {agendamentosHoje.map((a) => (
              <li key={a.id} className="p-6 flex justify-between items-center hover:bg-background transition-colors">
                <div className="flex items-center gap-4">
                  <div className="bg-brand text-white font-bold py-2 px-4 rounded-lg text-sm flex items-center gap-1">
                    <Clock size={16}/> {new Date(a.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div>
                    <p className="font-bold text-sm">{a.usuarios?.nome}</p>
                    <p className="text-xs text-text-muted">{a.servicos?.nome_servico} com {a.barbeiro?.nome}</p>
                  </div>
                </div>
                <span className="font-extrabold text-brand">R$ {Number(a.servicos?.preco).toFixed(2)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}