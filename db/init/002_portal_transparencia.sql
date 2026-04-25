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

CREATE INDEX IF NOT EXISTS idx_portal_raw_data_referencia
  ON portal_transparencia_raw_records(data_referencia DESC);

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

CREATE INDEX IF NOT EXISTS idx_portal_bpc_lookup
  ON portal_bpc_municipio(dataset_key, municipio_codigo_ibge, mes_ano);

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
  orgao_vinculado_codigo_siafi VARCHAR(20),
  orgao_vinculado_nome VARCHAR(200),
  orgao_maximo_codigo VARCHAR(20),
  orgao_maximo_nome VARCHAR(200),
  raw_payload JSONB NOT NULL,
  synced_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (dataset_key, external_id)
);

CREATE INDEX IF NOT EXISTS idx_portal_licitacoes_lookup
  ON portal_licitacoes(codigo_orgao_consulta, data_referencia DESC);

CREATE TABLE IF NOT EXISTS portal_contratos (
  id BIGSERIAL PRIMARY KEY,
  dataset_key VARCHAR(80) NOT NULL,
  external_id VARCHAR(160) NOT NULL,
  codigo_orgao_consulta VARCHAR(20) NOT NULL,
  numero VARCHAR(80),
  objeto TEXT,
  numero_processo VARCHAR(80),
  fundamento_legal TEXT,
  compra_numero VARCHAR(80),
  compra_objeto TEXT,
  compra_numero_processo VARCHAR(80),
  contato_responsavel VARCHAR(200),
  situacao_contrato VARCHAR(120),
  modalidade_compra VARCHAR(160),
  data_assinatura DATE,
  data_publicacao_dou DATE,
  data_inicio_vigencia DATE,
  data_fim_vigencia DATE,
  fornecedor_nome VARCHAR(200),
  fornecedor_cpf VARCHAR(40),
  fornecedor_cnpj VARCHAR(40),
  fornecedor_nis VARCHAR(40),
  fornecedor_tipo VARCHAR(40),
  unidade_gestora_codigo VARCHAR(20),
  unidade_gestora_nome VARCHAR(200),
  unidade_gestora_compras_codigo VARCHAR(20),
  unidade_gestora_compras_nome VARCHAR(200),
  orgao_vinculado_codigo_siafi VARCHAR(20),
  orgao_vinculado_nome VARCHAR(200),
  orgao_maximo_codigo VARCHAR(20),
  orgao_maximo_nome VARCHAR(200),
  valor_inicial_compra NUMERIC(18, 2),
  valor_final_compra NUMERIC(18, 2),
  raw_payload JSONB NOT NULL,
  synced_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (dataset_key, external_id)
);

CREATE INDEX IF NOT EXISTS idx_portal_contratos_lookup
  ON portal_contratos(codigo_orgao_consulta, data_publicacao_dou DESC, data_assinatura DESC);

CREATE TABLE IF NOT EXISTS portal_despesas_anuais_orgao (
  id BIGSERIAL PRIMARY KEY,
  dataset_key VARCHAR(80) NOT NULL,
  external_id VARCHAR(160) NOT NULL,
  ano INTEGER NOT NULL,
  codigo_orgao VARCHAR(20),
  orgao VARCHAR(200),
  codigo_orgao_superior VARCHAR(20),
  orgao_superior VARCHAR(200),
  empenhado NUMERIC(18, 2),
  liquidado NUMERIC(18, 2),
  pago NUMERIC(18, 2),
  raw_payload JSONB NOT NULL,
  synced_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (dataset_key, external_id)
);

CREATE INDEX IF NOT EXISTS idx_portal_despesas_lookup
  ON portal_despesas_anuais_orgao(ano DESC, codigo_orgao, codigo_orgao_superior);
