import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { registrarBillingEvento, sincronizarAssinaturaStripe } from '../_shared/billingSync.ts';

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
  const webhookSecret = Deno.env.get('STRIPE_BILLING_WEBHOOK_SECRET');

  if (!stripeSecretKey || !webhookSecret) {
    return new Response('Stripe billing não configurado.', { status: 500 });
  }

  const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });
  const signature = req.headers.get('stripe-signature');
  const body = await req.text();

  if (!signature) {
    return new Response('Missing stripe-signature', { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Assinatura inválida';
    return new Response(`Webhook Error: ${message}`, { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  try {
    const processed = await registrarBillingEvento(supabase, {
      barbearia_id: null,
      subscription_id: null,
      tipo: event.type,
      stripe_event_id: event.id,
      payload: event.data.object as Record<string, unknown>,
    });

    if (!processed) {
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== 'subscription' || !session.subscription) break;

        const subscriptionId =
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription.id;

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await sincronizarAssinaturaStripe(supabase, subscription, {
          barbeariaId: session.metadata?.barbearia_id || session.client_reference_id,
          planSlug: session.metadata?.plan_slug,
          planId: session.metadata?.plan_id,
        });
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await sincronizarAssinaturaStripe(supabase, subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const { data: existing } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('stripe_subscription_id', subscription.id)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('subscriptions')
            .update({
              status: 'canceled',
              cancelado_em: new Date().toISOString(),
              atualizado_em: new Date().toISOString(),
            })
            .eq('id', existing.id);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId =
          typeof invoice.subscription === 'string'
            ? invoice.subscription
            : invoice.subscription?.id;

        if (subscriptionId) {
          await supabase
            .from('subscriptions')
            .update({ status: 'past_due', atualizado_em: new Date().toISOString() })
            .eq('stripe_subscription_id', subscriptionId);
        }
        break;
      }

      default:
        break;
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao processar webhook';
    console.error('[stripe-billing-webhook]', message);
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
});
