-- Funções auxiliares para RLS (master + equipe da barbearia)
CREATE OR REPLACE FUNCTION public.is_horza_master()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM usuarios u
    WHERE u.id = auth.uid()
      AND (
        u.role = 'super_admin'
        OR lower(coalesce(u.email, '')) = 'admin@barbearia.com'
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.usuario_pode_gerenciar_barbearia(p_barbearia_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_horza_master()
    OR EXISTS (
      SELECT 1
      FROM usuarios u
      WHERE u.id = auth.uid()
        AND u.barbearia_id = p_barbearia_id
        AND u.role IN ('admin', 'gerente')
        AND coalesce(u.ativo, true) = true
    );
$$;

-- Master com poder total; perfil de teste como dono (não gerente)
UPDATE usuarios u
SET
  role = 'admin',
  barbearia_id = COALESCE(
    u.barbearia_id,
    (SELECT b.id FROM barbearias b WHERE b.slug = 'streetbarber' LIMIT 1),
    (SELECT b.id FROM barbearias b WHERE b.slug IS NOT NULL ORDER BY b.criado_em ASC LIMIT 1)
  )
WHERE lower(u.email) = 'admin@barbearia.com';

-- Produtos: SELECT equipe + master; INSERT/UPDATE/DELETE admin/gerente + master
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "produtos_select_equipe" ON produtos;
CREATE POLICY "produtos_select_equipe"
ON produtos FOR SELECT TO authenticated
USING (
  public.is_horza_master()
  OR barbearia_id IN (
    SELECT u.barbearia_id FROM usuarios u
    WHERE u.id = auth.uid() AND u.barbearia_id IS NOT NULL
  )
);

DROP POLICY IF EXISTS "produtos_insert_gerencia" ON produtos;
CREATE POLICY "produtos_insert_gerencia"
ON produtos FOR INSERT TO authenticated
WITH CHECK (public.usuario_pode_gerenciar_barbearia(barbearia_id));

DROP POLICY IF EXISTS "produtos_update_gerencia" ON produtos;
CREATE POLICY "produtos_update_gerencia"
ON produtos FOR UPDATE TO authenticated
USING (public.usuario_pode_gerenciar_barbearia(barbearia_id))
WITH CHECK (public.usuario_pode_gerenciar_barbearia(barbearia_id));

DROP POLICY IF EXISTS "produtos_delete_gerencia" ON produtos;
CREATE POLICY "produtos_delete_gerencia"
ON produtos FOR DELETE TO authenticated
USING (public.usuario_pode_gerenciar_barbearia(barbearia_id));

-- Marketplace: barbearias aprovadas visíveis para todos (home do app)
DROP POLICY IF EXISTS "barbearias_public_marketplace" ON barbearias;
CREATE POLICY "barbearias_public_marketplace"
ON barbearias FOR SELECT
USING (
  slug IS NOT NULL
  AND coalesce(status, 'aprovada') <> 'pendente'
  AND coalesce(plano_ativo, 'free') NOT IN ('pendente_aprovacao')
);

-- Garante Barbearia do Zé visível no marketplace
UPDATE barbearias
SET status = 'aprovada', plano_ativo = COALESCE(NULLIF(plano_ativo, 'pendente_aprovacao'), 'free')
WHERE slug = 'streetbarber';

-- Master pode ler/editar qualquer barbearia
DROP POLICY IF EXISTS "barbearias_master_all" ON barbearias;
CREATE POLICY "barbearias_master_all"
ON barbearias FOR ALL TO authenticated
USING (public.is_horza_master())
WITH CHECK (public.is_horza_master());
