import { supabase } from './supabaseClient';

export const CADASTRO_PENDENTE_KEY = 'horza_cadastro_pendente';

export const normalizarWhatsapp = (valor) => (valor || '').replace(/\D/g, '');

export function salvarCadastroPendente({ nome, whatsapp, email, barbeariaSlug }) {
  localStorage.setItem(
    CADASTRO_PENDENTE_KEY,
    JSON.stringify({ nome, whatsapp, email: email || '', barbeariaSlug: barbeariaSlug || '' })
  );
}

export function lerCadastroPendente() {
  try {
    const raw = localStorage.getItem(CADASTRO_PENDENTE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function limparCadastroPendente() {
  localStorage.removeItem(CADASTRO_PENDENTE_KEY);
}

export async function vincularAgendamentosGhost(userId, whatsapp, email) {
  if (!userId || !whatsapp) return 0;

  const { data, error } = await supabase.rpc('vincular_agendamentos_ghost', {
    p_user_id: userId,
    p_whatsapp: whatsapp,
    p_email: email || null,
  });

  if (error) {
    console.warn('Não foi possível vincular agendamentos avulsos:', error.message);
    return 0;
  }

  return data || 0;
}
