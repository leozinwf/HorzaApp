import { supabase } from './supabaseClient';

/**
 * Dispara notificação ao barbeiro (WhatsApp + Google Calendar do profissional, se configurado).
 * Falha silenciosa — não bloqueia o fluxo do cliente.
 */
export async function notificarNovoAgendamento(agendamentoId) {
  if (!agendamentoId) return null;

  try {
    const { data, error } = await supabase.functions.invoke('notificar-agendamento', {
      body: { agendamento_id: agendamentoId },
    });

    if (error) {
      console.warn('Notificação ao barbeiro:', error.message);
      return null;
    }

    return data;
  } catch (err) {
    console.warn('Notificação ao barbeiro indisponível:', err.message);
    return null;
  }
}

export async function conectarGoogleCalendar(code, userId) {
  const redirectUri = window.location.origin;

  const { data, error } = await supabase.functions.invoke('google-calendar-auth', {
    body: { code, user_id: userId, redirect_uri: redirectUri },
  });

  if (error) throw new Error(error.message || 'Erro ao conectar Google Calendar');
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function desconectarGoogleCalendar(userId) {
  const { error } = await supabase
    .from('usuarios')
    .update({ google_calendar_token: null })
    .eq('id', userId);

  if (error) throw error;
}
