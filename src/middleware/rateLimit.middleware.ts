import rateLimit from 'express-rate-limit'
import type { Request, Response } from 'express'
import { response } from '../utils/response.js'

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => response(res, 429, 'Too many requests, please try again later', null, 'RATE_LIMIT_429'),
})

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => response(res, 429, 'Too many requests, please try again later', null, 'RATE_LIMIT_429'),
})
