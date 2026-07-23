-- Horza SaaS — Fundação de planos (fonte da verdade: subscriptions)
-- Deprecação: barbearias.plano_ativo (leitura legacy até remoção; não escrever)

-- ---------------------------------------------------------------------------
-- Catálogo de funcionalidades (metadados)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS feature_definitions (
  feature_key TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  categoria TEXT NOT NULL DEFAULT 'geral',
  tipo_valor TEXT NOT NULL DEFAULT 'boolean' CHECK (tipo_valor IN ('boolean', 'limit', 'unlimited')),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Planos
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  descricao TEXT,
  preco_centavos INT NOT NULL DEFAULT 0,
  moeda TEXT NOT NULL DEFAULT 'BRL',
  intervalo_cobranca TEXT NOT NULL DEFAULT 'month' CHECK (intervalo_cobranca IN ('month', 'year', 'lifetime', 'none')),
  stripe_price_id TEXT,
  stripe_product_id TEXT,
  ordem_exibicao INT NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS plan_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL REFERENCES feature_definitions(feature_key) ON DELETE CASCADE,
  habilitado BOOLEAN NOT NULL DEFAULT true,
  limite_valor INT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (plan_id, feature_key)
);

CREATE INDEX IF NOT EXISTS idx_plan_features_plan ON plan_features(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_features_key ON plan_features(feature_key);

-- ---------------------------------------------------------------------------
-- Assinaturas (uma ativa por barbearia)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbearia_id UUID NOT NULL REFERENCES barbearias(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'paused'
  )),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  periodo_inicio TIMESTAMPTZ NOT NULL DEFAULT now(),
  periodo_fim TIMESTAMPTZ,
  vencimento TIMESTAMPTZ,
  cancelado_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_one_active
  ON subscriptions(barbearia_id)
  WHERE status IN ('trialing', 'active', 'past_due');

