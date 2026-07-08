-- ============================================================
-- RLS POLICIES — Row Level Security
-- Execute APÓS 001_schema.sql
-- ============================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE empresa ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE maquinas ENABLE ROW LEVEL SECURITY;
ALTER TABLE maquina_documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE contrato_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE parcelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE lancamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE manutencoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendas ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- EMPRESA: apenas membros da empresa podem ver
-- ============================================================
CREATE POLICY "empresa_select" ON empresa
  FOR SELECT USING (id = (SELECT get_user_empresa_id()));

CREATE POLICY "empresa_update_admin" ON empresa
  FOR UPDATE USING (
    id = (SELECT get_user_empresa_id()) AND
    EXISTS (SELECT 1 FROM profiles WHERE user_id = (SELECT auth.uid()) AND role = 'admin')
  );

-- ============================================================
-- PROFILES: usuário vê apenas perfis da mesma empresa
-- ============================================================
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (empresa_id = (SELECT get_user_empresa_id()));

CREATE POLICY "profiles_insert_admin" ON profiles
  FOR INSERT WITH CHECK (
    empresa_id = (SELECT get_user_empresa_id()) AND
    EXISTS (SELECT 1 FROM profiles WHERE user_id = (SELECT auth.uid()) AND role = 'admin')
  );

CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE USING (
    empresa_id = (SELECT get_user_empresa_id()) AND (
      user_id = (SELECT auth.uid()) OR
      EXISTS (SELECT 1 FROM profiles WHERE user_id = (SELECT auth.uid()) AND role = 'admin')
    )
  );

-- ============================================================
-- CATEGORIAS
-- ============================================================
CREATE POLICY "categorias_all" ON categorias
  FOR ALL USING (empresa_id = (SELECT get_user_empresa_id()));

-- ============================================================
-- CLIENTES
-- ============================================================
CREATE POLICY "clientes_all" ON clientes
  FOR ALL USING (empresa_id = (SELECT get_user_empresa_id()));

-- ============================================================
-- MÁQUINAS
-- ============================================================
CREATE POLICY "maquinas_all" ON maquinas
  FOR ALL USING (empresa_id = (SELECT get_user_empresa_id()));

CREATE POLICY "maquina_documentos_all" ON maquina_documentos
  FOR ALL USING (
    maquina_id IN (SELECT id FROM maquinas WHERE empresa_id = (SELECT get_user_empresa_id()))
  );

-- ============================================================
-- CONTRATOS
-- ============================================================
CREATE POLICY "contratos_all" ON contratos
  FOR ALL USING (empresa_id = (SELECT get_user_empresa_id()));

CREATE POLICY "contrato_itens_all" ON contrato_itens
  FOR ALL USING (
    contrato_id IN (SELECT id FROM contratos WHERE empresa_id = (SELECT get_user_empresa_id()))
  );

-- ============================================================
-- PARCELAS
-- ============================================================
CREATE POLICY "parcelas_all" ON parcelas
  FOR ALL USING (empresa_id = (SELECT get_user_empresa_id()));

-- ============================================================
-- LANÇAMENTOS
-- ============================================================
CREATE POLICY "lancamentos_all" ON lancamentos
  FOR ALL USING (empresa_id = (SELECT get_user_empresa_id()));

-- ============================================================
-- MANUTENÇÕES
-- ============================================================
CREATE POLICY "manutencoes_all" ON manutencoes
  FOR ALL USING (empresa_id = (SELECT get_user_empresa_id()));

-- ============================================================
-- VENDAS
-- ============================================================
CREATE POLICY "vendas_all" ON vendas
  FOR ALL USING (empresa_id = (SELECT get_user_empresa_id()));
