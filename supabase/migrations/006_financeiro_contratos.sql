-- ============================================================
-- 006 — FINANCEIRO PARA CONTRATOS E LANÇAMENTOS
-- Execute no Supabase SQL Editor
-- ============================================================

ALTER TABLE contratos
  ADD COLUMN IF NOT EXISTS tipo_comissao TEXT DEFAULT 'percentual' CHECK (tipo_comissao IN ('percentual', 'fixo'));

ALTER TABLE vendas
  ADD COLUMN IF NOT EXISTS tipo_comissao TEXT DEFAULT 'percentual' CHECK (tipo_comissao IN ('percentual', 'fixo'));

ALTER TABLE lancamentos
  ADD COLUMN IF NOT EXISTS contrato_id UUID REFERENCES contratos(id);

CREATE INDEX IF NOT EXISTS idx_lancamentos_contrato_id ON lancamentos(contrato_id);
