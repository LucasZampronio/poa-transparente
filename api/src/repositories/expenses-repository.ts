import { pool } from '../db.js';

export const ExpensesRepository = {
  async getSummary() {
    const result = await pool.query(`
      SELECT 
        COALESCE(SUM(valor_total_gasto), 0) AS total_spent, 
        COUNT(*) AS contracts_count, 
        (SELECT COUNT(*) FROM gold_top_empresas) AS companies_count,
        (SELECT COUNT(*) FROM gold_top_agencies) AS agencies_count 
      FROM gold_obras_com_gastos
    `);
    return result.rows[0];
  },

  async getSectors() {
    const result = await pool.query(`
      SELECT 
        bairro as name, 
        quantidade_obras AS count, 
        total_gasto AS total 
      FROM gold_gastos_por_bairro 
      ORDER BY total DESC
    `);
    return result.rows;
  },

  async getCategories() {
    // Note: The new medallion architecture doesn't have a direct equivalent for 'category'
    // at the gold level yet. Returning a simplified structure or an empty array for now,
    // as public_expenses is deprecated.
    return [];
  },

  async getMapData() {
    const result = await pool.query(`
      -- 1. Obras do TCE (Camada Gold Enriquecida)
      SELECT 
        COALESCE(so.bairro, 'PORTO ALEGRE') as district, 
        so.latitude, 
        so.longitude, 
        COALESCE(so.nome_obra, 'OBRA SEM DESCRIÇÃO') as description_detailed,
        COALESCE(MAX(so.valor_licitado), 0) as contract_value,
        COALESCE(MAX(so.valor_total), 0) as value_total,
        COALESCE(MAX(so.valor_contrato), 0) as value_contracted,
        COALESCE(MAX(so.valor_garantia), 0) as value_guarantee,
        'INFRAESTRUTURA' as sector,
        'OBRA' as type,
        COALESCE(
          CASE 
            WHEN COUNT(DISTINCT so.contratada_nome) > 1 THEN STRING_AGG(DISTINCT so.contratada_nome, ', ')
            ELSE MAX(so.contratada_nome)
          END, 
          'EMPRESA NÃO INFORMADA'
        ) as company_name,
        COALESCE(so.orgao, 'PREFEITURA POA') as agency,
        COALESCE(so.data_inicio::text, 'N/A') as reference_date,
        COALESCE(
          CASE 
            WHEN COUNT(DISTINCT so.contratada_cnpj) > 1 THEN 'MÚLTIPLOS'
            ELSE MAX(so.contratada_cnpj)
          END,
          'N/A'
        ) as beneficiary_id,
        COALESCE(MAX(so.logradouro), so.bairro, 'PORTO ALEGRE') as address,
        COALESCE(MAX(so.fiscal_nome), 'NÃO INFORMADO') as fiscal_name,
        'Setor Fiscal: ' || COALESCE(so.orgao, 'PREFEITURA POA') as fiscal_info,
        NULL as technical_family,
        COALESCE(MAX(so.finalidade), 'N/A') as technical_subfamily,
        so.external_id::text as process_number
      FROM silver_obras so
      WHERE so.latitude IS NOT NULL AND so.longitude IS NOT NULL
      GROUP BY so.external_id, so.nome_obra, so.bairro, so.latitude, so.longitude, so.orgao, so.data_inicio
      ORDER BY type DESC, reference_date DESC, contract_value DESC NULLS LAST
    `);
    return result.rows;
  },

  async getTopCompanies() {
    const result = await pool.query(`
      SELECT 
        empresa as company_name, 
        ROUND(total_recebido::numeric, 2) AS total_received 
      FROM gold_top_empresas 
      ORDER BY total_received DESC 
      LIMIT 10
    `);
    return result.rows;
  },

  async getTopAgencies() {
    const result = await pool.query(`
      SELECT 
        agency, 
        ROUND(total_spent::numeric, 2) AS total_spent 
      FROM gold_top_agencies 
      ORDER BY total_spent DESC 
      LIMIT 10
    `);
    return result.rows;
  },

  async getTopExpenses() {
    const result = await pool.query(`
      SELECT 
        nome_obra as description, 
        COALESCE(contratada_nome, 'MÚLTIPLAS EMPRESAS') as company_name,
        ROUND(valor_licitado::numeric, 2) AS amount,
        orgao as agency,
        'OBRA' as type,
        latitude,
        longitude
      FROM silver_obras 
      WHERE valor_licitado > 0
      ORDER BY amount DESC 
      LIMIT 10
    `);
    // Map 'amount' to 'total_spent' to maintain compatibility with RankingPanel props in Dashboard.tsx
    return result.rows.map((row: any) => ({
      ...row,
      total_spent: row.amount
    }));
  },

  async getTimeSeries() {
    const result = await pool.query(`
      SELECT 
        TO_CHAR(data, 'YYYY-MM') AS month, 
        ROUND(SUM(total_gasto)::numeric, 2) AS total_spent 
      FROM gold_series_temporais 
      GROUP BY DATE_TRUNC('month', data) 
      ORDER BY DATE_TRUNC('month', data)
    `);
    return result.rows;
  },

  async getWorkExpenses(workId: number) {
    const result = await pool.query(`
      SELECT 
        d.num_empenho, d.data_empenho, d.valor_empenhado, d.descricao, 
        d.nome_fornecedor, m.score, m.confianca
      FROM obra_despesa_match m
      JOIN silver_despesas d ON m.despesa_id = d.id
      WHERE m.obra_id = $1
      ORDER BY m.score DESC
    `, [workId]);
    return result.rows;
  },

  async cleanup() {
    return await pool.query('TRUNCATE TABLE silver_obras, silver_despesas, obra_despesa_match CASCADE');
  },

  async getHealth() {
    const result = await pool.query('SELECT COUNT(*) AS total FROM gold_obras_com_gastos');
    return Number(result.rows[0].total);
  }
};