CREATE INDEX IF NOT EXISTS idx_subscriptions_barbearia ON subscriptions(barbearia_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub ON subscriptions(stripe_subscription_id);

-- ---------------------------------------------------------------------------
-- Consumo de recursos limitados
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS feature_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbearia_id UUID NOT NULL REFERENCES barbearias(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL REFERENCES feature_definitions(feature_key) ON DELETE CASCADE,
  periodo_inicio DATE NOT NULL,
  contador INT NOT NULL DEFAULT 0,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (barbearia_id, feature_key, periodo_inicio)
);

CREATE INDEX IF NOT EXISTS idx_feature_usage_lookup
  ON feature_usage(barbearia_id, feature_key, periodo_inicio);

-- ---------------------------------------------------------------------------
-- Eventos de billing (auditoria Stripe / mudanças de plano)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbearia_id UUID REFERENCES barbearias(id) ON DELETE SET NULL,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  stripe_event_id TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_events_barbearia ON billing_events(barbearia_id, criado_em DESC);

-- ---------------------------------------------------------------------------
-- Configurações por tenant (extensível)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenant_settings (
  barbearia_id UUID PRIMARY KEY REFERENCES barbearias(id) ON DELETE CASCADE,
  settings JSONB NOT NULL DEFAULT '{}',
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Preparação futura: grupo empresarial / multi-unidades
ALTER TABLE barbearias ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES barbearias(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- Seed: definições de features
-- ---------------------------------------------------------------------------
INSERT INTO feature_definitions (feature_key, nome, descricao, categoria, tipo_valor) VALUES
  ('max_employees', 'Funcionários', 'Usuários internos da equipe', 'limites', 'limit'),
  ('max_appointments_month', 'Agendamentos/mês', 'Total de agendamentos criados no mês', 'limites', 'limit'),
  ('marketplace_premium', 'Marketplace Premium', 'Destaque e badge no marketplace', 'marketplace', 'boolean'),
  ('agenda_inteligente', 'Agenda Inteligente', 'Lista de espera, recorrente, encaixe', 'agenda', 'boolean'),
  ('whatsapp_automatico', 'WhatsApp Automático', 'Confirmação e lembretes', 'comunicacao', 'boolean'),
  ('financeiro_inteligente', 'Financeiro Inteligente', 'Fluxo de caixa, gráficos, export', 'financeiro', 'boolean'),
  ('estoque_inteligente', 'Estoque Inteligente', 'Alertas, movimentações, export', 'estoque', 'boolean'),
  ('fidelidade_avancada', 'Fidelidade Avançada', 'Pontos, cashback, cupons, níveis', 'fidelidade', 'boolean'),
  ('dashboard_avancado', 'Dashboard Avançado', 'Indicadores avançados', 'dashboard', 'boolean'),
  ('personalizacao_cor', 'Cor personalizada', 'Cor primária customizada', 'personalizacao', 'boolean'),
  ('qr_code_cadeira', 'QR Code na cadeira', 'QR por cadeira/profissional', 'personalizacao', 'boolean'),
  ('gorjeta_digital', 'Gorjeta Digital', 'PIX e Stripe pós-atendimento', 'pagamentos', 'boolean'),
  ('comissao_controle', 'Controle de Comissão', 'Regras de comissão', 'financeiro', 'boolean'),
  ('multiplas_unidades', 'Múltiplas Unidades', 'Gestão de filiais', 'empresa', 'boolean'),
  ('backup_automatico', 'Backup Automático', 'Arquitetura de backup', 'infra', 'boolean'),
  ('dominio_proprio', 'Domínio Próprio', 'Domínio customizado', 'personalizacao', 'boolean'),
  ('heatmap', 'Heatmap', 'Mapa de calor de ocupação', 'dashboard', 'boolean'),
  ('ia_previsao', 'IA Previsão', 'Insights de demanda', 'ia', 'boolean'),
  ('ia_estoque', 'IA Estoque', 'Previsão de reposição', 'ia', 'boolean'),
  ('ia_financeira', 'IA Financeira', 'Tendências financeiras', 'ia', 'boolean'),
  ('ia_clientes', 'IA Clientes', 'Clientes inativos e campanhas', 'ia', 'boolean'),
  ('ia_horarios_vagos', 'IA Horários Vagos', 'Preenchimento após cancelamento', 'ia', 'boolean'),
  ('ia_promocoes', 'IA Promoções', 'Promoções automáticas', 'ia', 'boolean')
ON CONFLICT (feature_key) DO NOTHING;

INSERT INTO plans (slug, nome, descricao, preco_centavos, intervalo_cobranca, ordem_exibicao) VALUES
  ('free', 'Horza Free', 'Plano gratuito com limites essenciais', 0, 'none', 0),
  ('pro', 'Horza Pro', 'Recursos avançados para barbearias em crescimento', 4990, 'month', 1),
  ('plus', 'Horza Plus', 'Máximo desempenho, IA e multi-unidades', 12990, 'month', 2)
ON CONFLICT (slug) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  preco_centavos = EXCLUDED.preco_centavos,
  ordem_exibicao = EXCLUDED.ordem_exibicao,
  atualizado_em = now();

-- FREE: limites
INSERT INTO plan_features (plan_id, feature_key, habilitado, limite_valor)
SELECT p.id, f.feature_key, true, f.limite
FROM plans p
CROSS JOIN (VALUES
  ('max_employees', 5),
  ('max_appointments_month', 300)
) AS f(feature_key, limite)
WHERE p.slug = 'free'
ON CONFLICT (plan_id, feature_key) DO UPDATE SET limite_valor = EXCLUDED.limite_valor, habilitado = true;

-- PRO: ilimitado nos limites + features PRO
INSERT INTO plan_features (plan_id, feature_key, habilitado, limite_valor)
SELECT p.id, fd.feature_key, true, NULL
FROM plans p
CROSS JOIN feature_definitions fd
WHERE p.slug = 'pro'
  AND fd.feature_key IN (
    'max_employees', 'max_appointments_month',
    'marketplace_premium', 'agenda_inteligente', 'whatsapp_automatico',
    'financeiro_inteligente', 'estoque_inteligente', 'fidelidade_avancada',
    'dashboard_avancado', 'personalizacao_cor', 'qr_code_cadeira', 'gorjeta_digital'
  )
ON CONFLICT (plan_id, feature_key) DO UPDATE SET habilitado = true, limite_valor = NULL;

-- PLUS: tudo PRO + extras PLUS
INSERT INTO plan_features (plan_id, feature_key, habilitado, limite_valor)
SELECT p.id, fd.feature_key, true, NULL
FROM plans p
CROSS JOIN feature_definitions fd
WHERE p.slug = 'plus'
ON CONFLICT (plan_id, feature_key) DO UPDATE SET habilitado = true, limite_valor = NULL;

-- ---------------------------------------------------------------------------
-- Funções de plano
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tenant_plan_slug(p_barbearia_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT pl.slug
      FROM subscriptions s
      JOIN plans pl ON pl.id = s.plan_id
      WHERE s.barbearia_id = p_barbearia_id
        AND s.status IN ('trialing', 'active', 'past_due')
      ORDER BY s.criado_em DESC
      LIMIT 1
    ),
    'free'
  );
$$;

CREATE OR REPLACE FUNCTION public.count_team_members(p_barbearia_id UUID)
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INT
  FROM usuarios u
  WHERE u.barbearia_id = p_barbearia_id
    AND u.role IN ('admin', 'gerente', 'funcionario')
    AND COALESCE(u.ativo, true) = true;
$$;

CREATE OR REPLACE FUNCTION public.get_feature_usage_count(
  p_barbearia_id UUID,
  p_feature_key TEXT,
  p_periodo DATE DEFAULT date_trunc('month', now())::DATE
)
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT fu.contador FROM feature_usage fu
     WHERE fu.barbearia_id = p_barbearia_id
       AND fu.feature_key = p_feature_key
       AND fu.periodo_inicio = p_periodo),
    0
  );
