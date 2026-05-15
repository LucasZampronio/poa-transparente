import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { ExpensesController } from '../controllers/expenses-controller.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

// Limite de taxa para operações de sincronização (proteção contra DoS e abuso)
const syncLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo de 5 requisições por janela
  message: { error: 'Muitas requisições de sincronização. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/summary', ExpensesController.getSummary);
router.get('/sectors', ExpensesController.getSectors);
router.get('/categories', ExpensesController.getCategories);
router.get('/works/:id/expenses', ExpensesController.getWorkExpenses);
router.get('/expenses/map', ExpensesController.getMapData);
router.get('/rankings/companies', ExpensesController.getTopCompanies);
router.get('/rankings/agencies', ExpensesController.getTopAgencies);
router.get('/rankings/expenses', ExpensesController.getTopExpenses);
router.get('/timeseries', ExpensesController.getTimeSeries);

// Sync Actions (Protegidos por JWT e Rate Limiting)
router.post('/sync/cleanup', syncLimiter, requireAuth, ExpensesController.cleanup);
router.post('/sync/tce', syncLimiter, requireAuth, ExpensesController.syncTceObras);

export default router;
