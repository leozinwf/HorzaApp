-- Horza SaaS — Ajustes estruturais (empresas, índices, subscriptions Stripe-ready)
-- Pré-requisito: 20260723130000_saas_plans_foundation.sql
--
-- IMPORTANTE: rode via `supabase db push` ou CLI. No SQL Editor do Dashboard,
-- desative a opção que injeta RLS automaticamente — ela quebra funções trigger
-- que referenciam colunas como empresa_id.

-- ---------------------------------------------------------------------------
-- 1. Tabela empresas (entidade de negócio / multi-unidades / billing)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  razao_social TEXT,
  cnpj TEXT,
  stripe_customer_id TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_empresas_cnpj
  ON empresas(cnpj)
  WHERE cnpj IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_empresas_stripe_customer
  ON empresas(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_empresas_nome
  ON empresas(nome);

ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS empresas_tenant_read ON empresas;
CREATE POLICY empresas_tenant_read ON empresas
  FOR SELECT TO authenticated
  USING (
    public.is_horza_master()
    OR EXISTS (
      SELECT 1
      FROM barbearias b
      WHERE b.empresa_id = empresas.id
        AND public.usuario_pode_gerenciar_barbearia(b.id)
    )
  );

DROP POLICY IF EXISTS empresas_master_all ON empresas;
CREATE POLICY empresas_master_all ON empresas
  FOR ALL TO authenticated
  USING (public.is_horza_master())
  WITH CHECK (public.is_horza_master());

-- ---------------------------------------------------------------------------
-- 2. Corrigir barbearias.empresa_id → empresas (antes apontava para barbearias)
-- ---------------------------------------------------------------------------
ALTER TABLE barbearias DROP CONSTRAINT IF EXISTS barbearias_empresa_id_fkey;

CREATE TEMP TABLE _barbearia_empresa_map (
  barbearia_id UUID PRIMARY KEY,
  empresa_id UUID NOT NULL DEFAULT gen_random_uuid()
);

INSERT INTO _barbearia_empresa_map (barbearia_id)
SELECT id FROM barbearias
ON CONFLICT (barbearia_id) DO NOTHING;

INSERT INTO empresas (id, nome, razao_social, cnpj, criado_em)
SELECT
  m.empresa_id,
  b.nome,
  b.razao_social,
  CASE
    WHEN b.cnpj IS NULL THEN NULL
    WHEN EXISTS (
      SELECT 1
      FROM _barbearia_empresa_map m2
      JOIN barbearias b2 ON b2.id = m2.barbearia_id
      WHERE b2.cnpj = b.cnpj
        AND m2.barbearia_id < m.barbearia_id
    ) THEN NULL
    ELSE b.cnpj
  END,
  COALESCE(b.criado_em, now())
FROM _barbearia_empresa_map m
JOIN barbearias b ON b.id = m.barbearia_id
ON CONFLICT (id) DO NOTHING;

-- Agrupa filiais: barbearia com empresa_id legado apontando para outra barbearia
-- herda a empresa da matriz (raiz do grupo).
WITH RECURSIVE grupo AS (
  SELECT
    b.id AS barbearia_id,
    b.empresa_id AS parent_barbearia_id,
    b.id AS root_barbearia_id,
    0 AS depth
  FROM barbearias b

  UNION ALL

  SELECT
    g.barbearia_id,
    parent.empresa_id,
    parent.id,
    g.depth + 1
  FROM grupo g
  JOIN barbearias parent ON parent.id = g.parent_barbearia_id
  WHERE g.parent_barbearia_id IS NOT NULL
    AND g.parent_barbearia_id <> g.barbearia_id
    AND g.depth < 20
),
raizes AS (
  SELECT DISTINCT ON (barbearia_id)
    barbearia_id,
    root_barbearia_id
  FROM grupo
  ORDER BY barbearia_id, depth DESC
)
UPDATE _barbearia_empresa_map target
SET empresa_id = matriz.empresa_id
FROM raizes r
JOIN _barbearia_empresa_map matriz ON matriz.barbearia_id = r.root_barbearia_id
WHERE target.barbearia_id = r.barbearia_id
  AND r.root_barbearia_id <> r.barbearia_id;

UPDATE barbearias b
SET empresa_id = m.empresa_id
FROM _barbearia_empresa_map m
WHERE b.id = m.barbearia_id;

-- Remove empresas órfãs geradas no backfill 1:1 e depois consolidadas
DELETE FROM empresas e
WHERE NOT EXISTS (
  SELECT 1 FROM barbearias b WHERE b.empresa_id = e.id
);

ALTER TABLE barbearias
  ADD CONSTRAINT barbearias_empresa_id_fkey
  FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_barbearias_empresa
  ON barbearias(empresa_id);

-- ---------------------------------------------------------------------------
-- 3. Subscriptions enriquecidas (campos alinhados ao Stripe Subscription)
-- ---------------------------------------------------------------------------
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS moeda TEXT NOT NULL DEFAULT 'BRL',
  ADD COLUMN IF NOT EXISTS billing_interval TEXT
    CHECK (billing_interval IS NULL OR billing_interval IN ('day', 'week', 'month', 'year')),
  ADD COLUMN IF NOT EXISTS billing_interval_count INT NOT NULL DEFAULT 1
    CHECK (billing_interval_count > 0),
  ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS billing_cycle_anchor TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS collection_method TEXT NOT NULL DEFAULT 'charge_automatically'
    CHECK (collection_method IN ('charge_automatically', 'send_invoice')),
  ADD COLUMN IF NOT EXISTS stripe_latest_invoice_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_default_payment_method_id TEXT;

UPDATE subscriptions s
SET
  empresa_id = b.empresa_id,
  current_period_start = COALESCE(s.current_period_start, s.periodo_inicio),
  current_period_end = COALESCE(s.current_period_end, s.periodo_fim),
  billing_cycle_anchor = COALESCE(s.billing_cycle_anchor, s.periodo_inicio),
  billing_interval = COALESCE(
    s.billing_interval,
    CASE pl.intervalo_cobranca
      WHEN 'month' THEN 'month'
      WHEN 'year' THEN 'year'
      ELSE NULL
    END
  ),
  moeda = COALESCE(NULLIF(s.moeda, ''), pl.moeda, 'BRL')
FROM barbearias b, plans pl
WHERE s.barbearia_id = b.id
  AND pl.id = s.plan_id
  AND (
    s.empresa_id IS NULL
    OR s.current_period_start IS NULL
    OR s.billing_interval IS NULL
  );

-- Stripe Customer na empresa (fonte canônica para Billing)
UPDATE empresas e
SET
  stripe_customer_id = src.stripe_customer_id,
  atualizado_em = now()
FROM (
  SELECT DISTINCT ON (b.empresa_id)
    b.empresa_id,
    s.stripe_customer_id
  FROM subscriptions s
  JOIN barbearias b ON b.id = s.barbearia_id
  WHERE b.empresa_id IS NOT NULL
    AND s.stripe_customer_id IS NOT NULL
  ORDER BY b.empresa_id, s.atualizado_em DESC NULLS LAST, s.criado_em DESC
) src
WHERE e.id = src.empresa_id
  AND e.stripe_customer_id IS NULL;

CREATE OR REPLACE FUNCTION public.sync_subscription_billing_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $horza_sync_sub_billing$
DECLARE
  rec subscriptions%ROWTYPE;
  v_empresa UUID;
  v_interval TEXT;
  v_moeda TEXT;
BEGIN
  rec := NEW;

  IF rec.empresa_id IS NULL AND rec.barbearia_id IS NOT NULL THEN
    SELECT b.empresa_id INTO v_empresa
    FROM barbearias b
    WHERE b.id = rec.barbearia_id;
    rec.empresa_id := v_empresa;
  END IF;

  rec.current_period_start := COALESCE(rec.current_period_start, rec.periodo_inicio, now());
  rec.periodo_inicio := rec.current_period_start;

  rec.current_period_end := COALESCE(rec.current_period_end, rec.periodo_fim);
  rec.periodo_fim := rec.current_period_end;

  IF rec.billing_cycle_anchor IS NULL THEN
    rec.billing_cycle_anchor := rec.current_period_start;
  END IF;

  IF rec.billing_interval IS NULL AND rec.plan_id IS NOT NULL THEN
    SELECT CASE pl.intervalo_cobranca
      WHEN 'month' THEN 'month'
      WHEN 'year' THEN 'year'
      ELSE NULL
    END
    INTO v_interval
    FROM plans pl
    WHERE pl.id = rec.plan_id;
    rec.billing_interval := v_interval;
  END IF;

  IF rec.moeda IS NULL OR rec.moeda = '' THEN
    SELECT COALESCE(pl.moeda, 'BRL')
    INTO v_moeda
    FROM plans pl
    WHERE pl.id = rec.plan_id;
    rec.moeda := v_moeda;
  END IF;

  rec.atualizado_em := now();
  NEW := rec;
  RETURN NEW;
END;
$horza_sync_sub_billing$;

DROP TRIGGER IF EXISTS trg_sync_subscription_billing ON subscriptions;
CREATE TRIGGER trg_sync_subscription_billing
  BEFORE INSERT OR UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_subscription_billing_fields();

-- ---------------------------------------------------------------------------
-- 4. Restrições UNIQUE e índices (integridade + desempenho)
-- ---------------------------------------------------------------------------

-- plan_features: garante UNIQUE explícito se migration anterior rodou sem constraint nomeada
DO $horza_do_plan_features$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'plan_features_plan_id_feature_key_key'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.plan_features'::regclass
      AND contype = 'u'
      AND pg_get_constraintdef(oid) LIKE '%plan_id%feature_key%'
  ) THEN
    ALTER TABLE plan_features
      ADD CONSTRAINT plan_features_plan_id_feature_key_key UNIQUE (plan_id, feature_key);
  END IF;
