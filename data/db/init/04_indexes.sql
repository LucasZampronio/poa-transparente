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
CREATE INDEX IF NOT EXISTS idx_obra_despesa_match_obra_id ON obra_despesa_match(obra_id);
CREATE INDEX IF NOT EXISTS idx_obra_despesa_match_despesa_id ON obra_despesa_match(despesa_id);

-- Performance Indexes (Dates and Grouping)
CREATE INDEX IF NOT EXISTS idx_silver_despesas_data_empenho ON silver_despesas(data_empenho);
CREATE INDEX IF NOT EXISTS idx_silver_despesas_orgao ON silver_despesas(orgao);
CREATE INDEX IF NOT EXISTS idx_silver_obras_data_inicio ON silver_obras(data_inicio);

-- Search optimization
CREATE INDEX IF NOT EXISTS idx_silver_despesas_fornecedor_lower ON silver_despesas(LOWER(nome_fornecedor));
