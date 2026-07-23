-- Bucket público para fotos das barbearias (logo / capa no app)
INSERT INTO storage.buckets (id, name, public)
VALUES ('barbearias', 'barbearias', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "barbearias_storage_public_read" ON storage.objects;
CREATE POLICY "barbearias_storage_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'barbearias');

DROP POLICY IF EXISTS "barbearias_storage_auth_upload" ON storage.objects;
CREATE POLICY "barbearias_storage_auth_upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'barbearias');

DROP POLICY IF EXISTS "barbearias_storage_auth_update" ON storage.objects;
CREATE POLICY "barbearias_storage_auth_update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'barbearias');

DROP POLICY IF EXISTS "barbearias_storage_auth_delete" ON storage.objects;
CREATE POLICY "barbearias_storage_auth_delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'barbearias');
