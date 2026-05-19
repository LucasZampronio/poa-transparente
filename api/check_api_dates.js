import { pool } from './src/db.js';

async function checkApiDates() {
  try {
    const result = await pool.query(`
      SELECT 
        so.data_inicio as reference_date
      FROM silver_obras so
      WHERE so.data_inicio IS NOT NULL
      LIMIT 1 
    `);
    //
    if (result.rows.length > 0) {
      const refDate = result.rows[0].reference_date;
      console.log('--- API Node.js Date Check ---');
      console.log('Value:', refDate);
      console.log('Type:', typeof refDate);
      console.log('Is Date instance:', refDate instanceof Date);
      if (refDate instanceof Date) {
        console.log('ISO String:', refDate.toISOString());
        console.log('String conversion:', String(refDate));
      }
      console.log('JSON conversion:', JSON.stringify({ d: refDate }));
    } else {
      console.log('No records found in silver_obras');
    }
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkApiDates();
