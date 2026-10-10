import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';
import { ZodError } from 'zod';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message, details: err.details }
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(422).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request payload validation failed',
        details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))
      }
    });
    return;
  }

  console.error('[Unhandled Error]', err);
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected internal error occurred' }
  });
}
