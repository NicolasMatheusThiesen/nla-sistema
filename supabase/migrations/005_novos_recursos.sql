-- ============================================================
-- 005 — MATERIAIS, SERVIÇOS E TIPOS DE EQUIPAMENTO
-- Execute no Supabase SQL Editor
-- ============================================================

-- 1. Tabela Tipos de Equipamento
CREATE TABLE IF NOT EXISTS tipos_equipamento (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tipos_equipamento_empresa_id ON tipos_equipamento(empresa_id);
CREATE OR REPLACE TRIGGER trg_tipos_equipamento_updated BEFORE UPDATE ON tipos_equipamento FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
ALTER TABLE tipos_equipamento ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tipos_equipamento_empresa" ON tipos_equipamento USING (empresa_id = get_user_empresa_id());

-- 2. Tabela Materiais
CREATE TABLE IF NOT EXISTS materiais (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  finalidade TEXT NOT NULL CHECK (finalidade IN ('consumo', 'manutencao', 'revenda', 'multiplo')),
  unidade_medida TEXT DEFAULT 'un',
  custo_unitario NUMERIC(15,2) DEFAULT 0,
  valor_venda NUMERIC(15,2) DEFAULT 0,
  quantidade_estoque NUMERIC(10,2) DEFAULT 0,
  observacoes TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_materiais_empresa_id ON materiais(empresa_id);
CREATE OR REPLACE TRIGGER trg_materiais_updated BEFORE UPDATE ON materiais FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
ALTER TABLE materiais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "materiais_empresa" ON materiais USING (empresa_id = get_user_empresa_id());

-- 3. Tabela Serviços
CREATE TABLE IF NOT EXISTS servicos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  valor_padrao NUMERIC(15,2) DEFAULT 0,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_servicos_empresa_id ON servicos(empresa_id);
CREATE OR REPLACE TRIGGER trg_servicos_updated BEFORE UPDATE ON servicos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
ALTER TABLE servicos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "servicos_empresa" ON servicos USING (empresa_id = get_user_empresa_id());

-- 4. Alterações em Vendas
-- Tornar maquina_id opcional
ALTER TABLE vendas ALTER COLUMN maquina_id DROP NOT NULL;

-- Tabela de itens de materiais na venda
CREATE TABLE IF NOT EXISTS venda_materiais (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venda_id UUID NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES materiais(id),
  quantidade NUMERIC(10,2) NOT NULL,
  valor_unitario NUMERIC(15,2) NOT NULL,
  valor_total NUMERIC(15,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE venda_materiais ENABLE ROW LEVEL SECURITY;
-- Como venda_materiais não tem empresa_id, faremos a política pelo venda_id
CREATE POLICY "venda_materiais_empresa" ON venda_materiais 
  USING (venda_id IN (SELECT id FROM vendas WHERE empresa_id = get_user_empresa_id()));

-- 5. Alterações em Clientes
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS inscricao_estadual TEXT;

-- 6. Alterações em Manutenções (para suportar Ordens de Serviço completas / Terceiros)
ALTER TABLE manutencoes ALTER COLUMN maquina_id DROP NOT NULL;
ALTER TABLE manutencoes ADD COLUMN IF NOT EXISTS is_terceiro BOOLEAN DEFAULT FALSE;
ALTER TABLE manutencoes ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES clientes(id);
ALTER TABLE manutencoes ADD COLUMN IF NOT EXISTS maquina_terceiro_descricao TEXT;

-- Tabela de materiais usados na manutenção
CREATE TABLE IF NOT EXISTS manutencao_materiais (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  manutencao_id UUID NOT NULL REFERENCES manutencoes(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES materiais(id),
  quantidade NUMERIC(10,2) NOT NULL,
  valor_unitario NUMERIC(15,2) NOT NULL,
  valor_total NUMERIC(15,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE manutencao_materiais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "manutencao_materiais_empresa" ON manutencao_materiais 
  USING (manutencao_id IN (SELECT id FROM manutencoes WHERE empresa_id = get_user_empresa_id()));

-- Tabela de serviços realizados na manutenção
CREATE TABLE IF NOT EXISTS manutencao_servicos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  manutencao_id UUID NOT NULL REFERENCES manutencoes(id) ON DELETE CASCADE,
  servico_id UUID NOT NULL REFERENCES servicos(id),
  quantidade NUMERIC(10,2) DEFAULT 1,
  valor_unitario NUMERIC(15,2) NOT NULL,
  valor_total NUMERIC(15,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE manutencao_servicos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "manutencao_servicos_empresa" ON manutencao_servicos 
  USING (manutencao_id IN (SELECT id FROM manutencoes WHERE empresa_id = get_user_empresa_id()));

