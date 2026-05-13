import { Request, Response, NextFunction } from 'express';
import pino from 'pino';

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true
    }
  }
});

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  logger.error({
    msg: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  }, 'Unhandled exception');

  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  
  res.status(statusCode).json({
    error: {
      message: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
}
