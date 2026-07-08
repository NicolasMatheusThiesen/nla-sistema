-- ============================================================
-- 007 — ORDENS DE SERVIÇO E COMPRAS
-- Execute no Supabase SQL Editor
-- ============================================================

-- 1. Tabela Ordens de Serviço
CREATE TABLE IF NOT EXISTS ordens_servico (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
  numero TEXT UNIQUE NOT NULL,
  cliente_id UUID NOT NULL REFERENCES clientes(id),
  maquina_id UUID REFERENCES maquinas(id),
  maquina_terceiro_descricao TEXT,
  status TEXT DEFAULT 'aberta' CHECK (status IN ('aberta', 'em_andamento', 'concluida', 'cancelada')),
  data_abertura DATE NOT NULL,
  data_conclusao DATE,
  descricao TEXT,
  valor_total NUMERIC(15,2) DEFAULT 0,
  lancamento_id UUID REFERENCES lancamentos(id),
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS os_servicos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  os_id UUID NOT NULL REFERENCES ordens_servico(id) ON DELETE CASCADE,
  servico_id UUID NOT NULL REFERENCES servicos(id),
  quantidade NUMERIC(10,2) DEFAULT 1,
  valor_unitario NUMERIC(15,2) NOT NULL,
  valor_total NUMERIC(15,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS os_materiais (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  os_id UUID NOT NULL REFERENCES ordens_servico(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES materiais(id),
  quantidade NUMERIC(10,2) NOT NULL,
  valor_unitario NUMERIC(15,2) NOT NULL,
  valor_total NUMERIC(15,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_os_empresa_id ON ordens_servico(empresa_id);
CREATE INDEX IF NOT EXISTS idx_os_cliente_id ON ordens_servico(cliente_id);
CREATE OR REPLACE TRIGGER trg_os_updated BEFORE UPDATE ON ordens_servico FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
ALTER TABLE ordens_servico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "os_empresa" ON ordens_servico USING (empresa_id = get_user_empresa_id());
ALTER TABLE os_servicos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "os_servicos_empresa" ON os_servicos USING (os_id IN (SELECT id FROM ordens_servico WHERE empresa_id = get_user_empresa_id()));
ALTER TABLE os_materiais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "os_materiais_empresa" ON os_materiais USING (os_id IN (SELECT id FROM ordens_servico WHERE empresa_id = get_user_empresa_id()));

-- 2. Tabela Compras
CREATE TABLE IF NOT EXISTS compras (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  fornecedor TEXT,
  material_id UUID REFERENCES materiais(id),
  quantidade NUMERIC(10,2) DEFAULT 1,
  valor_unitario NUMERIC(15,2) DEFAULT 0,
  valor_total NUMERIC(15,2) NOT NULL,
  finalidade TEXT NOT NULL CHECK (finalidade IN ('consumo', 'revenda')),
  data_compra DATE NOT NULL,
  nota_fiscal TEXT,
  lancamento_id UUID REFERENCES lancamentos(id),
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compras_empresa_id ON compras(empresa_id);
CREATE OR REPLACE TRIGGER trg_compras_updated BEFORE UPDATE ON compras FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
ALTER TABLE compras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "compras_empresa" ON compras USING (empresa_id = get_user_empresa_id());

-- 3. Alterar Maquinas para aceitar tipos dinamicos
ALTER TABLE maquinas DROP CONSTRAINT IF EXISTS maquinas_tipo_check;
