-- ============================================================
-- 004 — VENDEDORES + COMISSÃO EM VENDAS E CONTRATOS
-- Execute no Supabase SQL Editor
-- ============================================================

-- Tabela de vendedores
CREATE TABLE IF NOT EXISTS vendedores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cpf TEXT,
  email TEXT,
  telefone TEXT,
  percentual_comissao_padrao NUMERIC(5,2) DEFAULT 0,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendedores_empresa_id ON vendedores(empresa_id);

-- Trigger updated_at para vendedores
CREATE OR REPLACE TRIGGER trg_vendedores_updated
  BEFORE UPDATE ON vendedores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Adicionar campos de comissão e vendedor em vendas
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS vendedor_id UUID REFERENCES vendedores(id);
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS percentual_comissao NUMERIC(5,2) DEFAULT 0;
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS valor_comissao NUMERIC(15,2) DEFAULT 0;

-- Adicionar campos de comissão e vendedor em contratos
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS vendedor_id UUID REFERENCES vendedores(id);
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS percentual_comissao NUMERIC(5,2) DEFAULT 0;
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS valor_comissao NUMERIC(15,2) DEFAULT 0;

-- Tabela de NF-e importadas (para rastreabilidade)
CREATE TABLE IF NOT EXISTS nfes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
  numero TEXT NOT NULL,
  chave_acesso TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')), -- entrada=despesa, saida=receita
  data_emissao DATE NOT NULL,
  emitente_nome TEXT,
  emitente_cnpj TEXT,
  destinatario_nome TEXT,
  destinatario_cnpj TEXT,
  valor_total NUMERIC(15,2) NOT NULL,
  xml_raw TEXT,
  lancamento_id UUID REFERENCES lancamentos(id),
  cliente_id UUID REFERENCES clientes(id),
  maquina_id UUID REFERENCES maquinas(id),
  contrato_id UUID REFERENCES contratos(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nfes_empresa_id ON nfes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_nfes_emitente_cnpj ON nfes(emitente_cnpj);

-- RLS: vendedores (mesma política das demais tabelas)
ALTER TABLE vendedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE nfes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vendedores_empresa" ON vendedores
  USING (empresa_id = get_user_empresa_id());

CREATE POLICY "nfes_empresa" ON nfes
  USING (empresa_id = get_user_empresa_id());
