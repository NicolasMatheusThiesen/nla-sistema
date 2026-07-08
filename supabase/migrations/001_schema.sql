-- ============================================================
-- SISTEMA DE GESTÃO DE EQUIPAMENTOS — SCHEMA COMPLETO
-- Execute no Supabase SQL Editor na ordem: 001, 002, 003
-- ============================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- EMPRESA
-- ============================================================
CREATE TABLE IF NOT EXISTS empresa (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  cnpj TEXT UNIQUE,
  telefone TEXT,
  email TEXT,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PERFIS DE USUÁRIO (extende Supabase Auth)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES empresa(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'financeiro', 'operacional')),
  ativo BOOLEAN DEFAULT TRUE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CATEGORIAS FINANCEIRAS
-- ============================================================
CREATE TABLE IF NOT EXISTS categorias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('receita', 'despesa')),
  cor TEXT DEFAULT '#6366f1',
  icone TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CLIENTES
-- ============================================================
CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
  tipo_pessoa TEXT NOT NULL CHECK (tipo_pessoa IN ('PF', 'PJ')),
  cpf_cnpj TEXT NOT NULL,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  email TEXT,
  telefone TEXT,
  telefone2 TEXT,
  contato_financeiro TEXT,
  telefone_financeiro TEXT,
  cep TEXT,
  endereco TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  limite_credito NUMERIC(15,2) DEFAULT 0,
  status_credito TEXT DEFAULT 'bom' CHECK (status_credito IN ('bom', 'regular', 'bloqueado')),
  observacoes TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MÁQUINAS
-- ============================================================
CREATE TABLE IF NOT EXISTS maquinas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  modelo TEXT,
  marca TEXT,
  numero_serie TEXT,
  ano_fabricacao INTEGER,
  tipo TEXT NOT NULL CHECK (tipo IN ('empilhadeira', 'paleteira', 'outro')),
  subtipo TEXT CHECK (subtipo IN ('eletrica', 'glp', 'diesel', 'manual', 'outro')),
  capacidade_kg NUMERIC(10,2),
  altura_max_elevacao NUMERIC(6,2),
  valor_aquisicao NUMERIC(15,2) DEFAULT 0,
  valor_mercado NUMERIC(15,2) DEFAULT 0,
  custo_mensal_estimado NUMERIC(15,2) DEFAULT 0,
  status TEXT DEFAULT 'disponivel' CHECK (status IN ('disponivel', 'locada', 'manutencao', 'vendida')),
  foto_url TEXT,
  data_aquisicao DATE,
  observacoes TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documentos de máquinas
CREATE TABLE IF NOT EXISTS maquina_documentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  maquina_id UUID NOT NULL REFERENCES maquinas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT, -- 'nota_fiscal', 'manual', 'cmar', 'seguro', 'outro'
  url TEXT NOT NULL,
  tamanho_bytes BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CONTRATOS DE LOCAÇÃO
-- ============================================================
CREATE TABLE IF NOT EXISTS contratos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
  numero TEXT UNIQUE NOT NULL,
  cliente_id UUID NOT NULL REFERENCES clientes(id),
  status TEXT DEFAULT 'ativo' CHECK (status IN ('rascunho', 'ativo', 'suspenso', 'encerrado')),
  tipo_locacao TEXT NOT NULL CHECK (tipo_locacao IN ('mensal', 'semestral', 'anual')),
  data_inicio DATE NOT NULL,
  data_fim DATE,
  dia_vencimento INTEGER DEFAULT 10 CHECK (dia_vencimento BETWEEN 1 AND 28),
  valor_mensal NUMERIC(15,2) NOT NULL,
  indice_reajuste TEXT DEFAULT 'nenhum' CHECK (indice_reajuste IN ('nenhum', 'ipca', 'igpm', 'fixo')),
  percentual_reajuste_fixo NUMERIC(6,2),
  manutencao_inclusa BOOLEAN DEFAULT FALSE,
  seguro_incluso BOOLEAN DEFAULT FALSE,
  multa_rescisao_percentual NUMERIC(6,2) DEFAULT 10,
  clausulas_adicionais TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Itens do contrato (máquinas locadas)
