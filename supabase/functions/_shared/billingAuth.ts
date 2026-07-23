import { createClient, SupabaseClient, User } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/stripeBilling.ts';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type BillingAuthContext = {
  user: User;
  supabaseUser: SupabaseClient;
  supabaseAdmin: SupabaseClient;
  accessToken: string;
};

export type BillingAuthFailure = {
  ok: false;
  status: number;
  message: string;
};

export type BillingAuthSuccess = {
  ok: true;
} & BillingAuthContext;

export type BillingAuthResult = BillingAuthFailure | BillingAuthSuccess;

function getSupabaseConfig() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseAnonKey =
    Deno.env.get('SUPABASE_ANON_KEY') ??
    Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ??
    '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  return { supabaseUrl, supabaseAnonKey, supabaseServiceKey };
}

function getAllowedOrigins(): Set<string> {
  const origins = new Set<string>();
  const raw = [
    Deno.env.get('SITE_URL'),
    Deno.env.get('BILLING_ALLOWED_ORIGINS'),
  ]
    .filter(Boolean)
    .join(',');

  for (const part of raw.split(',')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    try {
      origins.add(new URL(trimmed).origin);
    } catch {
      origins.add(trimmed);
    }
  }

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
  if (stripeKey.startsWith('sk_test_')) {
    origins.add('http://localhost:5173');
    origins.add('http://localhost:5174');
    origins.add('http://127.0.0.1:5173');
    origins.add('http://127.0.0.1:5174');
  }

  return origins;
}

function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  return token || null;
}

/**
 * Valida JWT via service role (confiável nas Edge Functions).
 * Mantém client anon com o mesmo token para RPCs que usam auth.uid().
 */
export async function requireBillingAuth(req: Request): Promise<BillingAuthResult> {
  if (req.method !== 'POST') {
    return { ok: false, status: 405, message: 'Method not allowed' };
  }

  const accessToken = extractBearerToken(req);
  if (!accessToken) {
    return { ok: false, status: 401, message: 'Não autenticado.' };
  }

  const { supabaseUrl, supabaseAnonKey, supabaseServiceKey } = getSupabaseConfig();
  if (!supabaseUrl || !supabaseServiceKey) {
    return { ok: false, status: 500, message: 'Supabase não configurado.' };
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(accessToken);

  if (authError || !authData.user) {
    console.error('[billingAuth] getUser:', authError?.message);
    return { ok: false, status: 401, message: 'Sessão inválida. Faça login novamente.' };
  }

  const supabaseUser = createClient(
    supabaseUrl,
    supabaseAnonKey || supabaseServiceKey,
    { global: { headers: { Authorization: `Bearer ${accessToken}` } } },
  );

  return {
    ok: true,
    user: authData.user,
    accessToken,
    supabaseUser,
    supabaseAdmin,
  };
}

export async function assertCanManageBarbeariaBilling(
  supabaseUser: SupabaseClient,
  barbeariaId: string,
): Promise<{ ok: true } | BillingAuthFailure> {
  if (!UUID_RE.test(barbeariaId)) {
    return { ok: false, status: 400, message: 'barbeariaId inválido.' };
  }

  const { data: pode, error } = await supabaseUser.rpc('usuario_pode_gerenciar_barbearia', {
    p_barbearia_id: barbeariaId,
  });

  if (error) {
    console.error('[billingAuth] usuario_pode_gerenciar_barbearia:', error.message);
    return { ok: false, status: 403, message: 'Sem permissão para gerenciar esta barbearia.' };
  }

  if (!pode) {
    return { ok: false, status: 403, message: 'Sem permissão para gerenciar esta barbearia.' };
  }

  return { ok: true };
}

/** Monta success/cancel no servidor — evita open redirect e mismatch de origem. */
export function buildBillingRedirectUrls(req: Request, barbeariaSlug: string) {
  const allowedOrigins = getAllowedOrigins();
  const originHeader = req.headers.get('Origin');

  let origin: string | null = null;

  if (originHeader && allowedOrigins.has(originHeader)) {
    origin = originHeader;
  }

  if (!origin) {
    const siteUrl = Deno.env.get('SITE_URL');
    if (siteUrl) {
      const siteOrigin = new URL(siteUrl).origin;
      if (allowedOrigins.size === 0 || allowedOrigins.has(siteOrigin)) {
        origin = siteOrigin;
      }
    }
  }

  if (!origin && allowedOrigins.size === 1) {
    origin = [...allowedOrigins][0];
  }

  if (!origin) {
    throw new Error(
      'Origem não autorizada. Configure SITE_URL nas secrets ou acesse pelo domínio permitido.',
    );
  }

  const path = `/${barbeariaSlug}/admin/plano`;
  const base = `${origin}${path}`;

  return {
    successUrl: `${base}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${base}?checkout=cancel`,
    returnUrl: base,
  };
}

export async function loadBillingBarbearia(
  supabaseAdmin: SupabaseClient,
  barbeariaId: string,
) {
  const { data, error } = await supabaseAdmin
    .from('barbearias')
    .select('id, nome, slug, status, empresa_id, empresas(id, nome, stripe_customer_id)')
    .eq('id', barbeariaId)
    .single();

  if (error || !data?.empresa_id) {
    throw new Error('Barbearia ou empresa não encontrada.');
  }

  if (data.status !== 'aprovada') {
    throw new Error('Barbearia ainda não aprovada para contratar plano.');
  }

  return data;
}

export function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
