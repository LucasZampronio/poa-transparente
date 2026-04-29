import { Router } from 'express';
import { ExpensesController } from '../controllers/expenses-controller.js';

const router = Router();

router.get('/summary', ExpensesController.getSummary);
router.get('/sectors', ExpensesController.getSectors);
router.get('/categories', ExpensesController.getCategories);
router.get('/works/:id/expenses', ExpensesController.getWorkExpenses);
router.get('/expenses/map', ExpensesController.getMapData);
router.get('/rankings/companies', ExpensesController.getTopCompanies);
router.get('/rankings/agencies', ExpensesController.getTopAgencies);
router.get('/rankings/expenses', ExpensesController.getTopExpenses);
router.get('/timeseries', ExpensesController.getTimeSeries);

// Sync Actions
router.post('/sync/tce', ExpensesController.syncTce);
router.post('/sync/cleanup', ExpensesController.cleanup);

export default router;