CREATE TABLE IF NOT EXISTS contrato_itens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contrato_id UUID NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
  maquina_id UUID NOT NULL REFERENCES maquinas(id),
  valor_unitario NUMERIC(15,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PARCELAS (geradas automaticamente pelo backend)
-- ============================================================
CREATE TABLE IF NOT EXISTS parcelas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
  contrato_id UUID NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES clientes(id),
  competencia TEXT NOT NULL, -- 'YYYY-MM'
  numero_parcela INTEGER NOT NULL,
  data_vencimento DATE NOT NULL,
  valor NUMERIC(15,2) NOT NULL,
  valor_pago NUMERIC(15,2),
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'vencido', 'cancelado')),
  data_pagamento DATE,
  forma_pagamento TEXT,
  comprovante_url TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- LANÇAMENTOS FINANCEIROS AVULSOS
-- ============================================================
CREATE TABLE IF NOT EXISTS lancamentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('receita', 'despesa')),
  categoria_id UUID REFERENCES categorias(id),
  descricao TEXT NOT NULL,
  valor NUMERIC(15,2) NOT NULL,
  data_competencia DATE NOT NULL,
  data_vencimento DATE,
  data_pagamento DATE,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'vencido', 'cancelado')),
  forma_pagamento TEXT,
  comprovante_url TEXT,
  cliente_id UUID REFERENCES clientes(id),
  maquina_id UUID REFERENCES maquinas(id),
  observacoes TEXT,
  recorrente BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MANUTENÇÕES
-- ============================================================
CREATE TABLE IF NOT EXISTS manutencoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
  maquina_id UUID NOT NULL REFERENCES maquinas(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('preventiva', 'corretiva', 'reforma')),
  fornecedor TEXT,
  custo NUMERIC(15,2) DEFAULT 0,
  data_inicio DATE NOT NULL,
  data_fim DATE,
  descricao TEXT,
  pecas_trocadas TEXT,
  proxima_manutencao DATE,
  status TEXT DEFAULT 'concluida' CHECK (status IN ('agendada', 'em_andamento', 'concluida')),
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- VENDAS DE EQUIPAMENTOS
-- ============================================================
CREATE TABLE IF NOT EXISTS vendas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
  maquina_id UUID NOT NULL REFERENCES maquinas(id),
  cliente_id UUID NOT NULL REFERENCES clientes(id),
  valor_venda NUMERIC(15,2) NOT NULL,
  valor_custo NUMERIC(15,2) DEFAULT 0,
  forma_pagamento TEXT NOT NULL CHECK (forma_pagamento IN ('avista', 'parcelado', 'financiado')),
  numero_parcelas INTEGER DEFAULT 1,
  data_venda DATE NOT NULL,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES DE PERFORMANCE
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_empresa_id ON profiles(empresa_id);
CREATE INDEX IF NOT EXISTS idx_clientes_empresa_id ON clientes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_clientes_cpf_cnpj ON clientes(cpf_cnpj);
CREATE INDEX IF NOT EXISTS idx_maquinas_empresa_id ON maquinas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_maquinas_status ON maquinas(status);
CREATE INDEX IF NOT EXISTS idx_contratos_empresa_id ON contratos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_contratos_cliente_id ON contratos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_contratos_status ON contratos(status);
CREATE INDEX IF NOT EXISTS idx_parcelas_empresa_id ON parcelas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_contrato_id ON parcelas(contrato_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_status ON parcelas(status);
CREATE INDEX IF NOT EXISTS idx_parcelas_data_vencimento ON parcelas(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_lancamentos_empresa_id ON lancamentos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_lancamentos_tipo ON lancamentos(tipo);
CREATE INDEX IF NOT EXISTS idx_lancamentos_data_competencia ON lancamentos(data_competencia);
CREATE INDEX IF NOT EXISTS idx_manutencoes_maquina_id ON manutencoes(maquina_id);
CREATE INDEX IF NOT EXISTS idx_vendas_empresa_id ON vendas(empresa_id);

-- ============================================================
-- TRIGGER: updated_at automático
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_empresa_updated BEFORE UPDATE ON empresa FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER trg_profiles_updated BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER trg_clientes_updated BEFORE UPDATE ON clientes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER trg_maquinas_updated BEFORE UPDATE ON maquinas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER trg_contratos_updated BEFORE UPDATE ON contratos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER trg_parcelas_updated BEFORE UPDATE ON parcelas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER trg_lancamentos_updated BEFORE UPDATE ON lancamentos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER trg_manutencoes_updated BEFORE UPDATE ON manutencoes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- FUNÇÃO: obter empresa_id do usuário logado (para RLS)
-- ============================================================
CREATE OR REPLACE FUNCTION get_user_empresa_id()
RETURNS UUID AS $$
  SELECT empresa_id FROM profiles WHERE user_id = (SELECT auth.uid());
$$ LANGUAGE sql STABLE SECURITY DEFINER;
