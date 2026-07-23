-- Imagem de capa (banner) da barbearia
ALTER TABLE barbearias ADD COLUMN IF NOT EXISTS capa_url text;

-- Restaura vínculo do dono de teste com a barbearia (ajuste o slug se necessário)
UPDATE usuarios u
SET
  barbearia_id = COALESCE(
    u.barbearia_id,
    (SELECT b.id FROM barbearias b WHERE b.slug IS NOT NULL ORDER BY b.criado_em ASC LIMIT 1)
  ),
  role = CASE
    WHEN u.role = 'super_admin' AND u.email = 'admin@barbearia.com' THEN 'admin'
    ELSE u.role
  END
WHERE u.email = 'admin@barbearia.com';
