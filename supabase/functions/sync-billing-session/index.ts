import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { jsonResponse, requireBillingAuth, assertCanManageBarbeariaBilling } from '../_shared/billingAuth.ts';
import { sincronizarCheckoutSession } from '../_shared/billingSync.ts';
import { corsHeaders } from '../_shared/stripeBilling.ts';

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

    const { barbeariaId, sessionId } = await req.json();
    if (!barbeariaId || !sessionId) {
      return jsonResponse({ error: 'barbeariaId e sessionId são obrigatórios.' }, 400);
    }

    const permission = await assertCanManageBarbeariaBilling(auth.supabaseUser, barbeariaId);
    if (!permission.ok) {
      return jsonResponse({ error: permission.message }, permission.status);
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });
    const result = await sincronizarCheckoutSession(
      auth.supabaseAdmin,
      stripe,
      sessionId,
      barbeariaId,
    );

    return jsonResponse({
      ok: true,
      planSlug: result.planSlug,
      subscriptionId: result.subscriptionId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao sincronizar checkout.';
    console.error('[sync-billing-session]', message);
    return jsonResponse({ error: message }, 400);
  }
});
