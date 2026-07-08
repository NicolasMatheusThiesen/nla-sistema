-- ============================================================
-- 009 - CONTAS BANCÁRIAS
-- Execute no Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS contas_bancarias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  banco TEXT,
  agencia TEXT,
  conta TEXT,
  saldo_inicial NUMERIC(15,2) DEFAULT 0,
  saldo_atual NUMERIC(15,2) DEFAULT 0,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE lancamentos
  ADD COLUMN IF NOT EXISTS conta_bancaria_id UUID REFERENCES contas_bancarias(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_lancamentos_conta_bancaria_id ON lancamentos(conta_bancaria_id);

-- Habilitar RLS
ALTER TABLE contas_bancarias ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para contas_bancarias
CREATE POLICY "contas_bancarias_tenant_isolation" ON contas_bancarias
  FOR ALL USING (empresa_id = auth.uid());
