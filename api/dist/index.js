import cors from 'cors';
import express from 'express';
import client from 'prom-client';
import { pool } from './db.js';
import { getBolsaFamiliaFromDb } from './services/portal-transparencia.js';
const app = express();
const port = Number(process.env.PORT ?? 4000);
const publicHost = process.env.PUBLIC_HOST ?? 'localhost';
const publicApiUrl = process.env.PUBLIC_API_URL ?? `http://${publicHost}:${port}`;
const publicWebUrl = process.env.PUBLIC_WEB_URL ?? `http://${publicHost}:5173`;
app.use(cors());
app.use(express.json());
client.collectDefaultMetrics();
const httpRequests = new client.Counter({
    name: 'poa_api_requests_total',
    help: 'Total de requests HTTP da API',
    labelNames: ['method', 'route', 'status_code'],
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
    const result = await pool.query('SELECT COALESCE(SUM(contract_value), 0) AS total_value, COUNT(*) AS total_rows FROM public_expenses');
    totalExpenseGauge.set(Number(result.rows[0].total_value));
    totalRowsGauge.set(Number(result.rows[0].total_rows));
}
setInterval(() => {
    refreshDatasetMetrics().catch((error) => {
        console.error('Falha ao atualizar métricas do dataset', error);
    });
}, 15000);
app.use((req, res, next) => {
    res.on('finish', () => {
        httpRequests.inc({
            method: req.method,
            route: req.route?.path ?? req.path,
            status_code: String(res.statusCode),
        });
    });
    next();
});
app.get('/health', async (_req, res) => {
    const result = await pool.query('SELECT COUNT(*) AS total FROM public_expenses');
    res.json({ status: 'ok', rows: Number(result.rows[0].total) });
});
app.get('/api/summary', async (req, res) => {
    const sector = req.query.sector;
    let where = '';
    const params = [];
    if (sector) {
        where = 'WHERE sector = $1';
        params.push(sector);
    }
    const summary = await pool.query(`
    SELECT
      COALESCE(SUM(contract_value), 0) AS total_spent,
      COUNT(*) AS contracts_count,
      COUNT(DISTINCT company_name) AS companies_count,
      COUNT(DISTINCT agency) AS agencies_count
    FROM public_expenses
    ${where}
  `, params);
    res.json(summary.rows[0]);
});
// NOVO: Retorna os grandes Eixos (Setores)
app.get('/api/sectors', async (_req, res) => {
    const result = await pool.query(`
    SELECT
      sector as name,
      COUNT(*)::int AS count,
      SUM(contract_value) AS total
    FROM public_expenses
    GROUP BY sector
    ORDER BY total DESC
  `);
    res.json(result.rows);
});
// Retorna as subcategorias (opcionalmente filtradas por setor)
app.get('/api/categories', async (req, res) => {
    const sector = req.query.sector;
    let where = '';
    const params = [];
    if (sector) {
        where = 'WHERE sector = $1';
        params.push(sector);
    }
    const result = await pool.query(`
    SELECT
      category,
      COUNT(*)::int AS expenses_count,
      ROUND(SUM(contract_value)::numeric, 2) AS total_spent
    FROM public_expenses
    ${where}
    GROUP BY category
    ORDER BY total_spent DESC
  `, params);
    res.json(result.rows);
});
app.get('/api/expenses/map', async (req, res) => {
    const sector = req.query.sector;
    const categories = parseCategoryFilter(req.query.category);
    const queryParams = [];
    const filters = [];
    if (sector) {
        queryParams.push(sector);
        filters.push(`sector = $${queryParams.length}`);
    }
    if (categories.length > 0) {
        queryParams.push(categories);
        filters.push(`category = ANY($${queryParams.length}::text[])`);
    }
    const where = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
    queryParams.push(300);
    const limitIdx = queryParams.length;
    const result = await pool.query(`
    SELECT district, latitude, longitude, company_name, agency, category, sector, contract_value
    FROM public_expenses
    ${where}
    ORDER BY contract_value DESC
    LIMIT $${limitIdx}
  `, queryParams);
    res.json(result.rows);
});
app.get('/api/rankings/companies', async (req, res) => {
    const sector = req.query.sector;
    let where = '';
    const params = [];
    if (sector) {
        where = 'WHERE sector = $1';
        params.push(sector);
    }
    const result = await pool.query(`
    SELECT company_name, ROUND(SUM(contract_value)::numeric, 2) AS total_received
    FROM public_expenses
    ${where}
    GROUP BY company_name
    ORDER BY total_received DESC
    LIMIT 10
  `, params);
    res.json(result.rows);
});
app.get('/api/rankings/agencies', async (req, res) => {
    const sector = req.query.sector;
    let where = '';
    const params = [];
    if (sector) {
        where = 'WHERE sector = $1';
        params.push(sector);
    }
    const result = await pool.query(`
    SELECT agency, ROUND(SUM(contract_value)::numeric, 2) AS total_spent
    FROM public_expenses
    ${where}
    GROUP BY agency
    ORDER BY total_spent DESC
    LIMIT 10
  `, params);
    res.json(result.rows);
});
app.get('/api/timeseries', async (req, res) => {
    const sector = req.query.sector;
    let where = '';
    const params = [];
    if (sector) {
        where = 'WHERE sector = $1';
        params.push(sector);
    }
    const result = await pool.query(`
    SELECT
      TO_CHAR(DATE_TRUNC('month', reference_date), 'YYYY-MM') AS month,
      ROUND(SUM(contract_value)::numeric, 2) AS total_spent
    FROM public_expenses
    ${where}
    GROUP BY DATE_TRUNC('month', reference_date)
    ORDER BY DATE_TRUNC('month', reference_date)
  `, params);
    res.json(result.rows);
});
app.get('/api/portal/bolsa-familia', async (req, res) => {
    const mesAno = Number(req.query.mesAno);
    const codigoIbge = req.query.codigoIbge || '4314902';
    if (!mesAno)
        return res.status(400).json({ message: 'mesAno é obrigatório' });
    const data = await getBolsaFamiliaFromDb(mesAno, codigoIbge);
    res.json(data.length > 0 ? data[0] : null);
});
app.use((error, _req, res, _next) => {
    console.error(error);
    res.status(500).json({ message: 'Erro interno' });
});
function parseCategoryFilter(value) {
    if (typeof value === 'string')
        return [value.trim()].filter(Boolean);
    if (Array.isArray(value))
        return value.map((item) => String(item).trim()).filter(Boolean);
    return [];
}
app.listen(port, async () => {
    console.log(`API executando na porta ${port}`);
});
