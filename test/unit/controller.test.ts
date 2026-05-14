import { jest } from '@jest/globals';
import { ExpensesController } from '../../api/src/controllers/expenses-controller.js';
import { ExpensesRepository } from '../../api/src/repositories/expenses-repository.js';
import { Request, Response } from 'express';

describe('ExpensesController (Unit)', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockRequest = {
      params: {},
    };
    mockResponse = {
      json: jest.fn().mockReturnThis() as any,
      status: jest.fn().mockReturnThis() as any,
    };
    jest.clearAllMocks();
  });

  it('getSummary should return summary from repository', async () => {
    const mockSummary = { total_spent: 100 };
    jest.spyOn(ExpensesRepository, 'getSummary').mockResolvedValue(mockSummary);

    await ExpensesController.getSummary(mockRequest as Request, mockResponse as Response, () => {});

    expect(mockResponse.json).toHaveBeenCalledWith(mockSummary);
  });

  it('getSectors should return sectors from repository', async () => {
    const mockSectors = [{ name: 'A' }];
    jest.spyOn(ExpensesRepository, 'getSectors').mockResolvedValue(mockSectors);

    await ExpensesController.getSectors(mockRequest as Request, mockResponse as Response, () => {});

    expect(mockResponse.json).toHaveBeenCalledWith(mockSectors);
  });

  it('getCategories should return categories from repository', async () => {
    const mockCategories = [] as any[];
    jest.spyOn(ExpensesRepository, 'getCategories').mockResolvedValue(mockCategories);

    await ExpensesController.getCategories(mockRequest as Request, mockResponse as Response, () => {});

    expect(mockResponse.json).toHaveBeenCalledWith(mockCategories);
  });

  it('getMapData should return map data from repository', async () => {
    const mockData = [{ district: 'TEST' }];
    jest.spyOn(ExpensesRepository, 'getMapData').mockResolvedValue(mockData);

    await ExpensesController.getMapData(mockRequest as Request, mockResponse as Response, () => {});

    expect(mockResponse.json).toHaveBeenCalledWith(mockData);
  });

  it('getTopCompanies should return companies from repository', async () => {
    const mockData = [{ company_name: 'TEST' }];
    jest.spyOn(ExpensesRepository, 'getTopCompanies').mockResolvedValue(mockData);

    await ExpensesController.getTopCompanies(mockRequest as Request, mockResponse as Response, () => {});

    expect(mockResponse.json).toHaveBeenCalledWith(mockData);
  });

  it('getTopAgencies should return agencies from repository', async () => {
    const mockData = [{ agency: 'TEST' }];
    jest.spyOn(ExpensesRepository, 'getTopAgencies').mockResolvedValue(mockData);

    await ExpensesController.getTopAgencies(mockRequest as Request, mockResponse as Response, () => {});

    expect(mockResponse.json).toHaveBeenCalledWith(mockData);
  });

  it('getTopExpenses should return expenses from repository', async () => {
    const mockData = [{ description: 'TEST' }];
    jest.spyOn(ExpensesRepository, 'getTopExpenses').mockResolvedValue(mockData);

    await ExpensesController.getTopExpenses(mockRequest as Request, mockResponse as Response, () => {});

    expect(mockResponse.json).toHaveBeenCalledWith(mockData);
  });

  it('getTimeSeries should return series from repository', async () => {
    const mockData = [{ month: '2024-01' }];
    jest.spyOn(ExpensesRepository, 'getTimeSeries').mockResolvedValue(mockData);

    await ExpensesController.getTimeSeries(mockRequest as Request, mockResponse as Response, () => {});

    expect(mockResponse.json).toHaveBeenCalledWith(mockData);
  });

  it('getWorkExpenses should use ID from params', async () => {
    mockRequest.params = { id: '456' };
    const mockExpenses = [{ id: 1 }];
    jest.spyOn(ExpensesRepository, 'getWorkExpenses').mockResolvedValue(mockExpenses);

    await ExpensesController.getWorkExpenses(mockRequest as Request, mockResponse as Response, () => {});

    expect(ExpensesRepository.getWorkExpenses).toHaveBeenCalledWith(456);
    expect(mockResponse.json).toHaveBeenCalledWith(mockExpenses);
  });

  it('cleanup should call repository cleanup', async () => {
    jest.spyOn(ExpensesRepository, 'cleanup').mockResolvedValue({} as any);

    await ExpensesController.cleanup(mockRequest as Request, mockResponse as Response, () => {});

    expect(ExpensesRepository.cleanup).toHaveBeenCalled();
    expect(mockResponse.json).toHaveBeenCalledWith({ success: true, message: 'Dataset limpo com sucesso.' });
  });

  it('health should return ok and row count', async () => {
    jest.spyOn(ExpensesRepository, 'getHealth').mockResolvedValue(99);

    await ExpensesController.health(mockRequest as Request, mockResponse as Response, () => {});

    expect(mockResponse.json).toHaveBeenCalledWith({ status: 'ok', rows: 99 });
  });

  it('syncTceObras should return success even if it does nothing (deprecated)', async () => {
    await ExpensesController.syncTceObras(mockRequest as Request, mockResponse as Response, () => {});

    expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      message: expect.stringContaining('Modo Depreciado')
    }));
  });
});
