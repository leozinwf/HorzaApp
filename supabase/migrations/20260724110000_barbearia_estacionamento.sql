-- Estacionamento disponível na barbearia (filtro marketplace)
ALTER TABLE public.barbearias
ADD COLUMN IF NOT EXISTS tem_estacionamento BOOLEAN NOT NULL DEFAULT false;
