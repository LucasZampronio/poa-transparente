import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://poa:poa@localhost:5432/poa_transparente"
});

async function test() {
  try {
    const result = await pool.query(`
      SELECT 
        COALESCE(so.bairro, 'PORTO ALEGRE') as district, 
        so.latitude, 
        so.longitude, 
        COALESCE(so.nome_obra, 'OBRA SEM DESCRIÇÃO') as description_detailed,
        COALESCE(MAX(so.valor_licitado), 0) as contract_value,
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
      LIMIT 5
    `);
    console.log(JSON.stringify(result.rows, null, 2));
  } catch (err) {
    console.error("SQL ERROR:", err.message);
  } finally {
    await pool.end();
  }
}

test();
