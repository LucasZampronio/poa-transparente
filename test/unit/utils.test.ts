import { jest } from '@jest/globals';
import { asyncHandler } from '../../api/src/utils/async-handler.js';
import { fetchWithTimeout } from '../../api/src/utils/fetch-with-timeout.js';
import { pool } from '../../api/src/db.js';
import { Request, Response } from 'express';

describe('Utils Unit Tests', () => {
  describe('asyncHandler', () => {
    it('should catch errors and call next', async () => {
      const error = new Error('Async Error');
      const fn = jest.fn().mockRejectedValue(error);
      const next = jest.fn();
      const handler = asyncHandler(fn as any);

      await handler({} as Request, {} as Response, next);
      
      // Since it's a promise, we need to wait for the catch
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('fetchWithTimeout', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should fetch successfully', async () => {
      const mockResponse = { ok: true };
      jest.spyOn(global, 'fetch').mockResolvedValue(mockResponse as any);

      const res = await fetchWithTimeout('http://test.com');
      expect(res).toBe(mockResponse);
    });

    it('should handle fetch errors', async () => {
      const error = new Error('Fetch Error');
      jest.spyOn(global, 'fetch').mockRejectedValue(error);

      await expect(fetchWithTimeout('http://test.com')).rejects.toThrow('Fetch Error');
    });

    it('should timeout', async () => {
      jest.useFakeTimers();
      
      // Mock fetch to reject when the signal is aborted
      const mockFetch = jest.fn().mockImplementation((url, options) => {
        return new Promise((resolve, reject) => {
          if (options?.signal) {
            options.signal.addEventListener('abort', () => {
              reject(new Error('Aborted'));
            });
          }
        });
      });
      jest.spyOn(global, 'fetch').mockImplementation(mockFetch as any);

      const promise = fetchWithTimeout('http://test.com', {}, 100);
      
      // Advance timers and wait for the promise to reject
      jest.advanceTimersByTime(101);
      
      await expect(promise).rejects.toThrow('Aborted');
      jest.useRealTimers();
    });
  });

  describe('db pool', () => {
    it('should log pool errors', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Pool Error');
      
      // Trigger the error event
      pool.emit('error', error);
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Erro inesperado no pool de conexões'), error);
      consoleSpy.mockRestore();
    });
  });
});
