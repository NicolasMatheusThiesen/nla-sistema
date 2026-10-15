-- ============================================================================
-- 012_security_fixes.sql
-- Correções de Cibersegurança, RLS e Auditoria
-- ============================================================================

-- 1. Correção crítica de RLS em contas_bancarias (substituindo auth.uid() incorreto por get_user_empresa_id())
DROP POLICY IF EXISTS "contas_bancarias_tenant_isolation" ON contas_bancarias;
CREATE POLICY "contas_bancarias_tenant_isolation" ON contas_bancarias
  FOR ALL USING (empresa_id = get_user_empresa_id());

-- 2. Tabela de logs de auditoria de segurança (audit_logs)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID REFERENCES empresa(id) ON DELETE CASCADE,
  user_id UUID,
  user_email TEXT,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  resource_id TEXT,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_empresa ON audit_logs(empresa_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_tenant_isolation" ON audit_logs;
CREATE POLICY "audit_logs_tenant_isolation" ON audit_logs
  FOR SELECT USING (empresa_id = get_user_empresa_id());

-- 3. Limpeza de privilégios públicos para o perfil anon (evita consultas diretas não autenticadas)
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anon;
