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
      -- 1. Obras (Com ou sem gastos vinculados)
      SELECT 
        so.bairro as district, 
        so.latitude, 
        so.longitude, 
        so.descricao as description_detailed,
        COALESCE(go.valor_total_gasto, 0) as contract_value,
        'INFRAESTRUTURA' as sector,
        'OBRA' as type,
        so.link_tce as portal_link,
        COALESCE(so.contratada_nome, 'MÚLTIPLAS EMPRESAS') as company_name,
        so.orgao as agency,
        so.data_inicio as reference_date,
        so.contratada_cnpj as beneficiary_id,
        so.bairro as address,
        NULL as fiscal_name,
        NULL as fiscal_info,
        NULL as technical_family,
        NULL as technical_subfamily
      FROM silver_obras so
      LEFT JOIN gold_obras_com_gastos go ON so.id = go.obra_id
      WHERE so.latitude IS NOT NULL AND so.longitude IS NOT NULL

      UNION ALL

      -- 2. Gastos Avulsos (Despesas que não estão vinculadas a nenhuma obra)
      SELECT 
        'PORTO ALEGRE' as district, -- Despesas avulsas geralmente são no município
        sd.latitude, 
        sd.longitude, 
        sd.descricao as description_detailed,
        sd.valor_pago as contract_value,
        'SERVIÇOS/CONSUMO' as sector,
        'GASTO_AVULSO' as type,
        NULL as portal_link,
        sd.nome_fornecedor as company_name,
        sd.orgao as agency,
        sd.data_empenho as reference_date,
        sd.cnpj_fornecedor as beneficiary_id,
        NULL as address,
        NULL as fiscal_name,
        NULL as fiscal_info,
        NULL as technical_family,
        NULL as technical_subfamily
      FROM silver_despesas sd
      LEFT JOIN obra_despesa_match odm ON sd.id = odm.despesa_id
      WHERE sd.latitude IS NOT NULL AND sd.longitude IS NOT NULL
        AND odm.id IS NULL -- Somente as que NÃO foram vinculadas a obras
      
      ORDER BY reference_date DESC, contract_value DESC NULLS LAST
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
        descricao as description, 
        nome_fornecedor as company_name,
        ROUND(valor_pago::numeric, 2) AS amount,
        orgao as agency
      FROM silver_despesas 
      ORDER BY valor_pago DESC 
      LIMIT 10
    `);
    return result.rows;
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
