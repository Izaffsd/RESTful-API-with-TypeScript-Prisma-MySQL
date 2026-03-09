import type { Request, Response, NextFunction } from 'express'
import crypto from 'node:crypto'

export const requestId = (_req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('x-request-id', crypto.randomUUID())
  next()
}
