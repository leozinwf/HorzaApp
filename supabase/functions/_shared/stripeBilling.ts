const STRIPE_API = 'https://api.stripe.com/v1';

export function stripeHeaders(secretKey: string) {
  return {
    Authorization: `Bearer ${secretKey}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  };
}

export async function stripeRequest(
  secretKey: string,
  path: string,
  params: Record<string, string | number | boolean | undefined | null>,
) {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    body.append(key, String(value));
  }

  const res = await fetch(`${STRIPE_API}${path}`, {
    method: 'POST',
    headers: stripeHeaders(secretKey),
    body,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || `Stripe error ${res.status}`);
  }
  return data;
}

export function mapStripeSubscriptionStatus(status: string): string {
  const allowed = ['trialing', 'active', 'past_due', 'canceled', 'unpaid', 'paused'];
  return allowed.includes(status) ? status : 'canceled';
}

export function unixToIso(unix: number | null | undefined): string | null {
  if (!unix) return null;
  return new Date(unix * 1000).toISOString();
}

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
