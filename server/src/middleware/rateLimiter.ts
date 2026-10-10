import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';

const rateLimitStore = new Map<string, { attempts: number; resetAt: number }>();

export function createRateLimiter(options: { windowMs: number; maxAttempts: number; message?: string }) {
  const { windowMs, maxAttempts, message = 'Too many requests. Please try again later.' } = options;

  return (req: Request, _res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const record = rateLimitStore.get(ip);

    if (!record || now > record.resetAt) {
      rateLimitStore.set(ip, { attempts: 1, resetAt: now + windowMs });
      return next();
    }

    if (record.attempts >= maxAttempts) {
      return next(new AppError(message, 429, 'TOO_MANY_REQUESTS'));
    }

    record.attempts += 1;
    next();
  };
}
