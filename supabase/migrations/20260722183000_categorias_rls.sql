-- Políticas RLS para categorias_personalizadas (painel financeiro)

ALTER TABLE categorias_personalizadas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "categorias_select_barbearia" ON categorias_personalizadas;
DROP POLICY IF EXISTS "categorias_insert_barbearia" ON categorias_personalizadas;
DROP POLICY IF EXISTS "categorias_update_barbearia" ON categorias_personalizadas;
DROP POLICY IF EXISTS "categorias_delete_barbearia" ON categorias_personalizadas;

CREATE POLICY "categorias_select_barbearia"
ON categorias_personalizadas FOR SELECT TO authenticated
USING (
  barbearia_id IN (
    SELECT u.barbearia_id FROM usuarios u
    WHERE u.id = auth.uid() AND u.barbearia_id IS NOT NULL
  )
);

CREATE POLICY "categorias_insert_barbearia"
ON categorias_personalizadas FOR INSERT TO authenticated
WITH CHECK (
  barbearia_id IN (
    SELECT u.barbearia_id FROM usuarios u
    WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'gerente')
      AND u.barbearia_id IS NOT NULL
  )
);

CREATE POLICY "categorias_update_barbearia"
ON categorias_personalizadas FOR UPDATE TO authenticated
USING (
  barbearia_id IN (
    SELECT u.barbearia_id FROM usuarios u
    WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'gerente')
  )
);

CREATE POLICY "categorias_delete_barbearia"
ON categorias_personalizadas FOR DELETE TO authenticated
USING (
  barbearia_id IN (
    SELECT u.barbearia_id FROM usuarios u
    WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'gerente')
  )
);