$$;

CREATE OR REPLACE FUNCTION public.get_plan_feature_limit(
  p_barbearia_id UUID,
  p_feature_key TEXT
)
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pf.limite_valor
  FROM subscriptions s
  JOIN plan_features pf ON pf.plan_id = s.plan_id AND pf.feature_key = p_feature_key
  WHERE s.barbearia_id = p_barbearia_id
    AND s.status IN ('trialing', 'active', 'past_due')
    AND pf.habilitado = true
  ORDER BY s.criado_em DESC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.tenant_has_feature(
  p_barbearia_id UUID,
  p_feature_key TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit INT;
  v_enabled BOOLEAN;
BEGIN
  IF public.is_horza_master() THEN
    RETURN true;
  END IF;

  SELECT pf.habilitado, pf.limite_valor
  INTO v_enabled, v_limit
  FROM subscriptions s
  JOIN plan_features pf ON pf.plan_id = s.plan_id AND pf.feature_key = p_feature_key
  WHERE s.barbearia_id = p_barbearia_id
    AND s.status IN ('trialing', 'active', 'past_due')
  ORDER BY s.criado_em DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF p_feature_key IN ('max_employees', 'max_appointments_month') THEN
    RETURN true;
  END IF;

  RETURN COALESCE(v_enabled, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.check_plan_limit(
  p_barbearia_id UUID,
  p_feature_key TEXT,
  p_proposed_count INT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit INT;
  v_current INT;
BEGIN
  IF public.is_horza_master() THEN
    RETURN;
  END IF;

  v_limit := public.get_plan_feature_limit(p_barbearia_id, p_feature_key);

  IF v_limit IS NULL THEN
    RETURN;
  END IF;

  IF p_feature_key = 'max_employees' THEN
    v_current := COALESCE(p_proposed_count, public.count_team_members(p_barbearia_id));
  ELSIF p_feature_key = 'max_appointments_month' THEN
    v_current := public.get_feature_usage_count(p_barbearia_id, p_feature_key);
  ELSE
    RETURN;
  END IF;

  IF v_current >= v_limit THEN
    RAISE EXCEPTION 'PLAN_LIMIT:%:%', p_feature_key, v_limit
      USING ERRCODE = 'P0001',
            HINT = 'Upgrade para Horza Pro para remover este limite.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_feature_usage(
  p_barbearia_id UUID,
  p_feature_key TEXT,
  p_increment INT DEFAULT 1
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_periodo DATE := date_trunc('month', now())::DATE;
  v_new_count INT;
BEGIN
  INSERT INTO feature_usage (barbearia_id, feature_key, periodo_inicio, contador)
  VALUES (p_barbearia_id, p_feature_key, v_periodo, p_increment)
  ON CONFLICT (barbearia_id, feature_key, periodo_inicio)
  DO UPDATE SET contador = feature_usage.contador + p_increment, atualizado_em = now()
  RETURNING contador INTO v_new_count;

  RETURN v_new_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_tenant_plan_info(p_barbearia_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slug TEXT := 'free';
  v_nome TEXT := 'Horza Free';
  v_preco INT := 0;
  v_status TEXT := 'active';
  v_periodo_fim TIMESTAMPTZ;
  v_vencimento TIMESTAMPTZ;
  v_features JSONB;
  v_usage JSONB;
BEGIN
  SELECT pl.slug, pl.nome, pl.preco_centavos, s.status, s.periodo_fim, s.vencimento
  INTO v_slug, v_nome, v_preco, v_status, v_periodo_fim, v_vencimento
  FROM subscriptions s
  JOIN plans pl ON pl.id = s.plan_id
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
    'features', v_features,
    'usage', v_usage,
    'team_count', public.count_team_members(p_barbearia_id),
    'appointments_month', public.get_feature_usage_count(p_barbearia_id, 'max_appointments_month')
  );
END;
$$;

-- View única de leitura (sem duplicar plano_ativo)
CREATE OR REPLACE VIEW public.barbearia_plano_atual AS
SELECT
  b.id AS barbearia_id,
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
  s.periodo_fim,
  s.vencimento,
  public.tenant_has_feature(b.id, 'marketplace_premium') AS marketplace_premium
FROM barbearias b
LEFT JOIN subscriptions s
  ON s.barbearia_id = b.id
 AND s.status IN ('trialing', 'active', 'past_due')
LEFT JOIN plans pl ON pl.id = s.plan_id;

GRANT SELECT ON public.barbearia_plano_atual TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Backfill subscriptions (premium → pro, free → free)
-- ---------------------------------------------------------------------------
INSERT INTO subscriptions (barbearia_id, plan_id, status, periodo_inicio)
SELECT
  b.id,
  pl.id,
  'active',
  COALESCE(b.criado_em, now())
FROM barbearias b
JOIN plans pl ON pl.slug = CASE
  WHEN lower(coalesce(b.plano_ativo, 'free')) = 'premium' THEN 'pro'
  WHEN lower(coalesce(b.plano_ativo, 'free')) IN ('pro', 'plus') THEN lower(b.plano_ativo)
  ELSE 'free'
END
WHERE b.status = 'aprovada'
  AND coalesce(b.plano_ativo, 'free') NOT IN ('pendente_aprovacao')
  AND NOT EXISTS (
    SELECT 1 FROM subscriptions s
    WHERE s.barbearia_id = b.id
      AND s.status IN ('trialing', 'active', 'past_due')
  );

-- ---------------------------------------------------------------------------
-- Enforcement triggers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_team_member_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_proposed INT;
BEGIN
  IF NEW.barbearia_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.role NOT IN ('admin', 'gerente', 'funcionario') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.role IN ('admin', 'gerente', 'funcionario')
     AND OLD.barbearia_id = NEW.barbearia_id
     AND OLD.role = NEW.role THEN
    RETURN NEW;
  END IF;

  v_proposed := public.count_team_members(NEW.barbearia_id);
  IF TG_OP = 'INSERT' OR OLD.role NOT IN ('admin', 'gerente', 'funcionario') OR OLD.barbearia_id IS DISTINCT FROM NEW.barbearia_id THEN
    IF TG_OP = 'UPDATE' AND OLD.barbearia_id = NEW.barbearia_id AND OLD.role IN ('admin', 'gerente', 'funcionario') THEN
      v_proposed := v_proposed;
    ELSE
      v_proposed := v_proposed + 1;
    END IF;
  END IF;

  PERFORM public.check_plan_limit(NEW.barbearia_id, 'max_employees', v_proposed);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_team_limit ON usuarios;
CREATE TRIGGER trg_enforce_team_limit
  BEFORE INSERT OR UPDATE OF role, barbearia_id ON usuarios
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_team_member_limit();

CREATE OR REPLACE FUNCTION public.check_appointment_monthly_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.check_plan_limit(NEW.barbearia_id, 'max_appointments_month');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.track_appointment_monthly_usage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.increment_feature_usage(NEW.barbearia_id, 'max_appointments_month', 1);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_appointment_limit ON agendamentos;
CREATE TRIGGER trg_check_appointment_limit
  BEFORE INSERT ON agendamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.check_appointment_monthly_limit();

DROP TRIGGER IF EXISTS trg_track_appointment_usage ON agendamentos;
CREATE TRIGGER trg_track_appointment_usage
  AFTER INSERT ON agendamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.track_appointment_monthly_usage();

-- ---------------------------------------------------------------------------
-- Helper: criar subscription ao aprovar barbearia
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ensure_free_subscription(p_barbearia_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub_id UUID;
  v_plan_id UUID;
BEGIN
  SELECT id INTO v_plan_id FROM plans WHERE slug = 'free' LIMIT 1;

  IF NOT EXISTS (
    SELECT 1 FROM subscriptions s
    WHERE s.barbearia_id = p_barbearia_id
      AND s.status IN ('trialing', 'active', 'past_due')
  ) THEN
    INSERT INTO subscriptions (barbearia_id, plan_id, status)
    VALUES (p_barbearia_id, v_plan_id, 'active')
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
$$;

CREATE OR REPLACE FUNCTION public.master_set_tenant_plan(
  p_barbearia_id UUID,
  p_plan_slug TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id UUID;
BEGIN
  IF NOT public.is_horza_master() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT id INTO v_plan_id FROM plans WHERE slug = p_plan_slug AND ativo = true;
  IF v_plan_id IS NULL THEN
    RAISE EXCEPTION 'Plano inválido: %', p_plan_slug;
  END IF;

  UPDATE subscriptions
  SET status = 'canceled', cancelado_em = now(), atualizado_em = now()
  WHERE barbearia_id = p_barbearia_id
    AND status IN ('trialing', 'active', 'past_due');

  INSERT INTO subscriptions (barbearia_id, plan_id, status, periodo_inicio)
  VALUES (p_barbearia_id, v_plan_id, 'active', now());

  INSERT INTO billing_events (barbearia_id, tipo, payload)
  VALUES (p_barbearia_id, 'master_plan_change', jsonb_build_object('plan_slug', p_plan_slug));
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_tenant_plan_info(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.tenant_plan_slug(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.tenant_has_feature(UUID, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.master_set_tenant_plan(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_free_subscription(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- RLS nas novas tabelas
-- ---------------------------------------------------------------------------
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY plans_read_all ON plans FOR SELECT TO anon, authenticated USING (ativo = true);
CREATE POLICY feature_definitions_read ON feature_definitions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY plan_features_read ON plan_features FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY subscriptions_tenant_read ON subscriptions FOR SELECT TO authenticated
  USING (public.usuario_pode_gerenciar_barbearia(barbearia_id) OR public.is_horza_master());

CREATE POLICY subscriptions_master_all ON subscriptions FOR ALL TO authenticated
  USING (public.is_horza_master()) WITH CHECK (public.is_horza_master());

CREATE POLICY feature_usage_tenant_read ON feature_usage FOR SELECT TO authenticated
  USING (public.usuario_pode_gerenciar_barbearia(barbearia_id) OR public.is_horza_master());

CREATE POLICY billing_events_tenant_read ON billing_events FOR SELECT TO authenticated
  USING (public.usuario_pode_gerenciar_barbearia(barbearia_id) OR public.is_horza_master());

CREATE POLICY tenant_settings_tenant ON tenant_settings FOR ALL TO authenticated
  USING (public.usuario_pode_gerenciar_barbearia(barbearia_id) OR public.is_horza_master())
  WITH CHECK (public.usuario_pode_gerenciar_barbearia(barbearia_id) OR public.is_horza_master());

-- Marketplace público: substituir filtro plano_ativo por status aprovada
DROP POLICY IF EXISTS barbearias_marketplace_public ON barbearias;
CREATE POLICY barbearias_marketplace_public ON barbearias FOR SELECT TO anon, authenticated
  USING (
    slug IS NOT NULL
    AND coalesce(status, 'pendente') = 'aprovada'
  );
