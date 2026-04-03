import type { Request, Response, NextFunction } from 'express'
import type { z } from 'zod'
import { response } from '../utils/response.js'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- Express.Request augmentation
  namespace Express {
    interface Request {
      validated: {
        body?: unknown
        params?: unknown
        query?: unknown
      }
    }
  }
}

export const validateZod = <T extends z.ZodType>(
  schema: T,
  source: 'body' | 'params' | 'query' = 'body',
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source])

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: String(issue.path[0] ?? 'field'),
        message: issue.message,
      }))
      response(res, 400, 'Validation failed', null, 'VALIDATION_ERROR_400', errors)
      return
    }

    req.validated ??= {}
    req.validated[source] = result.data
    next()
  }
}
