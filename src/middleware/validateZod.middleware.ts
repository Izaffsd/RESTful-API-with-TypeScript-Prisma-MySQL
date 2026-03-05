import type { Request, Response, NextFunction } from 'express';
import type { z } from 'zod';
import { response } from '../utils/response.js';

export function validateZod<T extends z.ZodType>(
  schema: T,
  source: 'body' | 'params' | 'query' = 'body'
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const data = req[source];
    const result = schema.safeParse(data);
    if (!result.success) {
      const first = result.error.issues[0];
      const field = first.path[0] ?? 'field';
      const errorCode = `INVALID_${String(field).toUpperCase()}_400`;
      response(res, 400, first.message, null, errorCode);
      return;
    }
    (req as unknown as Record<string, unknown>)[source] = result.data;
    next();
  };
}
