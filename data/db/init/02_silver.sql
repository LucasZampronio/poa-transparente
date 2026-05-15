-- ==========================================
-- CAMADA SILVER (Dados Limpos e Padronizados)
-- ==========================================

-- Obras (Dados do TCE-RS)
CREATE TABLE IF NOT EXISTS silver_obras (
    id SERIAL PRIMARY KEY,
    external_id INT NOT NULL UNIQUE,
    nome_obra TEXT NOT NULL,
    descricao TEXT,
    valor_licitado NUMERIC(14,2),
    valor_total NUMERIC(14,2),
    valor_contrato NUMERIC(14,2),
    valor_garantia NUMERIC(14,2),
    data_inicio DATE,
    bairro TEXT,
    logradouro TEXT,
    latitude NUMERIC(9,6),
    longitude NUMERIC(9,6),
    situacao TEXT,
    orgao TEXT,
    link_tce TEXT,
    contratada_cnpj TEXT,
    contratada_nome TEXT,
    fiscal_nome TEXT,
    fiscal_info TEXT,
    finalidade TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Despesas (Dados do Portal da Transparência de POA)
CREATE TABLE IF NOT EXISTS silver_despesas (
    id SERIAL PRIMARY KEY,
    num_empenho TEXT NOT NULL UNIQUE,
    data_empenho DATE,
    valor_empenhado NUMERIC(14,2),
    valor_liquidado NUMERIC(14,2),
    valor_pago NUMERIC(14,2),
    descricao TEXT,
    cnpj_fornecedor TEXT,
    nome_fornecedor TEXT,
    orgao TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Fornecedores
CREATE TABLE IF NOT EXISTS silver_fornecedores (
    cnpj TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Relacionamento Obra-Despesa
CREATE TABLE IF NOT EXISTS obra_despesa_match (
    id SERIAL PRIMARY KEY,
    obra_id INT REFERENCES silver_obras(id),
    despesa_id INT REFERENCES silver_despesas(id),
    score FLOAT,
    confianca TEXT, -- 'alta', 'media', 'baixa'
    UNIQUE(obra_id, despesa_id)
);
