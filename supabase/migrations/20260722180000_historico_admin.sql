-- Histórico de mudanças no painel admin da barbearia
CREATE TABLE IF NOT EXISTS historico_admin (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbearia_id UUID REFERENCES barbearias(id) ON DELETE CASCADE,
  usuario_id UUID,
  usuario_nome TEXT,
  modulo TEXT NOT NULL,
  acao TEXT NOT NULL,
  descricao TEXT NOT NULL,
  detalhes JSONB,
  criado_em TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_historico_admin_barbearia ON historico_admin(barbearia_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_historico_admin_modulo ON historico_admin(barbearia_id, modulo);

-- Movimentação de estoque (opcional — usado nos ajustes +/-)
CREATE TABLE IF NOT EXISTS movimentacao_estoque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID REFERENCES produtos(id) ON DELETE CASCADE,
  usuario_id UUID,
  tipo TEXT NOT NULL,
  quantidade NUMERIC NOT NULL,
  motivo TEXT,
  criado_em TIMESTAMPTZ DEFAULT now()
);
