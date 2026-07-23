-- Master: adicionar moedas a um usuário (teste / ressarcimento)

CREATE OR REPLACE FUNCTION public.master_adicionar_moedas(
  p_user_id UUID,
  p_quantidade INTEGER,
  p_motivo TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_novo_saldo INTEGER;
BEGIN
  IF NOT public.is_horza_master() THEN
    RAISE EXCEPTION 'Acesso negado.';
  END IF;

  IF p_quantidade IS NULL OR p_quantidade <= 0 THEN
    RAISE EXCEPTION 'Informe uma quantidade positiva de moedas.';
  END IF;

  IF p_quantidade > 100000 THEN
    RAISE EXCEPTION 'Quantidade máxima por operação: 100.000 moedas.';
  END IF;

  UPDATE public.usuarios
  SET saldo_pontos = COALESCE(saldo_pontos, 0) + p_quantidade
  WHERE id = p_user_id
  RETURNING saldo_pontos INTO v_novo_saldo;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não encontrado.';
  END IF;

  RETURN v_novo_saldo;
END;
$$;

GRANT EXECUTE ON FUNCTION public.master_adicionar_moedas(UUID, INTEGER, TEXT) TO authenticated;
