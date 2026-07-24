-- Banners promocionais do marketplace (home)
CREATE TABLE IF NOT EXISTS public.marketplace_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  subtitulo TEXT,
  tipo_fundo TEXT NOT NULL DEFAULT 'gradiente' CHECK (tipo_fundo IN ('cor', 'gradiente')),
  cor_fixa TEXT,
  cor_gradiente_inicio TEXT,
  cor_gradiente_fim TEXT,
  imagem_url TEXT,
  ordem INT NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_banners_ordem ON public.marketplace_banners (ordem, criado_em);

CREATE OR REPLACE FUNCTION public.check_marketplace_banner_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.marketplace_banners) >= 12 THEN
    RAISE EXCEPTION 'Limite máximo de 12 banners atingido.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_marketplace_banner_limit ON public.marketplace_banners;
CREATE TRIGGER trg_marketplace_banner_limit
BEFORE INSERT ON public.marketplace_banners
FOR EACH ROW EXECUTE FUNCTION public.check_marketplace_banner_limit();

CREATE OR REPLACE FUNCTION public.touch_marketplace_banner_updated()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_marketplace_banner_updated ON public.marketplace_banners;
CREATE TRIGGER trg_marketplace_banner_updated
BEFORE UPDATE ON public.marketplace_banners
FOR EACH ROW EXECUTE FUNCTION public.touch_marketplace_banner_updated();

ALTER TABLE public.marketplace_banners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "marketplace_banners_public_read" ON public.marketplace_banners;
CREATE POLICY "marketplace_banners_public_read"
ON public.marketplace_banners FOR SELECT
USING (ativo = true OR public.is_horza_master());

DROP POLICY IF EXISTS "marketplace_banners_master_insert" ON public.marketplace_banners;
CREATE POLICY "marketplace_banners_master_insert"
ON public.marketplace_banners FOR INSERT TO authenticated
WITH CHECK (public.is_horza_master());

DROP POLICY IF EXISTS "marketplace_banners_master_update" ON public.marketplace_banners;
CREATE POLICY "marketplace_banners_master_update"
ON public.marketplace_banners FOR UPDATE TO authenticated
USING (public.is_horza_master())
WITH CHECK (public.is_horza_master());

DROP POLICY IF EXISTS "marketplace_banners_master_delete" ON public.marketplace_banners;
CREATE POLICY "marketplace_banners_master_delete"
ON public.marketplace_banners FOR DELETE TO authenticated
USING (public.is_horza_master());

-- Storage para imagens dos banners
INSERT INTO storage.buckets (id, name, public)
VALUES ('marketplace', 'marketplace', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "marketplace_storage_public_read" ON storage.objects;
CREATE POLICY "marketplace_storage_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'marketplace');

DROP POLICY IF EXISTS "marketplace_storage_master_insert" ON storage.objects;
CREATE POLICY "marketplace_storage_master_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'marketplace' AND public.is_horza_master());

DROP POLICY IF EXISTS "marketplace_storage_master_update" ON storage.objects;
CREATE POLICY "marketplace_storage_master_update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'marketplace' AND public.is_horza_master());

DROP POLICY IF EXISTS "marketplace_storage_master_delete" ON storage.objects;
CREATE POLICY "marketplace_storage_master_delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'marketplace' AND public.is_horza_master());

-- Banners iniciais (mock)
INSERT INTO public.marketplace_banners (titulo, subtitulo, tipo_fundo, cor_gradiente_inicio, cor_gradiente_fim, ordem, ativo)
SELECT * FROM (VALUES
  ('Corte + Barba', '20% OFF esta semana', 'gradiente', '#1a1510', '#b8924a', 0, true),
  ('Novas parceiras', 'Conheça barbearias perto de você', 'gradiente', '#0f172a', '#2563eb', 1, true),
  ('Horza Pro', 'Destaque sua barbearia no app', 'gradiente', '#b8924a', '#8b6914', 2, true)
) AS v(titulo, subtitulo, tipo_fundo, cor_gradiente_inicio, cor_gradiente_fim, ordem, ativo)
WHERE NOT EXISTS (SELECT 1 FROM public.marketplace_banners LIMIT 1);
