import { Request, Response } from 'express';
import { ExpensesRepository } from '../repositories/expenses-repository.js';
import { asyncHandler } from '../utils/async-handler.js';

export const ExpensesController = {
  getSummary: asyncHandler(async (req: Request, res: Response) => {
    const summary = await ExpensesRepository.getSummary();
    res.json(summary);
  }),

  getSectors: asyncHandler(async (req: Request, res: Response) => {
    const sectors = await ExpensesRepository.getSectors();
    res.json(sectors);
  }),

  getCategories: asyncHandler(async (req: Request, res: Response) => {
    const categories = await ExpensesRepository.getCategories();
    res.json(categories);
  }),

  getMapData: asyncHandler(async (req: Request, res: Response) => {
    const data = await ExpensesRepository.getMapData();
    res.json(data);
  }),

  getTopCompanies: asyncHandler(async (req: Request, res: Response) => {
    const companies = await ExpensesRepository.getTopCompanies();
    res.json(companies);
  }),

  getTopAgencies: asyncHandler(async (req: Request, res: Response) => {
    const agencies = await ExpensesRepository.getTopAgencies();
    res.json(agencies);
  }),

  getTopExpenses: asyncHandler(async (req: Request, res: Response) => {
    const expenses = await ExpensesRepository.getTopExpenses();
    res.json(expenses);
  }),

  getTimeSeries: asyncHandler(async (req: Request, res: Response) => {
    const series = await ExpensesRepository.getTimeSeries();
    res.json(series);
  }),

  getWorkExpenses: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const expenses = await ExpensesRepository.getWorkExpenses(Number(id));
    res.json(expenses);
  }),

  cleanup: asyncHandler(async (req: Request, res: Response) => {
    await ExpensesRepository.cleanup();
    res.json({ success: true, message: 'Dataset limpo com sucesso.' });
  }),

  health: asyncHandler(async (req: Request, res: Response) => {
    const count = await ExpensesRepository.getHealth();
    res.json({ status: 'ok', rows: count });
  })
};
