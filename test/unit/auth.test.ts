import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import { requireAuth } from '../../api/src/middlewares/auth.js';
import { Request, Response, NextFunction } from 'express';

describe('Auth Middleware (Unit)', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction = jest.fn();
  const JWT_SECRET = 'test-secret';

  beforeEach(() => {
    mockRequest = {
      headers: {},
      query: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis() as any,
      json: jest.fn().mockReturnThis() as any,
    };
    process.env.JWT_SECRET = JWT_SECRET;
    jest.clearAllMocks();
  });

  it('should call next() if token is valid', () => {
    const token = jwt.sign({ id: 1 }, JWT_SECRET);
    mockRequest.headers = { authorization: `Bearer ${token}` };

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
    mockRequest.headers = { authorization: 'Bearer wrong-token' };

    requireAuth(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Token inválido ou expirado' });
  });

  it('should return 500 if JWT_SECRET is not configured', () => {
    delete process.env.JWT_SECRET;
    const token = jwt.sign({ id: 1 }, JWT_SECRET);
    mockRequest.headers = { authorization: `Bearer ${token}` };

    requireAuth(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Erro interno de configuração de segurança' });
  });
});
