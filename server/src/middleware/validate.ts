import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { ValidationError } from '../utils/errors.js';

export function validate(schema: { body?: AnyZodObject; query?: AnyZodObject; params?: AnyZodObject }) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schema.body) req.body = await schema.body.parseAsync(req.body);
      if (schema.query) req.query = (await schema.query.parseAsync(req.query)) as Request['query'];
      if (schema.params) req.params = (await schema.params.parseAsync(req.params)) as Request['params'];
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(new ValidationError('Invalid request input data', error.issues));
      } else {
        next(error);
      }
    }
  };
}
