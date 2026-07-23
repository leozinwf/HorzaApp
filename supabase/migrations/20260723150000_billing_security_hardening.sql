-- Billing security: RPC grants, upsert lockdown, validação service_role

GRANT EXECUTE ON FUNCTION public.usuario_pode_gerenciar_barbearia(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.upsert_subscription_from_stripe(
  text, text, uuid, uuid, text,
  timestamptz, timestamptz, timestamptz, timestamptz, timestamptz,
  boolean, text, text, int, text, text, text
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.upsert_subscription_from_stripe(
  text, text, uuid, uuid, text,
  timestamptz, timestamptz, timestamptz, timestamptz, timestamptz,
  boolean, text, text, int, text, text, text
) FROM authenticated;

REVOKE ALL ON FUNCTION public.upsert_subscription_from_stripe(
  text, text, uuid, uuid, text,
  timestamptz, timestamptz, timestamptz, timestamptz, timestamptz,
  boolean, text, text, int, text, text, text
) FROM anon;

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
  v_jwt_role TEXT;
BEGIN
  v_jwt_role := coalesce(auth.jwt()->>'role', '');
  IF v_jwt_role IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT b.empresa_id INTO v_empresa_id
  FROM barbearias b
  WHERE b.id = p_barbearia_id
    AND b.status = 'aprovada';

  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Barbearia inválida ou não aprovada: %', p_barbearia_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM plans pl
    WHERE pl.id = p_plan_id AND pl.ativo = true
  ) THEN
    RAISE EXCEPTION 'Plano inválido: %', p_plan_id;
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
