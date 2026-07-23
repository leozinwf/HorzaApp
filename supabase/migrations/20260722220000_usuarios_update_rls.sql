-- Permite admin/gerente/master atualizar equipe (ex.: exibe_na_agenda)
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "usuarios_update_equipe" ON usuarios;
CREATE POLICY "usuarios_update_equipe"
ON usuarios FOR UPDATE TO authenticated
USING (
  public.is_horza_master()
  OR EXISTS (
    SELECT 1 FROM usuarios u
    WHERE u.id = auth.uid()
      AND u.barbearia_id = usuarios.barbearia_id
      AND u.role IN ('admin', 'gerente')
      AND coalesce(u.ativo, true) = true
  )
)
WITH CHECK (
  public.is_horza_master()
  OR EXISTS (
    SELECT 1 FROM usuarios u
    WHERE u.id = auth.uid()
      AND u.barbearia_id = usuarios.barbearia_id
      AND u.role IN ('admin', 'gerente')
      AND coalesce(u.ativo, true) = true
  )
);
