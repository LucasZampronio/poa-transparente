import { jest } from '@jest/globals';
import { ExpensesRepository } from '../../api/src/repositories/expenses-repository.js';
import { pool } from '../../api/src/db.js';

describe('ExpensesRepository (Unit)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getSummary should return the first row of query result', async () => {
    const mockRow = { total_spent: 1000, contracts_count: 5, companies_count: 2, agencies_count: 1 };
    jest.spyOn(pool, 'query').mockResolvedValue({ rows: [mockRow] } as any);

    const result = await ExpensesRepository.getSummary();

    expect(pool.query).toHaveBeenCalled();
    expect(result).toEqual(mockRow);
  });

  it('getSectors should return all rows from sectors query', async () => {
    const mockRows = [{ name: 'CENTRO', count: 10, total: 5000 }];
    jest.spyOn(pool, 'query').mockResolvedValue({ rows: mockRows } as any);

    const result = await ExpensesRepository.getSectors();

    expect(result).toEqual(mockRows);
  });

  it('getCategories should return an empty array (deprecated)', async () => {
    const result = await ExpensesRepository.getCategories();
    expect(result).toEqual([]);
  });

  it('getMapData should return rows from map query', async () => {
    const mockRows = [{ district: 'TEST' }];
    jest.spyOn(pool, 'query').mockResolvedValue({ rows: mockRows } as any);

    const result = await ExpensesRepository.getMapData();

    expect(result).toEqual(mockRows);
  });

  it('getTopCompanies should return top 10 companies', async () => {
    const mockRows = [{ company_name: 'EMPRESA A', total_received: 1000 }];
    jest.spyOn(pool, 'query').mockResolvedValue({ rows: mockRows } as any);

    const result = await ExpensesRepository.getTopCompanies();

    expect(result).toEqual(mockRows);
  });

  it('getTopAgencies should return top agencies', async () => {
    const mockRows = [{ agency: 'SEC SAUDE', total_spent: 2000 }];
    jest.spyOn(pool, 'query').mockResolvedValue({ rows: mockRows } as any);

    const result = await ExpensesRepository.getTopAgencies();

    expect(result).toEqual(mockRows);
  });

  it('getTopExpenses should return top expenses with total_spent mapped', async () => {
    const mockRows = [{ description: 'OBRA 1', amount: 500 }];
    jest.spyOn(pool, 'query').mockResolvedValue({ rows: mockRows } as any);

    const result = await ExpensesRepository.getTopExpenses();

    expect(result).toEqual([
      { description: 'OBRA 1', amount: 500, total_spent: 500 }
    ]);
  });

  it('getTimeSeries should return series data', async () => {
    const mockRows = [{ month: '2024-01', total_spent: 3000 }];
    jest.spyOn(pool, 'query').mockResolvedValue({ rows: mockRows } as any);

    const result = await ExpensesRepository.getTimeSeries();

    expect(result).toEqual(mockRows);
  });

  it('getWorkExpenses should call query with workId', async () => {
    const workId = 123;
    const mockRows = [{ num_empenho: '1/2024' }];
    jest.spyOn(pool, 'query').mockResolvedValue({ rows: mockRows } as any);

    const result = await ExpensesRepository.getWorkExpenses(workId);

    expect(pool.query).toHaveBeenCalledWith(expect.any(String), [workId]);
    expect(result).toEqual(mockRows);
  });

  it('getHealth should return row count as number', async () => {
    jest.spyOn(pool, 'query').mockResolvedValue({ rows: [{ total: '42' }] } as any);

    const result = await ExpensesRepository.getHealth();

    expect(result).toBe(42);
  });
});
