-- Notificações in-app + branding + feature notificacoes_clientes

ALTER TABLE public.barbearias ADD COLUMN IF NOT EXISTS cor_primaria TEXT;

INSERT INTO public.feature_definitions (feature_key, nome, descricao, categoria, tipo_valor)
VALUES (
  'notificacoes_clientes',
  'Notificações aos clientes',
  'Avisos in-app para clientes (fechamento, novidades)',
  'comunicacao',
  'boolean'
)
ON CONFLICT (feature_key) DO NOTHING;

INSERT INTO public.plan_features (plan_id, feature_key, habilitado, limite_valor)
SELECT p.id, 'notificacoes_clientes', true, NULL
FROM public.plans p
WHERE p.slug IN ('pro', 'plus')
ON CONFLICT (plan_id, feature_key) DO UPDATE SET habilitado = true;

CREATE TABLE IF NOT EXISTS public.notificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  barbearia_id UUID REFERENCES public.barbearias(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('agendamento', 'suporte', 'barbearia', 'sistema', 'novidade')),
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  lida BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notificacoes_user_lida ON public.notificacoes(user_id, lida, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notificacoes_barbearia ON public.notificacoes(barbearia_id, created_at DESC);

ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY notificacoes_select_own ON public.notificacoes
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_horza_master());

CREATE POLICY notificacoes_update_own ON public.notificacoes
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.inserir_notificacao_usuario(
  p_user_id UUID,
  p_tipo TEXT,
  p_titulo TEXT,
  p_mensagem TEXT,
  p_barbearia_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF coalesce(trim(p_titulo), '') = '' OR coalesce(trim(p_mensagem), '') = '' THEN
    RAISE EXCEPTION 'Título e mensagem são obrigatórios.';
  END IF;

  INSERT INTO public.notificacoes (user_id, barbearia_id, tipo, titulo, mensagem, metadata)
  VALUES (p_user_id, p_barbearia_id, p_tipo, trim(p_titulo), trim(p_mensagem), coalesce(p_metadata, '{}'::jsonb))
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.enviar_notificacao_barbearia(
  p_barbearia_id UUID,
  p_titulo TEXT,
  p_mensagem TEXT,
  p_tipo TEXT DEFAULT 'barbearia'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
  v_tipo TEXT;
BEGIN
  IF NOT public.usuario_pode_gerenciar_barbearia(p_barbearia_id) AND NOT public.is_horza_master() THEN
    RAISE EXCEPTION 'Sem permissão para enviar notificações desta barbearia.';
  END IF;

  IF NOT public.tenant_has_feature(p_barbearia_id, 'notificacoes_clientes') THEN
    RAISE EXCEPTION 'Recurso disponível nos planos Horza Pro e Plus.';
  END IF;

  v_tipo := coalesce(nullif(trim(p_tipo), ''), 'barbearia');
  IF v_tipo NOT IN ('barbearia', 'novidade', 'sistema') THEN
    v_tipo := 'barbearia';
  END IF;

  INSERT INTO public.notificacoes (user_id, barbearia_id, tipo, titulo, mensagem)
  SELECT DISTINCT a.cliente_id, p_barbearia_id, v_tipo, trim(p_titulo), trim(p_mensagem)
  FROM public.agendamentos a
  WHERE a.barbearia_id = p_barbearia_id
    AND a.cliente_id IS NOT NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.marcar_notificacao_lida(p_notificacao_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.notificacoes SET lida = true
  WHERE id = p_notificacao_id AND user_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.marcar_todas_notificacoes_lidas()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.notificacoes SET lida = true WHERE user_id = auth.uid() AND lida = false;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_notificacoes_agendamentos_proximos()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  IF auth.uid() IS NULL THEN RETURN 0; END IF;

  INSERT INTO public.notificacoes (user_id, barbearia_id, tipo, titulo, mensagem, metadata)
  SELECT
    a.cliente_id,
    a.barbearia_id,
    'agendamento',
    'Agendamento amanhã',
    'Você tem ' || coalesce(s.nome_servico, 'atendimento') || ' em ' || coalesce(b.nome, 'barbearia') || '.',
    jsonb_build_object('agendamento_id', a.id)
  FROM public.agendamentos a
  LEFT JOIN public.servicos s ON s.id = a.servico_id
  LEFT JOIN public.barbearias b ON b.id = a.barbearia_id
  WHERE a.cliente_id = auth.uid()
    AND a.status_atendimento IN ('agendado', 'confirmado', 'pendente')
    AND a.data_hora >= now()
    AND a.data_hora < now() + interval '48 hours'
    AND NOT EXISTS (
      SELECT 1 FROM public.notificacoes n
      WHERE n.user_id = a.cliente_id
        AND n.tipo = 'agendamento'
        AND n.metadata->>'agendamento_id' = a.id::text
    );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Notificar cliente quando master responde suporte
CREATE OR REPLACE FUNCTION public.master_responder_ticket(
  p_ticket_id UUID,
  p_mensagem TEXT,
  p_novo_status TEXT DEFAULT 'respondido'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $horza_master_reply$
DECLARE
  v_msg_id UUID;
  v_status TEXT;
  v_ticket RECORD;
BEGIN
  IF NOT public.is_horza_master() THEN
    RAISE EXCEPTION 'Acesso negado.';
  END IF;

  IF coalesce(trim(p_mensagem), '') = '' THEN
    RAISE EXCEPTION 'Digite uma mensagem.';
  END IF;

  SELECT * INTO v_ticket FROM public.support_tickets WHERE id = p_ticket_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket não encontrado.';
  END IF;

  v_status := coalesce(nullif(trim(p_novo_status), ''), 'respondido');
  IF v_status NOT IN ('aberto', 'em_andamento', 'respondido', 'fechado') THEN
    v_status := 'respondido';
  END IF;

  INSERT INTO public.support_messages (ticket_id, autor_tipo, autor_id, mensagem)
  VALUES (p_ticket_id, 'master', auth.uid(), trim(p_mensagem))
  RETURNING id INTO v_msg_id;

  UPDATE public.support_tickets SET
    status = v_status,
    ultima_resposta_master = true,
    cliente_leu = false,
    updated_at = now()
  WHERE id = p_ticket_id;

  IF v_ticket.user_id IS NOT NULL THEN
    PERFORM public.inserir_notificacao_usuario(
      v_ticket.user_id,
      'suporte',
      'Resposta do suporte Horza',
      left(trim(p_mensagem), 280),
      NULL,
      jsonb_build_object('ticket_id', p_ticket_id)
    );
  END IF;

  RETURN v_msg_id;
END;
$horza_master_reply$;

GRANT EXECUTE ON FUNCTION public.inserir_notificacao_usuario TO authenticated;
GRANT EXECUTE ON FUNCTION public.enviar_notificacao_barbearia TO authenticated;
GRANT EXECUTE ON FUNCTION public.marcar_notificacao_lida TO authenticated;
GRANT EXECUTE ON FUNCTION public.marcar_todas_notificacoes_lidas TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_notificacoes_agendamentos_proximos TO authenticated;
