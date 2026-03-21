import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Express middleware factory that validates req.body against a Zod schema.
 * On failure, returns 400 with structured validation errors.
 */
export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          issues: err.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
          })),
        });
        return;
      }
      next(err);
    }
  };
}
