import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import { pool } from './db.js';
import { syncTceObras } from './services/tce-rs.js';

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(cors());
app.use(express.json());

app.post('/api/sync/tce', async (req, res) => {
  const year = Number(req.body.year || 2024);
  try {
    const result = await syncTceObras(year);
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/sync/cleanup', async (_req, res) => {
  try {
    await pool.query('DELETE FROM public_expenses');
    res.json({ success: true, message: 'Dataset limpo com sucesso.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/health', async (_req, res) => {
  const result = await pool.query('SELECT COUNT(*) AS total FROM public_expenses');
  res.json({ status: 'ok', rows: Number(result.rows[0].total) });
});

app.get('/api/summary', async (req, res) => {
  const summary = await pool.query(`SELECT COALESCE(SUM(contract_value), 0) AS total_spent, COUNT(*) AS contracts_count, COUNT(DISTINCT company_name) AS companies_count, COUNT(DISTINCT agency) AS agencies_count FROM public_expenses`);
  res.json(summary.rows[0]);
});

app.get('/api/sectors', async (req, res) => {
  const result = await pool.query(`SELECT sector as name, COUNT(*)::int AS count, SUM(contract_value) AS total FROM public_expenses GROUP BY sector ORDER BY total DESC`);
  res.json(result.rows);
});

app.get('/api/categories', async (req, res) => {
  const result = await pool.query(`SELECT category, COUNT(*)::int AS expenses_count, ROUND(SUM(contract_value)::numeric, 2) AS total_spent FROM public_expenses GROUP BY category ORDER BY total_spent DESC`);
  res.json(result.rows);
});

app.get('/api/expenses/map', async (req, res) => {
  const result = await pool.query(`
    SELECT 
      district, latitude, longitude, company_name, agency, category, sector, contract_value,
      beneficiary_id, process_number, description_detailed, portal_link, address, reference_date,
      fiscal_name, fiscal_info, technical_family, technical_subfamily
    FROM public_expenses
    ORDER BY contract_value DESC
    LIMIT 5000
  `);
  res.json(result.rows);
});

app.get('/api/rankings/companies', async (req, res) => {
  const result = await pool.query(`SELECT company_name, ROUND(SUM(contract_value)::numeric, 2) AS total_received FROM public_expenses GROUP BY company_name ORDER BY total_received DESC LIMIT 10`);
  res.json(result.rows);
});

app.get('/api/rankings/agencies', async (req, res) => {
  const result = await pool.query(`SELECT agency, ROUND(SUM(contract_value)::numeric, 2) AS total_spent FROM public_expenses GROUP BY agency ORDER BY total_spent DESC LIMIT 10`);
  res.json(result.rows);
});

app.get('/api/timeseries', async (req, res) => {
  const result = await pool.query(`SELECT TO_CHAR(DATE_TRUNC('month', reference_date), 'YYYY-MM') AS month, ROUND(SUM(contract_value)::numeric, 2) AS total_spent FROM public_expenses GROUP BY DATE_TRUNC('month', reference_date) ORDER BY DATE_TRUNC('month', reference_date)`);
  res.json(result.rows);
});

app.listen(port, () => {
  console.log(`API executando na porta ${port}`);
});
