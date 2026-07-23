import { supabase } from './supabaseClient';

export const SUPPORT_CATEGORIES = [
  { value: 'geral', label: 'Geral' },
  { value: 'conta', label: 'Conta e login' },
  { value: 'agendamento', label: 'Agendamentos' },
  { value: 'pagamento', label: 'Pagamentos' },
  { value: 'tecnico', label: 'Problema técnico' },
  { value: 'outro', label: 'Outro' },
];

export const SUPPORT_STATUS_LABELS = {
  aberto: 'Aberto',
  em_andamento: 'Em andamento',
  respondido: 'Respondido',
  fechado: 'Fechado',
};

export const SUPPORT_STATUS_COLORS = {
  aberto: 'bg-red-500/15 text-red-600 border-red-500/30',
  em_andamento: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  respondido: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
  fechado: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
};

export function getSupportStatusClass(status) {
  return SUPPORT_STATUS_COLORS[status] || 'bg-background border border-border-line text-text-muted';
}

export async function createSupportTicket({ nome, email, assunto, categoria, mensagem }) {
  const { data, error } = await supabase.rpc('criar_ticket_suporte', {
    p_nome: nome,
    p_email: email,
    p_assunto: assunto,
    p_categoria: categoria || 'geral',
    p_mensagem: mensagem,
  });
  if (error) throw error;
  return data;
}

export async function fetchMySupportTickets() {
  const { data, error } = await supabase
    .from('support_tickets')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchAllSupportTickets() {
  const { data, error } = await supabase
    .from('support_tickets')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchTicketMessages(ticketId) {
  const { data, error } = await supabase
    .from('support_messages')
    .select('id, ticket_id, autor_tipo, autor_id, mensagem, created_at')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function masterReplyTicket({ ticketId, mensagem, status = 'respondido' }) {
  const { data, error } = await supabase.rpc('master_responder_ticket', {
    p_ticket_id: ticketId,
    p_mensagem: mensagem,
    p_novo_status: status,
  });
  if (error) throw error;
  return data;
}

export async function clientReplyTicket({ ticketId, mensagem }) {
  const { data, error } = await supabase.rpc('cliente_responder_ticket', {
    p_ticket_id: ticketId,
    p_mensagem: mensagem,
  });
  if (error) throw error;
  return data;
}

export async function markTicketRead(ticketId) {
  const { error } = await supabase.rpc('marcar_ticket_suporte_lido', {
    p_ticket_id: ticketId,
  });
  if (error) throw error;
}

export async function updateTicketStatus(ticketId, status) {
  const { error } = await supabase
    .from('support_tickets')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', ticketId);
  if (error) throw error;
}
