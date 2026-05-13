import request from 'supertest';
import { app } from './index.js';
import { jest } from '@jest/globals';
import { ExpensesRepository } from './repositories/expenses-repository.js';

describe('API Endpoints', () => {
  describe('GET /health', () => {
    it('should return 200 and status ok', async () => {
      jest.spyOn(ExpensesRepository, 'getHealth').mockResolvedValue(100);

      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok', rows: 100 });
    });
  });

  describe('GET /api/summary', () => {
    it('should return summary data', async () => {
      const mockSummary = { total_spent: 1000, contracts_count: 5 };
      jest.spyOn(ExpensesRepository, 'getSummary').mockResolvedValue(mockSummary);

      const res = await request(app).get('/api/summary');

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockSummary);
    });
  });

  describe('POST /api/sync/cleanup', () => {
    it('should return 401 if unauthorized', async () => {
      const res = await request(app).post('/api/sync/cleanup');
      expect(res.status).toBe(401);
    });
  });
});

