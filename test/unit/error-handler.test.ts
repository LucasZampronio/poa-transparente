import { jest } from '@jest/globals';
import { errorHandler } from '../../api/src/middlewares/error-handler.js';
import { Request, Response, NextFunction } from 'express';

describe('Error Handler Middleware (Unit)', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction = jest.fn();

  beforeEach(() => {
    mockRequest = {
      path: '/test',
      method: 'GET',
    };
    mockResponse = {
      status: jest.fn().mockReturnThis() as any,
      json: jest.fn().mockReturnThis() as any,
      statusCode: 200, // Default Express value
    };
    jest.clearAllMocks();
  });

  it('should return 500 if no status code is set', () => {
    const error = new Error('Test Error');
    errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({
        message: 'Test Error'
      })
    }));
  });

  it('should return custom status code if set on response', () => {
    const error = new Error('Not Found');
    mockResponse.statusCode = 404;
    errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(404);
  });
});
