import cors from 'cors';
import express from 'express';
import expenseRoutes from './routes/expenses-routes.js';
import { ExpensesController } from './controllers/expenses-controller.js';

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(cors());
app.use(express.json());

// Health check endpoint (frequently used by Docker/K8s)
app.get('/health', ExpensesController.health);

// Base API Routes
app.use('/api', expenseRoutes);

app.listen(port, () => {
  console.log(`🚀 API POA Transparente executando na porta ${port}`);
});
