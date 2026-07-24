-- Foto ilustrativa do serviço (exibida na tela de agendamento)
ALTER TABLE public.servicos
ADD COLUMN IF NOT EXISTS imagem_url TEXT;

COMMENT ON COLUMN public.servicos.imagem_url IS 'URL pública da foto do serviço (Storage barbearias ou link externo)';
