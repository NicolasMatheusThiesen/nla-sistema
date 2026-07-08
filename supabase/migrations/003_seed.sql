-- ============================================================
-- SEED — Dados de demonstração
-- Execute APÓS 002_rls.sql
-- ============================================================

-- 1. Criar empresa
INSERT INTO empresa (id, razao_social, nome_fantasia, cnpj, telefone, email, cidade, estado)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Empresa de Equipamentos LTDA',
  'EquipLoc',
  '12.345.678/0001-99',
  '(11) 99999-0000',
  'contato@equiploc.com.br',
  'São Paulo',
  'SP'
) ON CONFLICT DO NOTHING;

-- 2. Categorias padrão
INSERT INTO categorias (empresa_id, nome, tipo, cor) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Locação de Equipamentos', 'receita', '#22c55e'),
  ('a0000000-0000-0000-0000-000000000001', 'Venda de Equipamentos', 'receita', '#16a34a'),
  ('a0000000-0000-0000-0000-000000000001', 'Serviços Avulsos', 'receita', '#4ade80'),
  ('a0000000-0000-0000-0000-000000000001', 'Manutenção', 'despesa', '#f97316'),
  ('a0000000-0000-0000-0000-000000000001', 'Combustível', 'despesa', '#fb923c'),
  ('a0000000-0000-0000-0000-000000000001', 'Seguro', 'despesa', '#fbbf24'),
  ('a0000000-0000-0000-0000-000000000001', 'Salários', 'despesa', '#a78bfa'),
  ('a0000000-0000-0000-0000-000000000001', 'Transporte', 'despesa', '#60a5fa'),
  ('a0000000-0000-0000-0000-000000000001', 'Administrativo', 'despesa', '#94a3b8')
ON CONFLICT DO NOTHING;