END $horza_do_plan_features$;

-- feature_usage: idempotência do contador mensal
DO $horza_do_feature_usage$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.feature_usage'::regclass
      AND contype = 'u'
      AND pg_get_constraintdef(oid) LIKE '%barbearia_id%feature_key%periodo_inicio%'
  ) THEN
    ALTER TABLE feature_usage
      ADD CONSTRAINT feature_usage_barbearia_feature_periodo_key
      UNIQUE (barbearia_id, feature_key, periodo_inicio);
  END IF;
END $horza_do_feature_usage$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_plans_stripe_price
  ON plans(stripe_price_id)
  WHERE stripe_price_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_plans_stripe_product
  ON plans(stripe_product_id)
  WHERE stripe_product_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_plans_ativo_ordem
  ON plans(ativo, ordem_exibicao);

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub_unique
  ON subscriptions(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer
  ON subscriptions(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_status
  ON subscriptions(status);

CREATE INDEX IF NOT EXISTS idx_subscriptions_plan
  ON subscriptions(plan_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_empresa
  ON subscriptions(empresa_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end
  ON subscriptions(current_period_end)
  WHERE current_period_end IS NOT NULL;

-- Nota: assinatura única por empresa (multi-unidades) fica para Fase 2 Billing.

CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_events_stripe_event
  ON billing_events(stripe_event_id)
  WHERE stripe_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_billing_events_subscription
  ON billing_events(subscription_id, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_billing_events_tipo
  ON billing_events(tipo, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_feature_usage_periodo
  ON feature_usage(periodo_inicio);

-- ---------------------------------------------------------------------------
-- 5. RPCs e view atualizados
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_tenant_plan_info(p_barbearia_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $horza_get_tenant_plan_info$
DECLARE
  v_slug TEXT := 'free';
  v_nome TEXT := 'Horza Free';
  v_preco INT := 0;
  v_status TEXT := 'active';
  v_periodo_fim TIMESTAMPTZ;
  v_vencimento TIMESTAMPTZ;
  v_empresa_id UUID;
  v_subscription_id UUID;
  v_billing JSONB;
  v_features JSONB;
  v_usage JSONB;
BEGIN
  SELECT
    pl.slug,
    pl.nome,
    pl.preco_centavos,
    s.status,
    COALESCE(s.current_period_end, s.periodo_fim),
    s.vencimento,
    s.empresa_id,
    s.id,
    jsonb_build_object(
      'subscription_id', s.id,
      'empresa_id', s.empresa_id,
      'moeda', s.moeda,
      'billing_interval', s.billing_interval,
      'billing_interval_count', s.billing_interval_count,
      'current_period_start', COALESCE(s.current_period_start, s.periodo_inicio),
      'current_period_end', COALESCE(s.current_period_end, s.periodo_fim),
      'billing_cycle_anchor', s.billing_cycle_anchor,
      'trial_start', s.trial_start,
      'trial_end', s.trial_end,
      'cancel_at_period_end', s.cancel_at_period_end,
      'collection_method', s.collection_method,
      'stripe_customer_id', COALESCE(e.stripe_customer_id, s.stripe_customer_id),
      'stripe_subscription_id', s.stripe_subscription_id,
      'stripe_latest_invoice_id', s.stripe_latest_invoice_id,
      'stripe_default_payment_method_id', s.stripe_default_payment_method_id,
      'cancelado_em', s.cancelado_em
    )
  INTO
    v_slug,
    v_nome,
    v_preco,
    v_status,
    v_periodo_fim,
    v_vencimento,
    v_empresa_id,
    v_subscription_id,
    v_billing
  FROM subscriptions s
  JOIN plans pl ON pl.id = s.plan_id
  LEFT JOIN empresas e ON e.id = s.empresa_id
  WHERE s.barbearia_id = p_barbearia_id
    AND s.status IN ('trialing', 'active', 'past_due', 'canceled', 'paused', 'unpaid')
  ORDER BY s.criado_em DESC
  LIMIT 1;

  SELECT COALESCE(jsonb_object_agg(
    pf.feature_key,
    jsonb_build_object(
      'enabled', pf.habilitado,
      'limit', pf.limite_valor
    )
  ), '{}'::jsonb)
  INTO v_features
  FROM plans pl
  JOIN plan_features pf ON pf.plan_id = pl.id
  WHERE pl.slug = v_slug;

  SELECT COALESCE(jsonb_object_agg(feature_key, contador), '{}'::jsonb)
  INTO v_usage
  FROM feature_usage
  WHERE barbearia_id = p_barbearia_id
    AND periodo_inicio = date_trunc('month', now())::DATE;

  RETURN jsonb_build_object(
    'plan_slug', v_slug,
    'plan_nome', v_nome,
    'preco_centavos', v_preco,
    'subscription_status', v_status,
    'periodo_fim', v_periodo_fim,
    'vencimento', v_vencimento,
    'empresa_id', v_empresa_id,
    'subscription_id', v_subscription_id,
    'billing', v_billing,
    'features', v_features,
    'usage', v_usage,
    'team_count', public.count_team_members(p_barbearia_id),
    'appointments_month', public.get_feature_usage_count(p_barbearia_id, 'max_appointments_month')
  );
END;
$horza_get_tenant_plan_info$;

DROP VIEW IF EXISTS public.barbearia_plano_atual;

CREATE VIEW public.barbearia_plano_atual AS
SELECT
  b.id AS barbearia_id,
  b.empresa_id,
  b.slug,
  b.nome,
  b.status AS barbearia_status,
  b.cidade,
  b.bairro,
  b.logo_url,
  b.capa_url,
  COALESCE(pl.slug, 'free') AS plan_slug,
  COALESCE(pl.nome, 'Horza Free') AS plan_nome,
  s.status AS subscription_status,
  COALESCE(s.current_period_end, s.periodo_fim) AS periodo_fim,
  s.vencimento,
  s.billing_interval,
  s.cancel_at_period_end,
  public.tenant_has_feature(b.id, 'marketplace_premium') AS marketplace_premium
FROM barbearias b
LEFT JOIN subscriptions s
  ON s.barbearia_id = b.id
 AND s.status IN ('trialing', 'active', 'past_due')
LEFT JOIN plans pl ON pl.id = s.plan_id;

GRANT SELECT ON public.barbearia_plano_atual TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.ensure_free_subscription(p_barbearia_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $horza_ensure_free_sub$
DECLARE
  v_sub_id UUID;
  v_plan_id UUID;
  v_empresa_id UUID;
BEGIN
  SELECT b.empresa_id INTO v_empresa_id
  FROM barbearias b
  WHERE b.id = p_barbearia_id;

  SELECT id INTO v_plan_id FROM plans WHERE slug = 'free' LIMIT 1;

  IF NOT EXISTS (
    SELECT 1 FROM subscriptions s
    WHERE s.barbearia_id = p_barbearia_id
      AND s.status IN ('trialing', 'active', 'past_due')
  ) THEN
    INSERT INTO subscriptions (barbearia_id, empresa_id, plan_id, status, periodo_inicio, current_period_start)
    VALUES (p_barbearia_id, v_empresa_id, v_plan_id, 'active', now(), now())
    RETURNING id INTO v_sub_id;
  END IF;

  IF v_sub_id IS NULL THEN
    SELECT s.id INTO v_sub_id
    FROM subscriptions s
    WHERE s.barbearia_id = p_barbearia_id
      AND s.status IN ('trialing', 'active', 'past_due')
    LIMIT 1;
  END IF;

  RETURN v_sub_id;
END;
$horza_ensure_free_sub$;

CREATE OR REPLACE FUNCTION public.master_set_tenant_plan(
  p_barbearia_id UUID,
  p_plan_slug TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $horza_master_set_plan$
DECLARE
  v_plan_id UUID;
  v_empresa_id UUID;
BEGIN
  IF NOT public.is_horza_master() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT id INTO v_plan_id FROM plans WHERE slug = p_plan_slug AND ativo = true;
  IF v_plan_id IS NULL THEN
    RAISE EXCEPTION 'Plano inválido: %', p_plan_slug;
  END IF;

  SELECT b.empresa_id INTO v_empresa_id
  FROM barbearias b
  WHERE b.id = p_barbearia_id;

  UPDATE subscriptions
  SET status = 'canceled', cancelado_em = now(), atualizado_em = now()
  WHERE barbearia_id = p_barbearia_id
    AND status IN ('trialing', 'active', 'past_due');

  INSERT INTO subscriptions (
    barbearia_id,
    empresa_id,
    plan_id,
    status,
    periodo_inicio,
    current_period_start
  )
  VALUES (p_barbearia_id, v_empresa_id, v_plan_id, 'active', now(), now());

  INSERT INTO billing_events (barbearia_id, tipo, payload)
  VALUES (p_barbearia_id, 'master_plan_change', jsonb_build_object('plan_slug', p_plan_slug));
END;
$horza_master_set_plan$;

-- Helper para webhooks Stripe (fase 2)
CREATE OR REPLACE FUNCTION public.upsert_subscription_from_stripe(
  p_stripe_subscription_id TEXT,
  p_stripe_customer_id TEXT,
  p_barbearia_id UUID,
  p_plan_id UUID,
  p_status TEXT,
  p_current_period_start TIMESTAMPTZ,
  p_current_period_end TIMESTAMPTZ,
  p_billing_cycle_anchor TIMESTAMPTZ DEFAULT NULL,
  p_trial_start TIMESTAMPTZ DEFAULT NULL,
  p_trial_end TIMESTAMPTZ DEFAULT NULL,
  p_cancel_at_period_end BOOLEAN DEFAULT false,
  p_collection_method TEXT DEFAULT 'charge_automatically',
  p_billing_interval TEXT DEFAULT NULL,
  p_billing_interval_count INT DEFAULT 1,
  p_moeda TEXT DEFAULT 'BRL',
  p_stripe_latest_invoice_id TEXT DEFAULT NULL,
  p_stripe_default_payment_method_id TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $horza_upsert_stripe_sub$
DECLARE
  v_sub_id UUID;
  v_empresa_id UUID;
BEGIN
  SELECT b.empresa_id INTO v_empresa_id
  FROM barbearias b
  WHERE b.id = p_barbearia_id;

  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Barbearia sem empresa_id: %', p_barbearia_id;
  END IF;

  UPDATE empresas
  SET stripe_customer_id = COALESCE(stripe_customer_id, p_stripe_customer_id),
      atualizado_em = now()
  WHERE id = v_empresa_id
    AND p_stripe_customer_id IS NOT NULL;

  SELECT s.id INTO v_sub_id
  FROM subscriptions s
  WHERE s.stripe_subscription_id = p_stripe_subscription_id
  LIMIT 1;

  IF v_sub_id IS NOT NULL THEN
    UPDATE subscriptions
    SET
      barbearia_id = p_barbearia_id,
      empresa_id = v_empresa_id,
      plan_id = p_plan_id,
      status = p_status,
      stripe_customer_id = p_stripe_customer_id,
      moeda = p_moeda,
      billing_interval = p_billing_interval,
      billing_interval_count = p_billing_interval_count,
      periodo_inicio = p_current_period_start,
      periodo_fim = p_current_period_end,
      current_period_start = p_current_period_start,
      current_period_end = p_current_period_end,
      billing_cycle_anchor = COALESCE(p_billing_cycle_anchor, p_current_period_start),
      trial_start = p_trial_start,
      trial_end = p_trial_end,
      cancel_at_period_end = p_cancel_at_period_end,
      collection_method = p_collection_method,
      stripe_latest_invoice_id = p_stripe_latest_invoice_id,
      stripe_default_payment_method_id = p_stripe_default_payment_method_id,
      atualizado_em = now()
    WHERE id = v_sub_id;
  ELSE
    UPDATE subscriptions
    SET status = 'canceled', cancelado_em = now(), atualizado_em = now()
    WHERE barbearia_id = p_barbearia_id
      AND status IN ('trialing', 'active', 'past_due');

    INSERT INTO subscriptions (
      barbearia_id,
      empresa_id,
      plan_id,
      status,
      stripe_customer_id,
      stripe_subscription_id,
      moeda,
      billing_interval,
      billing_interval_count,
      periodo_inicio,
      periodo_fim,
      current_period_start,
      current_period_end,
      billing_cycle_anchor,
      trial_start,
      trial_end,
      cancel_at_period_end,
      collection_method,
      stripe_latest_invoice_id,
      stripe_default_payment_method_id
    )
    VALUES (
      p_barbearia_id,
      v_empresa_id,
      p_plan_id,
      p_status,
      p_stripe_customer_id,
      p_stripe_subscription_id,
      p_moeda,
      p_billing_interval,
      p_billing_interval_count,
      p_current_period_start,
      p_current_period_end,
      p_current_period_start,
      p_current_period_end,
      COALESCE(p_billing_cycle_anchor, p_current_period_start),
      p_trial_start,
      p_trial_end,
      p_cancel_at_period_end,
      p_collection_method,
      p_stripe_latest_invoice_id,
      p_stripe_default_payment_method_id
    )
    RETURNING id INTO v_sub_id;
  END IF;

  RETURN v_sub_id;
END;
$horza_upsert_stripe_sub$;
