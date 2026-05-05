import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://poa:poa@localhost:5432/poa_transparente"
});

async function test() {
  try {
    const sampleData = await pool.query(`
      SELECT external_id, contratada_nome, fiscal_nome, data_inicio 
      FROM silver_obras 
      WHERE contratada_nome IS NOT NULL OR fiscal_nome IS NOT NULL
      LIMIT 10
    `);
    console.log("DETAILED DATA:", JSON.stringify(sampleData.rows, null, 2));

    const countNulls = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(contratada_nome) as with_contractor,
        COUNT(fiscal_nome) as with_fiscal
      FROM silver_obras
    `);
    console.log("COUNTS:", countNulls.rows[0]);
  } catch (err) {
    console.error("SQL ERROR:", err.message);
  } finally {
    await pool.end();
  }
}

test();
