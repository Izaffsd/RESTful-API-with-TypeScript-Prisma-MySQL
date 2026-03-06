import type { Request, Response, NextFunction } from 'express'
import type { z } from 'zod'
import { response } from '../utils/response.js'

export function validateZod<T extends z.ZodType>(
  schema: T,
  source: 'body' | 'params' | 'query' = 'body'
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const data = req[source] // source = { validatedData }
    const result = schema.safeParse(data) // zod check status result = { success and data or fail and list error }

    if (!result.success) {
      const first = result.error.issues[0] // issues = ZodError custom format
      const field = first.path[0] ?? 'field' // path: ["email"]
      const errorCode = `INVALID_${String(field).toUpperCase()}_400`
      response(res, 400, first.message, null, errorCode)
      return
    }
    req[source] = result.data
    next()
  }
}
