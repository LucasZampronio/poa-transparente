import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import client from 'prom-client';

import { pool } from './db.js';
import { buildCategorySuite } from './services/category-suite.js';
import { syncBolsaFamilia, getBolsaFamiliaFromDb } from './services/portal-transparencia.js';

const app = express();
const port = Number(process.env.PORT ?? 4000);
const publicHost = process.env.PUBLIC_HOST ?? 'localhost';
const publicApiUrl = process.env.PUBLIC_API_URL ?? `http://${publicHost}:${port}`;
const publicWebUrl = process.env.PUBLIC_WEB_URL ?? `http://${publicHost}:5173`;
const publicPrometheusUrl = process.env.PUBLIC_PROMETHEUS_URL ?? `http://${publicHost}:9090`;
const publicGrafanaUrl = process.env.PUBLIC_GRAFANA_URL ?? `http://${publicHost}:3000`;
const publicPostgresAddress = process.env.PUBLIC_POSTGRES_ADDRESS ?? `${publicHost}:5432`;
const publicRoutes = {
  api: publicApiUrl,
  health: `${publicApiUrl}/health`,
  metrics: `${publicApiUrl}/metrics`,
  summary: `${publicApiUrl}/api/summary`,
  categories: `${publicApiUrl}/api/categories`,
  categorySuite: `${publicApiUrl}/api/category-suite?category=Saude`,
  expensesMap: `${publicApiUrl}/api/expenses/map`,
  companiesRanking: `${publicApiUrl}/api/rankings/companies`,
  agenciesRanking: `${publicApiUrl}/api/rankings/agencies`,
  timeseries: `${publicApiUrl}/api/timeseries`,
  portalBolsaFamilia: `${publicApiUrl}/api/portal/bolsa-familia`,
};

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

app.get('/', (_req, res) => {
  res.json({
    name: 'POA Transparente API',
    status: 'ok',
    web: publicWebUrl,
    api: publicApiUrl,
    endpoints: publicRoutes,
    monitoring: {
      prometheus: publicPrometheusUrl,
      grafana: publicGrafanaUrl,
    },
    database: publicPostgresAddress,
  });
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

app.get('/api/categories', async (_req, res) => {
  const result = await pool.query(`
    SELECT
      category,
      COUNT(*)::int AS expenses_count,
      ROUND(SUM(contract_value)::numeric, 2) AS total_spent
    FROM public_expenses
    GROUP BY category
    ORDER BY total_spent DESC, category
  `);

  res.json(result.rows);
});

app.get('/api/category-suite', async (req, res) => {
  const categories = parseCategoryFilter(req.query.category);

  if (categories.length === 0) {
    return res.status(400).json({ message: 'Informe uma categoria para carregar a suite setorial.' });
  }

  if (categories.length > 1) {
    return res
      .status(400)
      .json({ message: 'Selecione apenas uma categoria por vez para abrir a suite setorial.' });
  }

  const suite = await buildCategorySuite(categories[0]);
  res.json(suite);
});

app.get('/api/expenses/map', async (req, res) => {
  const categories = parseCategoryFilter(req.query.category);
  const queryParams: unknown[] = [];
  let whereClause = '';

  if (categories.length > 0) {
    queryParams.push(categories);
    whereClause = `WHERE category = ANY($${queryParams.length}::text[])`;
  }

  queryParams.push(150);

  const result = await pool.query(
    `
    SELECT district, latitude, longitude, company_name, agency, category, contract_value
    FROM public_expenses
    ${whereClause}
    ORDER BY contract_value DESC
    LIMIT $${queryParams.length}
  `,
    queryParams
  );

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

app.post('/api/portal/bolsa-familia/sync', async (req, res) => {
  const { mesAno, codigoIbge } = req.body;

  if (!mesAno || !codigoIbge) {
    return res.status(400).json({ message: 'mesAno e codigoIbge são obrigatórios' });
  }

  try {
    const result = await syncBolsaFamilia(mesAno, codigoIbge);
    res.json({ message: 'Sincronização concluída com sucesso', result });
  } catch (error: any) {
    console.error('Erro na sincronização:', error);
    res.status(500).json({ message: 'Erro ao sincronizar dados', details: error.message });
  }
});

app.get('/api/portal/bolsa-familia', async (req, res) => {
  const mesAno = Number(req.query.mesAno);
  const codigoIbge = req.query.codigoIbge as string;

  if (!mesAno || !codigoIbge) {
    return res.status(400).json({ message: 'Parâmetros mesAno e codigoIbge são obrigatórios na query' });
  }

  try {
    const data = await getBolsaFamiliaFromDb(mesAno, codigoIbge);
    res.json(data);
  } catch (error: any) {
    console.error('Erro ao ler dados do banco:', error);
    res.status(500).json({ message: 'Erro interno ao buscar os dados' });
  }
});

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(error);
  res.status(500).json({ message: 'Erro interno' });
});

function parseCategoryFilter(value: unknown): string[] {
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => parseCategoryFilter(item));
  }

  return [];
}

function logStartupUrls() {
  console.log(
    [
      '',
      'POA Transparente disponivel em:',
      `- Web: ${publicWebUrl}`,
      `- API: ${publicRoutes.api}`,
      `- Health: ${publicRoutes.health}`,
      `- Metrics: ${publicRoutes.metrics}`,
      `- Resumo: ${publicRoutes.summary}`,
      `- Categorias: ${publicRoutes.categories}`,
      `- Suite setorial: ${publicRoutes.categorySuite}`,
      `- Mapa: ${publicRoutes.expensesMap}`,
      `- Ranking empresas: ${publicRoutes.companiesRanking}`,
      `- Ranking orgaos: ${publicRoutes.agenciesRanking}`,
      `- Serie temporal: ${publicRoutes.timeseries}`,
      `- Portal (Bolsa Familia): ${publicRoutes.portalBolsaFamilia}`,
      `- Prometheus: ${publicPrometheusUrl}`,
      `- Grafana: ${publicGrafanaUrl} (admin/admin)`,
      `- Postgres: ${publicPostgresAddress}`,
    ].join('\n')
  );
}

app.listen(port, async () => {
  await refreshDatasetMetrics().catch(() => undefined);
  console.log(`API executando na porta ${port}`);
  logStartupUrls();
});
