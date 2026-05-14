import { jest } from '@jest/globals';
import { requireAuth } from '../../api/src/middlewares/auth.js';
import { Request, Response, NextFunction } from 'express';

describe('Auth Middleware (Unit)', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction = jest.fn();

  beforeEach(() => {
    mockRequest = {
      headers: {},
      query: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis() as any,
      json: jest.fn().mockReturnThis() as any,
    };
    jest.clearAllMocks();
  });

  it('should call next() if token matches CONECTA_GOV_TOKEN with Bearer prefix', () => {
    process.env.CONECTA_GOV_TOKEN = 'valid-token';
    mockRequest.headers = { authorization: 'Bearer valid-token' };

    requireAuth(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(nextFunction).toHaveBeenCalled();
  });

  it('should return 401 if no authorization header is provided', () => {
    requireAuth(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Token de autenticação não fornecido' });
  });

  it('should return 401 if token does not start with Bearer', () => {
    mockRequest.headers = { authorization: 'valid-token' };
    requireAuth(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
  });

  it('should return 403 if token is invalid', () => {
    process.env.CONECTA_GOV_TOKEN = 'secret-token';
    mockRequest.headers = { authorization: 'Bearer wrong-token' };

    requireAuth(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Token inválido ou expirado' });
  });
});
