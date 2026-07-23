import { supabase } from './supabaseClient';

export async function masterAddCoins(userId, quantidade, motivo = '') {
  const { data, error } = await supabase.rpc('master_adicionar_moedas', {
    p_user_id: userId,
    p_quantidade: quantidade,
    p_motivo: motivo || null,
  });
  if (error) throw error;
  return data;
}

export async function fetchSupportNavStats() {
  const { data, error } = await supabase
    .from('support_tickets')
    .select('status, cliente_leu, ultima_resposta_master');
  if (error) throw error;

  const tickets = data || [];
  const abertos = tickets.filter((t) => t.status === 'aberto').length;
  const emAndamento = tickets.filter((t) => t.status === 'em_andamento').length;
  const respondidos = tickets.filter((t) => t.status === 'respondido').length;
  const fechados = tickets.filter((t) => t.status === 'fechado').length;
  const precisaAtencao = tickets.filter(
    (t) => t.status === 'aberto' || t.status === 'em_andamento' || (!t.cliente_leu && t.ultima_resposta_master === false)
  ).length;

  return {
    total: tickets.length,
    abertos,
    emAndamento,
    respondidos,
    fechados,
    precisaAtencao,
    badgeCount: tickets.filter((t) => ['aberto', 'em_andamento'].includes(t.status)).length,
  };
}
