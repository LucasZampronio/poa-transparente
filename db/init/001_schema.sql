-- ==========================================
-- POA TRANSPARENTE - SCHEMA CONSOLIDADO (V1.0)
-- ==========================================

-- 1. Gastos Públicos (Dataset Inicial/Seed)
CREATE TABLE IF NOT EXISTS public_expenses (
  id SERIAL PRIMARY KEY,
  reference_date DATE NOT NULL,
  agency VARCHAR(150) NOT NULL,
  company_name VARCHAR(180) NOT NULL,
  category VARCHAR(120) NOT NULL,
  sector VARCHAR(100),
  district VARCHAR(120) NOT NULL,
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  contract_value NUMERIC(14,2) NOT NULL,
  bidding_count INTEGER NOT NULL,
  beneficiary_id VARCHAR(20),
  process_number VARCHAR(100),
  description_detailed TEXT,
  portal_link TEXT,
  address TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (process_number, company_name, description_detailed)
);

CREATE INDEX IF NOT EXISTS idx_public_expenses_reference_date ON public_expenses(reference_date);
CREATE INDEX IF NOT EXISTS idx_public_expenses_agency ON public_expenses(agency);
CREATE INDEX IF NOT EXISTS idx_public_expenses_category ON public_expenses(category);

-- 2. Controle de Sincronização (Portal da Transparência Federal)
CREATE TABLE IF NOT EXISTS portal_transparencia_sync_runs (
  id BIGSERIAL PRIMARY KEY,
  dataset_key VARCHAR(80) NOT NULL,
  request_params JSONB NOT NULL,
  status VARCHAR(20) NOT NULL,
  pages_fetched INTEGER NOT NULL DEFAULT 0,
  records_fetched INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_portal_sync_runs_dataset_started_at
  ON portal_transparencia_sync_runs(dataset_key, started_at DESC);

-- 3. Registros Brutos (Camada Bronze - Raw Data)
CREATE TABLE IF NOT EXISTS portal_transparencia_raw_records (
  id BIGSERIAL PRIMARY KEY,
  dataset_key VARCHAR(80) NOT NULL,
  external_id VARCHAR(160) NOT NULL,
  scope_key VARCHAR(120),
  reference_key VARCHAR(80),
  data_referencia DATE,
  payload_hash CHAR(64) NOT NULL,
  payload JSONB NOT NULL,
  last_sync_run_id BIGINT REFERENCES portal_transparencia_sync_runs(id),
  synced_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (dataset_key, external_id)
);

CREATE INDEX IF NOT EXISTS idx_portal_raw_dataset_reference
  ON portal_transparencia_raw_records(dataset_key, reference_key, scope_key);

-- 4. Benefícios Sociais (Bolsa Família, etc)
CREATE TABLE IF NOT EXISTS portal_beneficios_municipio (
  id BIGSERIAL PRIMARY KEY,
  dataset_key VARCHAR(80) NOT NULL,
  external_id VARCHAR(160) NOT NULL,
  mes_ano INTEGER NOT NULL,
  data_referencia DATE,
  municipio_codigo_ibge VARCHAR(10) NOT NULL,
  municipio_nome VARCHAR(120),
  uf_sigla VARCHAR(2),
  beneficio_tipo_id INTEGER,
  beneficio_tipo_descricao VARCHAR(180),
  beneficio_tipo_detalhe TEXT,
  valor NUMERIC(16, 2) NOT NULL,
  quantidade_beneficiados INTEGER,
  raw_payload JSONB NOT NULL,
  synced_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (dataset_key, external_id)
);

CREATE INDEX IF NOT EXISTS idx_portal_beneficios_lookup
  ON portal_beneficios_municipio(dataset_key, municipio_codigo_ibge, mes_ano);

-- 5. BPC (Benefício de Prestação Continuada)
CREATE TABLE IF NOT EXISTS portal_bpc_municipio (
  id BIGSERIAL PRIMARY KEY,
  dataset_key VARCHAR(80) NOT NULL,
  external_id VARCHAR(160) NOT NULL,
  mes_ano INTEGER NOT NULL,
  data_mes_competencia DATE,
  data_mes_referencia DATE,
  municipio_codigo_ibge VARCHAR(10) NOT NULL,
  municipio_nome VARCHAR(120),
  uf_sigla VARCHAR(2),
  beneficiario_nome VARCHAR(200),
  beneficiario_cpf VARCHAR(40),
  beneficiario_nis VARCHAR(40),
  representante_legal_nome VARCHAR(200),
  representante_legal_cpf VARCHAR(40),
  representante_legal_nis VARCHAR(40),
  valor NUMERIC(16, 2) NOT NULL,
  concedido_judicialmente BOOLEAN NOT NULL DEFAULT FALSE,
  menor_16_anos BOOLEAN NOT NULL DEFAULT FALSE,
  raw_payload JSONB NOT NULL,
  synced_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (dataset_key, external_id)
);

-- 6. Licitações
CREATE TABLE IF NOT EXISTS portal_licitacoes (
  id BIGSERIAL PRIMARY KEY,
  dataset_key VARCHAR(80) NOT NULL,
  external_id VARCHAR(160) NOT NULL,
  codigo_orgao_consulta VARCHAR(20) NOT NULL,
  data_referencia DATE,
  data_abertura DATE,
  data_publicacao DATE,
  data_resultado_compra DATE,
  compra_numero VARCHAR(80),
  compra_objeto TEXT,
  numero_processo VARCHAR(80),
  contato_responsavel VARCHAR(200),
  situacao_compra VARCHAR(120),
  modalidade_licitacao VARCHAR(160),
  instrumento_legal VARCHAR(160),
  valor NUMERIC(18, 2),
  municipio_codigo_ibge VARCHAR(10),
  municipio_nome VARCHAR(120),
  uf_sigla VARCHAR(2),
  unidade_gestora_codigo VARCHAR(20),
  unidade_gestora_nome VARCHAR(200),
  raw_payload JSONB NOT NULL,
  synced_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (dataset_key, external_id)
);

-- 7. Contratos
CREATE TABLE IF NOT EXISTS portal_contratos (
  id BIGSERIAL PRIMARY KEY,
  dataset_key VARCHAR(80) NOT NULL,
  external_id VARCHAR(160) NOT NULL,
  codigo_orgao_consulta VARCHAR(20) NOT NULL,
  numero VARCHAR(80),
  objeto TEXT,
  data_assinatura DATE,
  data_publicacao_dou DATE,
  data_inicio_vigencia DATE,
  data_fim_vigencia DATE,
  fornecedor_nome VARCHAR(200),
  valor_inicial_compra NUMERIC(18, 2),
  valor_final_compra NUMERIC(18, 2),
  raw_payload JSONB NOT NULL,
  synced_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (dataset_key, external_id)
);

-- 8. Despesas por Órgão
CREATE TABLE IF NOT EXISTS portal_despesas_anuais_orgao (
  id BIGSERIAL PRIMARY KEY,
  dataset_key VARCHAR(80) NOT NULL,
  external_id VARCHAR(160) NOT NULL,
  ano INTEGER NOT NULL,
  codigo_orgao VARCHAR(20),
  orgao VARCHAR(200),
  empenhado NUMERIC(18, 2),
  liquidado NUMERIC(18, 2),
  pago NUMERIC(18, 2),
  raw_payload JSONB NOT NULL,
  synced_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (dataset_key, external_id)
);

-- 9. Cache de CNPJ (Evita excesso de chamadas em APIs externas)
CREATE TABLE IF NOT EXISTS company_cache (
  cnpj VARCHAR(20) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 10. Cache de Geolocalização
CREATE TABLE IF NOT EXISTS geo_cache (
  address VARCHAR(500) PRIMARY KEY,
  latitude NUMERIC(14,10) NOT NULL,
  longitude NUMERIC(14,10) NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);
