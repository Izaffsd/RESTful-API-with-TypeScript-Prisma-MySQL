import type { Request, Response, NextFunction } from 'express'
import crypto from 'node:crypto'

/**
 * Runs before pino-http. Sets req.id so request logs include the same id;
 * echoes id on the response (and req.headers) for tracing client ↔ server ↔ logs.
 */
export const requestId = (req: Request, res: Response, next: NextFunction): void => {
  const incoming = req.get('x-request-id')?.trim()
  const id = incoming && incoming.length > 0 ? incoming : crypto.randomUUID()
  req.id = id
  res.setHeader('x-request-id', id)
  req.headers['x-request-id'] = id
  next()
}
