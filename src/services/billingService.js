import { supabase } from './supabaseClient';

async function invokeBillingFunction(functionName, body) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;

  const accessToken = sessionData.session?.access_token;
  if (!accessToken) {
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  const { data, error } = await supabase.functions.invoke(functionName, {
    body,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (error) {
    const detail = data?.error || error.message || 'Erro na Edge Function.';
    throw new Error(detail);
  }

  if (data?.error) throw new Error(data.error);
  return data;
}

export async function fetchAvailablePlans() {
  const { data, error } = await supabase
    .from('plans')
    .select('id, slug, nome, descricao, preco_centavos, moeda, intervalo_cobranca, stripe_price_id, ordem_exibicao')
    .eq('ativo', true)
    .order('ordem_exibicao');

  if (error) throw error;
  return data || [];
}

export async function createBillingCheckout({ barbeariaId, planSlug }) {
  return invokeBillingFunction('create-billing-checkout', { barbeariaId, planSlug });
}

export async function createBillingPortal({ barbeariaId }) {
  return invokeBillingFunction('create-billing-portal', { barbeariaId });
}

export async function syncBillingSession({ barbeariaId, sessionId }) {
  return invokeBillingFunction('sync-billing-session', { barbeariaId, sessionId });
}

export function formatPrecoBRL(centavos) {
  return (Number(centavos || 0) / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function formatData(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export const SUBSCRIPTION_STATUS_LABELS = {
  trialing: 'Período de teste',
  active: 'Ativa',
  past_due: 'Pagamento pendente',
  canceled: 'Cancelada',
  unpaid: 'Não paga',
  paused: 'Pausada',
};
