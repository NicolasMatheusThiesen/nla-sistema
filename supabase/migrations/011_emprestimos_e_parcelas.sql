-- ============================================================================
-- 011_emprestimos_e_parcelas.sql
-- Módulo de Empréstimos, Financiamentos e Parcelamento
-- ============================================================================

-- 1. Tabela de Empréstimos e Financiamentos
CREATE TABLE IF NOT EXISTS emprestimos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('emprestimo_tomado', 'emprestimo_concedido', 'financiamento')),
  instituicao_financeira TEXT,
  fornecedor_id UUID REFERENCES fornecedores(id) ON DELETE SET NULL,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  conta_bancaria_id UUID REFERENCES contas_bancarias(id) ON DELETE SET NULL,
  valor_total NUMERIC(15,2) NOT NULL CHECK (valor_total > 0),
  taxa_juros NUMERIC(6,2) DEFAULT 0,
  tipo_juros TEXT DEFAULT 'simples' CHECK (tipo_juros IN ('simples', 'composto', 'fixo', 'sem_juros')),
  numero_parcelas INTEGER NOT NULL DEFAULT 1 CHECK (numero_parcelas >= 1),
  valor_parcela NUMERIC(15,2) NOT NULL CHECK (valor_parcela > 0),
  data_contratacao DATE NOT NULL,
  data_primeiro_vencimento DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'quitado', 'cancelado')),
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emprestimos_empresa_id ON emprestimos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_emprestimos_status ON emprestimos(status);
CREATE INDEX IF NOT EXISTS idx_emprestimos_fornecedor ON emprestimos(fornecedor_id);

-- 2. Tabela de Parcelas de Empréstimos
CREATE TABLE IF NOT EXISTS emprestimo_parcelas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
  emprestimo_id UUID NOT NULL REFERENCES emprestimos(id) ON DELETE CASCADE,
  numero_parcela INTEGER NOT NULL,
  data_vencimento DATE NOT NULL,
  valor_parcela NUMERIC(15,2) NOT NULL CHECK (valor_parcela > 0),
  valor_pago NUMERIC(15,2) DEFAULT 0,
  data_pagamento DATE,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'vencido', 'cancelado')),
  forma_pagamento TEXT,
  conta_bancaria_id UUID REFERENCES contas_bancarias(id) ON DELETE SET NULL,
  lancamento_id UUID REFERENCES lancamentos(id) ON DELETE SET NULL,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emprestimo_parcelas_emprestimo_id ON emprestimo_parcelas(emprestimo_id);
CREATE INDEX IF NOT EXISTS idx_emprestimo_parcelas_empresa_id ON emprestimo_parcelas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_emprestimo_parcelas_vencimento ON emprestimo_parcelas(data_vencimento);

-- 3. Adicionar colunas de apoio a parcelamentos e vínculos na tabela lancamentos
ALTER TABLE lancamentos ADD COLUMN IF NOT EXISTS compra_id UUID REFERENCES compras(id) ON DELETE CASCADE;
ALTER TABLE lancamentos ADD COLUMN IF NOT EXISTS emprestimo_id UUID REFERENCES emprestimos(id) ON DELETE CASCADE;
ALTER TABLE lancamentos ADD COLUMN IF NOT EXISTS grupo_parcela_id UUID;
ALTER TABLE lancamentos ADD COLUMN IF NOT EXISTS numero_parcela INTEGER;
ALTER TABLE lancamentos ADD COLUMN IF NOT EXISTS total_parcelas INTEGER;

CREATE INDEX IF NOT EXISTS idx_lancamentos_compra_id ON lancamentos(compra_id);
CREATE INDEX IF NOT EXISTS idx_lancamentos_emprestimo_id ON lancamentos(emprestimo_id);
CREATE INDEX IF NOT EXISTS idx_lancamentos_grupo_parcela ON lancamentos(grupo_parcela_id);

-- 4. Adicionar colunas de parcelamento na tabela compras
ALTER TABLE compras ADD COLUMN IF NOT EXISTS numero_parcelas INTEGER DEFAULT 1;
ALTER TABLE compras ADD COLUMN IF NOT EXISTS forma_pagamento TEXT DEFAULT 'a_vista';

-- 5. Row Level Security para Empréstimos
ALTER TABLE emprestimos ENABLE ROW LEVEL SECURITY;
ALTER TABLE emprestimo_parcelas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "emprestimos_tenant_isolation" ON emprestimos;
CREATE POLICY "emprestimos_tenant_isolation" ON emprestimos
  FOR ALL USING (empresa_id = get_user_empresa_id());

DROP POLICY IF EXISTS "emprestimo_parcelas_tenant_isolation" ON emprestimo_parcelas;
CREATE POLICY "emprestimo_parcelas_tenant_isolation" ON emprestimo_parcelas
  FOR ALL USING (empresa_id = get_user_empresa_id());

-- 6. Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS trg_emprestimos_updated ON emprestimos;
CREATE TRIGGER trg_emprestimos_updated
  BEFORE UPDATE ON emprestimos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_emprestimo_parcelas_updated ON emprestimo_parcelas;
CREATE TRIGGER trg_emprestimo_parcelas_updated
  BEFORE UPDATE ON emprestimo_parcelas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
