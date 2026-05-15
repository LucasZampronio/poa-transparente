-- Capítulo 2: Integridade e Performance do Banco de Dados

-- 1. Limpeza de Duplicatas (Preparação para UNIQUE)
-- Remove registros duplicados mantendo apenas o mais recente (maior ID)
DELETE FROM silver_despesas a USING (
      SELECT MIN(id) as id, num_empenho 
      FROM silver_despesas 
      GROUP BY num_empenho 
      HAVING COUNT(*) > 1
) b
WHERE a.num_empenho = b.num_empenho 
AND a.id <> b.id;

-- 2. Constraints de Integridade (DB-01 e DB-02)
ALTER TABLE silver_obras ALTER COLUMN external_id SET NOT NULL;

-- Garante que num_empenho não seja nulo e seja único
ALTER TABLE silver_despesas ALTER COLUMN num_empenho SET NOT NULL;
ALTER TABLE silver_despesas ADD CONSTRAINT unique_num_empenho UNIQUE (num_empenho);

-- 3. Índices de JOIN (DB-IDX-01)
CREATE INDEX IF NOT EXISTS idx_obra_despesa_match_obra_id ON obra_despesa_match(obra_id);
CREATE INDEX IF NOT EXISTS idx_obra_despesa_match_despesa_id ON obra_despesa_match(despesa_id);

-- 4. Índices Temporais e Agrupamento (DB-IDX-02)
CREATE INDEX IF NOT EXISTS idx_silver_despesas_data_empenho ON silver_despesas(data_empenho);
CREATE INDEX IF NOT EXISTS idx_silver_despesas_orgao ON silver_despesas(orgao);
CREATE INDEX IF NOT EXISTS idx_silver_obras_data_inicio ON silver_obras(data_inicio);

-- 5. Otimização de busca por fornecedor (Case Insensitive)
CREATE INDEX IF NOT EXISTS idx_silver_despesas_fornecedor_lower ON silver_despesas(LOWER(nome_fornecedor));
