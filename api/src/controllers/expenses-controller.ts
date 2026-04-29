import { Request, Response } from 'express';
import { ExpensesRepository } from '../repositories/expenses-repository.js';
import { syncTceObras } from '../services/tce-rs.js';

export const ExpensesController = {
  async getSummary(req: Request, res: Response) {
    try {
      const summary = await ExpensesRepository.getSummary();
      res.json(summary);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async getSectors(req: Request, res: Response) {
    try {
      const sectors = await ExpensesRepository.getSectors();
      res.json(sectors);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async getCategories(req: Request, res: Response) {
    try {
      const categories = await ExpensesRepository.getCategories();
      res.json(categories);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async getMapData(req: Request, res: Response) {
    try {
      const data = await ExpensesRepository.getMapData();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async getTopCompanies(req: Request, res: Response) {
    try {
      const companies = await ExpensesRepository.getTopCompanies();
      res.json(companies);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async getTopAgencies(req: Request, res: Response) {
    try {
      const agencies = await ExpensesRepository.getTopAgencies();
      res.json(agencies);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async getTopExpenses(req: Request, res: Response) {
    try {
      const expenses = await ExpensesRepository.getTopExpenses();
      res.json(expenses);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async getTimeSeries(req: Request, res: Response) {
    try {
      const series = await ExpensesRepository.getTimeSeries();
      res.json(series);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async getWorkExpenses(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const expenses = await ExpensesRepository.getWorkExpenses(Number(id));
      res.json(expenses);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async syncTce(req: Request, res: Response) {
    const year = Number(req.body.year || 2024);
    try {
      const result = await syncTceObras(year);
      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async cleanup(req: Request, res: Response) {
    try {
      await ExpensesRepository.cleanup();
      res.json({ success: true, message: 'Dataset limpo com sucesso.' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async health(req: Request, res: Response) {
    try {
      const count = await ExpensesRepository.getHealth();
      res.json({ status: 'ok', rows: count });
    } catch (error: any) {
      res.status(500).json({ status: 'error', error: error.message });
    }
  }
};
