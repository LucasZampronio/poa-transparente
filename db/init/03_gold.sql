-- ==========================================
-- CAMADA GOLD (Dados Analíticos e Agregados)
-- ==========================================

-- Obras com Gastos Agregados
CREATE TABLE IF NOT EXISTS gold_obras_com_gastos (
    obra_id INT PRIMARY KEY REFERENCES silver_obras(id),
    nome_obra TEXT,
    valor_licitado NUMERIC(14,2),
    valor_total_gasto NUMERIC(14,2),
    percentual_execucao NUMERIC(10,2),
    quantidade_despesas INT
);

-- Top Empresas por Recebimento
CREATE TABLE IF NOT EXISTS gold_top_empresas (
    cnpj TEXT PRIMARY KEY,
    empresa TEXT,
    total_recebido NUMERIC(14,2),
    quantidade_contratos INT
);

-- Gastos por Bairro
CREATE TABLE IF NOT EXISTS gold_gastos_por_bairro (
    bairro TEXT PRIMARY KEY,
    total_gasto NUMERIC(14,2),
    quantidade_obras INT
);

-- Top Órgãos/Agências por Investimento
CREATE TABLE IF NOT EXISTS gold_top_agencies (
    agency TEXT PRIMARY KEY,
    total_spent NUMERIC(14,2),
    quantidade_obras INT
);

-- Série Temporal de Gastos
CREATE TABLE IF NOT EXISTS gold_series_temporais (
    data DATE PRIMARY KEY,
    total_gasto NUMERIC(14,2)
);

-- Maiores Despesas Individuais
CREATE TABLE IF NOT EXISTS gold_top_expenses (
    id SERIAL PRIMARY KEY,
    descricao TEXT,
    nome_fornecedor TEXT,
    valor_pago NUMERIC(14,2),
    orgao TEXT,
    data_empenho DATE
);
