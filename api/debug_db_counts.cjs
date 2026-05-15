const pg = require('pg');
const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || 'postgresql://poa:poa@localhost:5432/poa_transparente';
const pool = new Pool({ connectionString });

async function check() {
  try {
    console.log('--- Database Status ---');
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    for (const row of tables.rows) {
      const countRes = await pool.query(`SELECT COUNT(*) FROM ${row.table_name}`);
      console.log(`${row.table_name}: ${countRes.rows[0].count} rows`);
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error connecting to DB:', err.message);
    process.exit(1);
  }
}

check();
