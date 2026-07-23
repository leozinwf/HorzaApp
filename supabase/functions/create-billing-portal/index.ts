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

    const { barbeariaId } = await req.json();
    if (!barbeariaId) {
      return jsonResponse({ error: 'barbeariaId é obrigatório.' }, 400);
    }

    const permission = await assertCanManageBarbeariaBilling(auth.supabaseUser, barbeariaId);
    if (!permission.ok) {
      return jsonResponse({ error: permission.message }, permission.status);
    }

    const barbearia = await loadBillingBarbearia(auth.supabaseAdmin, barbeariaId);
    const { returnUrl } = buildBillingRedirectUrls(req, barbearia.slug);

    const empresa = Array.isArray(barbearia.empresas) ? barbearia.empresas[0] : barbearia.empresas;
    const stripeCustomerId = empresa?.stripe_customer_id as string | null;

    if (!stripeCustomerId) {
      return jsonResponse({ error: 'Nenhuma assinatura Stripe encontrada para esta empresa.' }, 404);
    }

    const portal = await stripeRequest(stripeSecretKey, '/billing_portal/sessions', {
      customer: stripeCustomerId,
      return_url: returnUrl,
    });

    return jsonResponse({ url: portal.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao abrir portal.';
    return jsonResponse({ error: message }, 400);
  }
});
