import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import client from 'prom-client';

import { pool } from './db.js';

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(cors());
app.use(express.json());

client.collectDefaultMetrics();

const httpRequests = new client.Counter({
  name: 'poa_api_requests_total',
  help: 'Total de requests HTTP da API',
  labelNames: ['method', 'route', 'status_code'],
});

const httpDuration = new client.Histogram({
  name: 'poa_api_request_duration_seconds',
  help: 'Latência das requests HTTP',
  labelNames: ['method', 'route'],
  buckets: [0.05, 0.1, 0.3, 0.5, 1, 2, 5],
});

const totalExpenseGauge = new client.Gauge({
  name: 'poa_total_expense_value',
  help: 'Valor total de gastos carregados no banco',
});

const totalRowsGauge = new client.Gauge({
  name: 'poa_total_expense_rows',
  help: 'Quantidade total de registros carregados no banco',
});

async function refreshDatasetMetrics() {
  const result = await pool.query(
    'SELECT COALESCE(SUM(contract_value), 0) AS total_value, COUNT(*) AS total_rows FROM public_expenses'
  );
  totalExpenseGauge.set(Number(result.rows[0].total_value));
  totalRowsGauge.set(Number(result.rows[0].total_rows));
}

setInterval(() => {
  refreshDatasetMetrics().catch((error) => {
    console.error('Falha ao atualizar métricas do dataset', error);
  });
}, 15000);

app.use((req: Request, res: Response, next: NextFunction) => {
  const end = httpDuration.startTimer({ method: req.method, route: req.path });

  res.on('finish', () => {
    httpRequests.inc({
      method: req.method,
      route: req.route?.path ?? req.path,
      status_code: String(res.statusCode),
    });
    end();
  });

  next();
});

app.get('/health', async (_req, res) => {
  const result = await pool.query('SELECT COUNT(*) AS total FROM public_expenses');
  res.json({ status: 'ok', rows: Number(result.rows[0].total) });
});

app.get('/metrics', async (_req, res) => {
  await refreshDatasetMetrics();
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

app.get('/api/summary', async (_req, res) => {
  const summary = await pool.query(`
    SELECT
      COALESCE(SUM(contract_value), 0) AS total_spent,
      COUNT(*) AS contracts_count,
      COUNT(DISTINCT company_name) AS companies_count,
      COUNT(DISTINCT agency) AS agencies_count
    FROM public_expenses
  `);

  res.json(summary.rows[0]);
});

app.get('/api/expenses/map', async (_req, res) => {
  const result = await pool.query(`
    SELECT district, latitude, longitude, company_name, agency, category, contract_value
    FROM public_expenses
    ORDER BY contract_value DESC
    LIMIT 150
  `);

  res.json(result.rows);
});

app.get('/api/rankings/companies', async (_req, res) => {
  const result = await pool.query(`
    SELECT company_name, ROUND(SUM(contract_value)::numeric, 2) AS total_received
    FROM public_expenses
    GROUP BY company_name
    ORDER BY total_received DESC
    LIMIT 10
  `);

  res.json(result.rows);
});

app.get('/api/rankings/agencies', async (_req, res) => {
  const result = await pool.query(`
    SELECT agency, ROUND(SUM(contract_value)::numeric, 2) AS total_spent
    FROM public_expenses
    GROUP BY agency
    ORDER BY total_spent DESC
    LIMIT 10
  `);

  res.json(result.rows);
});

app.get('/api/timeseries', async (_req, res) => {
  const result = await pool.query(`
    SELECT
      TO_CHAR(DATE_TRUNC('month', reference_date), 'YYYY-MM') AS month,
      ROUND(SUM(contract_value)::numeric, 2) AS total_spent
    FROM public_expenses
    GROUP BY DATE_TRUNC('month', reference_date)
    ORDER BY DATE_TRUNC('month', reference_date)
  `);

  res.json(result.rows);
});

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(error);
  res.status(500).json({ message: 'Erro interno' });
});

app.listen(port, async () => {
  await refreshDatasetMetrics().catch(() => undefined);
  console.log(`API executando na porta ${port}`);
});
