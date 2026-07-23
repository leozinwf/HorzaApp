import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import type Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { mapStripeSubscriptionStatus, unixToIso } from './stripeBilling.ts';

export type SupabaseAdmin = ReturnType<typeof createClient>;

export async function sincronizarAssinaturaStripe(
  supabase: SupabaseAdmin,
  subscription: Stripe.Subscription,
  fallback?: { barbeariaId?: string | null; planSlug?: string | null; planId?: string | null },
) {
  const barbeariaId = await resolverBarbeariaId(supabase, subscription, fallback);

  if (!barbeariaId) {
    throw new Error('barbearia_id ausente nos metadados da assinatura Stripe.');
  }

  const { plan, stripeCustomerId } = await validarContextoAssinatura(
    supabase,
    subscription,
    barbeariaId,
  );

  const price = subscription.items.data[0]?.price;

  const { data: subId, error } = await supabase.rpc('upsert_subscription_from_stripe', {
    p_stripe_subscription_id: subscription.id,
    p_stripe_customer_id: stripeCustomerId,
    p_barbearia_id: barbeariaId,
    p_plan_id: plan.id,
    p_status: mapStripeSubscriptionStatus(subscription.status),
    p_current_period_start: unixToIso(subscription.current_period_start),
    p_current_period_end: unixToIso(subscription.current_period_end),
    p_billing_cycle_anchor: unixToIso(subscription.billing_cycle_anchor),
    p_trial_start: unixToIso(subscription.trial_start),
    p_trial_end: unixToIso(subscription.trial_end),
    p_cancel_at_period_end: subscription.cancel_at_period_end ?? false,
    p_collection_method: subscription.collection_method ?? 'charge_automatically',
    p_billing_interval: price?.recurring?.interval ?? null,
    p_billing_interval_count: price?.recurring?.interval_count ?? 1,
    p_moeda: (price?.currency ?? 'brl').toUpperCase(),
    p_stripe_latest_invoice_id:
      typeof subscription.latest_invoice === 'string'
        ? subscription.latest_invoice
        : subscription.latest_invoice?.id ?? null,
    p_stripe_default_payment_method_id:
      typeof subscription.default_payment_method === 'string'
        ? subscription.default_payment_method
        : subscription.default_payment_method?.id ?? null,
  });

  if (error) {
    console.error('[billingSync] upsert_subscription_from_stripe:', error.message);
    throw new Error(error.message);
  }

  return { subscriptionId: subId as string, barbeariaId, planSlug: plan.slug };
}

export async function sincronizarCheckoutSession(
  supabase: SupabaseAdmin,
  stripe: Stripe,
  sessionId: string,
  expectedBarbeariaId: string,
) {
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['subscription'],
  });

  if (session.mode !== 'subscription') {
    throw new Error('Sessão não é de assinatura.');
  }

  const sessionBarbeariaId =
    session.metadata?.barbearia_id || session.client_reference_id || null;

  if (sessionBarbeariaId !== expectedBarbeariaId) {
    throw new Error('Sessão de checkout não pertence a esta barbearia.');
  }

  if (session.payment_status !== 'paid' && session.status !== 'complete') {
    throw new Error('Pagamento ainda não confirmado.');
  }

  let subscription: Stripe.Subscription | null = null;

  if (session.subscription && typeof session.subscription !== 'string') {
    subscription = session.subscription as Stripe.Subscription;
  } else if (typeof session.subscription === 'string') {
    subscription = await stripe.subscriptions.retrieve(session.subscription);
  }

  if (!subscription) {
    throw new Error('Assinatura Stripe não encontrada na sessão.');
  }

  return sincronizarAssinaturaStripe(supabase, subscription, {
    barbeariaId: sessionBarbeariaId,
    planSlug: session.metadata?.plan_slug,
    planId: session.metadata?.plan_id,
  });
}

async function resolverBarbeariaId(
  supabase: SupabaseAdmin,
  subscription: Stripe.Subscription,
  fallback?: { barbeariaId?: string | null },
) {
  const fromMeta = subscription.metadata?.barbearia_id || fallback?.barbeariaId || null;
  if (fromMeta) return fromMeta;

  const { data } = await supabase
    .from('subscriptions')
    .select('barbearia_id')
    .eq('stripe_subscription_id', subscription.id)
    .maybeSingle();

  return data?.barbearia_id ?? null;
}

async function validarContextoAssinatura(
  supabase: SupabaseAdmin,
  subscription: Stripe.Subscription,
  barbeariaId: string,
) {
  const priceId = subscription.items.data[0]?.price?.id;
  if (!priceId) {
    throw new Error('Assinatura Stripe sem price.');
  }

  const { data: plan, error: planError } = await supabase
    .from('plans')
    .select('id, slug, stripe_price_id')
    .eq('stripe_price_id', priceId)
    .eq('ativo', true)
    .maybeSingle();

  if (planError || !plan) {
    throw new Error(`Price Stripe não autorizado: ${priceId}`);
  }

  const { data: barbearia, error: barbeariaError } = await supabase
    .from('barbearias')
    .select('id, status, empresa_id, empresas(stripe_customer_id)')
    .eq('id', barbeariaId)
    .single();

  if (barbeariaError || !barbearia) {
    throw new Error('Barbearia não encontrada para assinatura Stripe.');
  }

  if (barbearia.status !== 'aprovada') {
    throw new Error('Barbearia não aprovada.');
  }

  const empresa = Array.isArray(barbearia.empresas) ? barbearia.empresas[0] : barbearia.empresas;
  const stripeCustomerId = String(subscription.customer);
  const empresaCustomer = empresa?.stripe_customer_id as string | null;

  if (empresaCustomer && empresaCustomer !== stripeCustomerId) {
    throw new Error('Customer Stripe não corresponde à empresa da barbearia.');
  }

  const metaEmpresaId = subscription.metadata?.empresa_id;
  if (metaEmpresaId && metaEmpresaId !== barbearia.empresa_id) {
    throw new Error('empresa_id nos metadados não confere com a barbearia.');
  }

  const metaPlanId = subscription.metadata?.plan_id;
  if (metaPlanId && metaPlanId !== plan.id) {
    throw new Error('plan_id nos metadados não confere com o price Stripe.');
  }

  return { plan, barbearia, stripeCustomerId };
}

export async function registrarBillingEvento(
  supabase: SupabaseAdmin,
  payload: {
    barbearia_id?: string | null;
    subscription_id?: string | null;
    tipo: string;
    stripe_event_id: string;
    payload: Record<string, unknown>;
  },
) {
  const { data: existing } = await supabase
    .from('billing_events')
    .select('id')
    .eq('stripe_event_id', payload.stripe_event_id)
    .maybeSingle();

  if (existing) return false;

  await supabase.from('billing_events').insert({
    barbearia_id: payload.barbearia_id ?? null,
    subscription_id: payload.subscription_id ?? null,
    tipo: payload.tipo,
    stripe_event_id: payload.stripe_event_id,
    payload: payload.payload,
  });

  return true;
}
