-- Cliente avulso (ghost): agendamento sem conta + vinculação futura

ALTER TABLE agendamentos
  ADD COLUMN IF NOT EXISTS email_cliente_avulso TEXT;

COMMENT ON COLUMN agendamentos.email_cliente_avulso IS 'E-mail opcional informado em agendamento sem cadastro';

-- Permite insert de agendamento avulso (anon ou logado sem vincular conta)
DROP POLICY IF EXISTS agendamentos_insert_guest ON agendamentos;
CREATE POLICY agendamentos_insert_guest ON agendamentos
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    cliente_id IS NULL
    AND nome_cliente_avulso IS NOT NULL
    AND length(trim(nome_cliente_avulso)) > 0
    AND whatsapp_cliente_avulso IS NOT NULL
    AND length(regexp_replace(whatsapp_cliente_avulso, '\D', '', 'g')) >= 10
  );

-- Vincula histórico avulso quando o cliente cria conta ou faz login
CREATE OR REPLACE FUNCTION vincular_agendamentos_ghost(
  p_user_id uuid,
  p_whatsapp text,
  p_email text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
  v_digits text;
BEGIN
  IF p_user_id IS NULL OR p_whatsapp IS NULL THEN
    RETURN 0;
  END IF;

  v_digits := regexp_replace(p_whatsapp, '\D', '', 'g');

  UPDATE agendamentos
  SET cliente_id = p_user_id
  WHERE cliente_id IS NULL
    AND (
      regexp_replace(COALESCE(whatsapp_cliente_avulso, ''), '\D', '', 'g') = v_digits
      OR (
        p_email IS NOT NULL
        AND email_cliente_avulso IS NOT NULL
        AND lower(trim(email_cliente_avulso)) = lower(trim(p_email))
      )
    );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION vincular_agendamentos_ghost(uuid, text, text) TO authenticated;
