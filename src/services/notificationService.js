import { supabase } from './supabaseClient';

export const NOTIFICATION_TYPE_LABELS = {
  agendamento: 'Agendamento',
  suporte: 'Suporte',
  barbearia: 'Barbearia',
  sistema: 'Sistema',
  novidade: 'Novidade',
};

export const NOTIFICATION_TYPE_COLORS = {
  agendamento: 'text-blue-600 bg-blue-500/10 border-blue-500/20',
  suporte: 'text-violet-600 bg-violet-500/10 border-violet-500/20',
  barbearia: 'text-amber-700 bg-amber-500/10 border-amber-500/20',
  sistema: 'text-text-base bg-surface border-border-line',
  novidade: 'text-brand bg-brand/10 border-brand/20',
};

export async function syncUpcomingAppointmentNotifications() {
  try {
    await supabase.rpc('sync_notificacoes_agendamentos_proximos');
  } catch {
    /* tabela pode não existir ainda */
  }
}

export async function fetchMyNotifications(limit = 30) {
  const { data, error } = await supabase
    .from('notificacoes')
    .select('id, tipo, titulo, mensagem, lida, barbearia_id, metadata, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function markNotificationRead(id) {
  const { error } = await supabase.rpc('marcar_notificacao_lida', { p_notificacao_id: id });
  if (error) throw error;
}

export async function markAllNotificationsRead() {
  const { error } = await supabase.rpc('marcar_todas_notificacoes_lidas');
  if (error) throw error;
}

export async function sendBarbershopNotification({ barbeariaId, titulo, mensagem, tipo = 'barbearia' }) {
  const { data, error } = await supabase.rpc('enviar_notificacao_barbearia', {
    p_barbearia_id: barbeariaId,
    p_titulo: titulo,
    p_mensagem: mensagem,
    p_tipo: tipo,
  });
  if (error) throw error;
  return data;
}

export function formatNotificationDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now - d;
  if (diffMs < 60000) return 'Agora';
  if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)} min`;
  if (diffMs < 86400000) return `${Math.floor(diffMs / 3600000)} h`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}
