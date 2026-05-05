import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://poa:poa@localhost:5432/poa_transparente"
});

async function test() {
  try {
    const checkCols = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'silver_obras'
    `);
    console.log("COLUMNS:", checkCols.rows.map(r => r.column_name));

    const sampleData = await pool.query(`
      SELECT external_id, nome_obra, orgao 
      FROM silver_obras 
      LIMIT 5
    `);
    console.log("SAMPLE DATA:", JSON.stringify(sampleData.rows, null, 2));
  } catch (err) {
    console.error("SQL ERROR:", err.message);
  } finally {
    await pool.end();
  }
}

test();
