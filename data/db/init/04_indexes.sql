-- ==========================================
-- ÍNDICES E OTIMIZAÇÕES
-- ==========================================

-- Bronze Indexes
CREATE INDEX IF NOT EXISTS idx_portal_sync_runs_dataset_started_at
  ON portal_transparencia_sync_runs(dataset_key, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_portal_raw_dataset_reference
  ON portal_transparencia_raw_records(dataset_key, reference_key, scope_key);

CREATE INDEX IF NOT EXISTS idx_portal_beneficios_lookup
  ON portal_beneficios_municipio(dataset_key, municipio_codigo_ibge, mes_ano);

-- Silver Indexes
CREATE INDEX IF NOT EXISTS idx_silver_despesas_cnpj ON silver_despesas(cnpj_fornecedor);
CREATE INDEX IF NOT EXISTS idx_silver_obras_bairro ON silver_obras(bairro);

-- Matching Indexes
CREATE INDEX IF NOT EXISTS idx_match_score ON obra_despesa_match(score);
