-- Suporte interno Horza: tickets + mensagens

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  nome TEXT NOT NULL,
  assunto TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'geral'
    CHECK (categoria IN ('geral', 'conta', 'agendamento', 'pagamento', 'tecnico', 'outro')),
  status TEXT NOT NULL DEFAULT 'aberto'
    CHECK (status IN ('aberto', 'em_andamento', 'respondido', 'fechado')),
  ultima_resposta_master BOOLEAN NOT NULL DEFAULT false,
  cliente_leu BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  autor_tipo TEXT NOT NULL CHECK (autor_tipo IN ('cliente', 'master')),
  autor_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  mensagem TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket ON public.support_messages(ticket_id, created_at ASC);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY support_tickets_select ON public.support_tickets
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_horza_master());

CREATE POLICY support_tickets_master_all ON public.support_tickets
  FOR ALL TO authenticated
  USING (public.is_horza_master())
  WITH CHECK (public.is_horza_master());

CREATE POLICY support_messages_select ON public.support_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id AND (t.user_id = auth.uid() OR public.is_horza_master())
    )
  );

CREATE POLICY support_messages_master_all ON public.support_messages
  FOR ALL TO authenticated
  USING (public.is_horza_master())
  WITH CHECK (public.is_horza_master());

-- Criar ticket (primeira mensagem inclusa)
CREATE OR REPLACE FUNCTION public.criar_ticket_suporte(
  p_nome TEXT,
  p_email TEXT,
  p_assunto TEXT,
  p_categoria TEXT,
  p_mensagem TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $horza_criar_ticket$
DECLARE
  v_user_id UUID;
  v_ticket_id UUID;
  v_cat TEXT;
BEGIN
  v_user_id := auth.uid();

  IF coalesce(trim(p_nome), '') = '' OR coalesce(trim(p_email), '') = ''
     OR coalesce(trim(p_assunto), '') = '' OR coalesce(trim(p_mensagem), '') = '' THEN
    RAISE EXCEPTION 'Preencha todos os campos obrigatórios.';
  END IF;

  v_cat := coalesce(nullif(trim(p_categoria), ''), 'geral');
  IF v_cat NOT IN ('geral', 'conta', 'agendamento', 'pagamento', 'tecnico', 'outro') THEN
    v_cat := 'geral';
  END IF;

  INSERT INTO public.support_tickets (user_id, email, nome, assunto, categoria, cliente_leu)
  VALUES (v_user_id, lower(trim(p_email)), trim(p_nome), trim(p_assunto), v_cat, true)
  RETURNING id INTO v_ticket_id;

  INSERT INTO public.support_messages (ticket_id, autor_tipo, autor_id, mensagem)
  VALUES (v_ticket_id, 'cliente', v_user_id, trim(p_mensagem));

  RETURN v_ticket_id;
END;
$horza_criar_ticket$;

-- Resposta do master
CREATE OR REPLACE FUNCTION public.master_responder_ticket(
  p_ticket_id UUID,
  p_mensagem TEXT,
  p_novo_status TEXT DEFAULT 'respondido'
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $horza_master_reply$
DECLARE
  v_msg_id UUID;
  v_status TEXT;
BEGIN
  IF NOT public.is_horza_master() THEN
    RAISE EXCEPTION 'Acesso negado.';
  END IF;

  IF coalesce(trim(p_mensagem), '') = '' THEN
    RAISE EXCEPTION 'Digite uma mensagem.';
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

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket não encontrado.';
  END IF;

  RETURN v_msg_id;
END;
$horza_master_reply$;

-- Cliente responde no próprio ticket
CREATE OR REPLACE FUNCTION public.cliente_responder_ticket(
  p_ticket_id UUID,
  p_mensagem TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $horza_client_reply$
DECLARE
  v_msg_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Faça login para responder.';
  END IF;

  IF coalesce(trim(p_mensagem), '') = '' THEN
    RAISE EXCEPTION 'Digite uma mensagem.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.support_tickets
    WHERE id = p_ticket_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Ticket não encontrado.';
  END IF;

  INSERT INTO public.support_messages (ticket_id, autor_tipo, autor_id, mensagem)
  VALUES (p_ticket_id, 'cliente', auth.uid(), trim(p_mensagem))
  RETURNING id INTO v_msg_id;

  UPDATE public.support_tickets SET
    status = CASE WHEN status = 'fechado' THEN 'aberto' ELSE 'em_andamento' END,
    ultima_resposta_master = false,
    cliente_leu = true,
    updated_at = now()
  WHERE id = p_ticket_id;

  RETURN v_msg_id;
END;
$horza_client_reply$;

-- Marcar como lido pelo cliente
CREATE OR REPLACE FUNCTION public.marcar_ticket_suporte_lido(p_ticket_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $horza_mark_read$
BEGIN
  UPDATE public.support_tickets SET cliente_leu = true, updated_at = now()
  WHERE id = p_ticket_id AND user_id = auth.uid();
END;
$horza_mark_read$;

GRANT EXECUTE ON FUNCTION public.criar_ticket_suporte TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.master_responder_ticket TO authenticated;
GRANT EXECUTE ON FUNCTION public.cliente_responder_ticket TO authenticated;
GRANT EXECUTE ON FUNCTION public.marcar_ticket_suporte_lido TO authenticated;
