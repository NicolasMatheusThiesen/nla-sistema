-- ============================================================
-- 008 — FORNECEDORES E PARCELAMENTOS
-- Execute no Supabase SQL Editor
-- ============================================================

-- 1. Criação da tabela Fornecedores
CREATE TABLE IF NOT EXISTS fornecedores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
  tipo_pessoa TEXT NOT NULL CHECK (tipo_pessoa IN ('PF', 'PJ')),
  cpf_cnpj TEXT NOT NULL,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  email TEXT,
  telefone TEXT,
  cep TEXT,
  endereco TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  observacoes TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fornecedores_empresa_id ON fornecedores(empresa_id);
CREATE OR REPLACE TRIGGER trg_fornecedores_updated BEFORE UPDATE ON fornecedores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS e criar políticas
ALTER TABLE fornecedores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fornecedores_empresa" ON fornecedores
  FOR ALL USING (empresa_id = get_user_empresa_id());

-- 2. Alterações em Lançamentos (Financeiro)
ALTER TABLE lancamentos
  ADD COLUMN IF NOT EXISTS fornecedor_id UUID REFERENCES fornecedores(id);

-- Consertar a deleção de contratos (Cascade nos lançamentos gerados)
ALTER TABLE lancamentos
  DROP CONSTRAINT IF EXISTS lancamentos_contrato_id_fkey;

ALTER TABLE lancamentos
  ADD CONSTRAINT lancamentos_contrato_id_fkey 
  FOREIGN KEY (contrato_id) REFERENCES contratos(id) ON DELETE CASCADE;

-- 3. Alterações em Compras
-- Adiciona a referência ao fornecedor
ALTER TABLE compras
  ADD COLUMN IF NOT EXISTS fornecedor_id UUID REFERENCES fornecedores(id);
