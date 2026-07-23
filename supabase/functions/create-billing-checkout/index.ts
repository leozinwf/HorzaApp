import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, stripeRequest } from '../_shared/stripeBilling.ts';
import {
  assertCanManageBarbeariaBilling,
  buildBillingRedirectUrls,
  jsonResponse,
  loadBillingBarbearia,
  requireBillingAuth,
} from '../_shared/billingAuth.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const auth = await requireBillingAuth(req);
    if (!auth.ok) {
      return jsonResponse({ error: auth.message }, auth.status);
    }

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      return jsonResponse({ error: 'STRIPE_SECRET_KEY não configurada.' }, 500);
    }

    const body = await req.json();
    const barbeariaId = body?.barbeariaId;
    const planSlug = body?.planSlug;

    if (!barbeariaId || !planSlug) {
      return jsonResponse({ error: 'barbeariaId e planSlug são obrigatórios.' }, 400);
    }

    if (!['pro', 'plus'].includes(planSlug)) {
      return jsonResponse({ error: 'Plano inválido para checkout.' }, 400);
    }

    const permission = await assertCanManageBarbeariaBilling(auth.supabaseUser, barbeariaId);
    if (!permission.ok) {
      return jsonResponse({ error: permission.message }, permission.status);
    }

    const barbearia = await loadBillingBarbearia(auth.supabaseAdmin, barbeariaId);
    const { successUrl, cancelUrl } = buildBillingRedirectUrls(req, barbearia.slug);

    const { data: plan, error: planError } = await auth.supabaseAdmin
      .from('plans')
      .select('id, slug, nome, stripe_price_id, moeda')
      .eq('slug', planSlug)
      .eq('ativo', true)
      .single();

    if (planError || !plan) {
      return jsonResponse({ error: 'Plano não encontrado.' }, 404);
    }

    if (!plan.stripe_price_id) {
      return jsonResponse({
        error: `Plano ${planSlug} sem stripe_price_id. Configure o Price no Stripe e atualize plans.`,
      }, 503);
    }

    const empresa = Array.isArray(barbearia.empresas) ? barbearia.empresas[0] : barbearia.empresas;
    let stripeCustomerId = empresa?.stripe_customer_id as string | null;

    const { data: usuario } = await auth.supabaseAdmin
      .from('usuarios')
      .select('email, nome')
      .eq('id', auth.user.id)
      .maybeSingle();

    if (!stripeCustomerId) {
      const customer = await stripeRequest(stripeSecretKey, '/customers', {
        name: empresa?.nome || barbearia.nome,
        email: usuario?.email || auth.user.email || undefined,
        'metadata[empresa_id]': barbearia.empresa_id,
        'metadata[barbearia_id]': barbeariaId,
      });
      stripeCustomerId = customer.id;

      await auth.supabaseAdmin
        .from('empresas')
        .update({ stripe_customer_id: stripeCustomerId, atualizado_em: new Date().toISOString() })
        .eq('id', barbearia.empresa_id);
    }

    // Stripe Checkout Session — mode subscription, price do banco, metadados para webhook
    const session = await stripeRequest(stripeSecretKey, '/checkout/sessions', {
      mode: 'subscription',
      customer: stripeCustomerId,
      'line_items[0][price]': plan.stripe_price_id,
      'line_items[0][quantity]': 1,
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: barbeariaId,
      'metadata[barbearia_id]': barbeariaId,
      'metadata[empresa_id]': barbearia.empresa_id,
      'metadata[plan_slug]': planSlug,
      'metadata[plan_id]': plan.id,
      'subscription_data[metadata][barbearia_id]': barbeariaId,
      'subscription_data[metadata][empresa_id]': barbearia.empresa_id,
      'subscription_data[metadata][plan_slug]': planSlug,
      'subscription_data[metadata][plan_id]': plan.id,
    });

    return jsonResponse({
      url: session.url,
      sessionId: session.id,
      successUrl,
      cancelUrl,
      stripePriceId: plan.stripe_price_id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao criar checkout.';
    console.error('[create-billing-checkout]', message);
    return jsonResponse({ error: message }, 400);
  }
});
