import type { Request, Response, NextFunction } from 'express'
import type { Ratelimit } from '@upstash/ratelimit'
import { authLimiter, loginHintLimiter, apiLimiter } from '../config/ratelimit.js'
import { response } from '../utils/response.js'

const getIdentifier = (req: Request): string =>
  (typeof req.headers['x-forwarded-for'] === 'string'
    ? req.headers['x-forwarded-for'].split(',')[0]?.trim()
    : undefined) ??
  req.ip ??
  'unknown'

const createRateLimitMiddleware = (limiter: Ratelimit, message = 'Too many requests, please try again later') =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { success, limit, remaining, reset, pending } = await limiter.limit(getIdentifier(req))
      void pending

      res.setHeader('RateLimit-Limit', String(limit))
      res.setHeader('RateLimit-Remaining', String(remaining))
      res.setHeader('RateLimit-Reset', new Date(reset).toISOString())

      if (!success) {
        response(res, 429, message, null, 'RATE_LIMIT_429')
        return
      }
      next()
    } catch {
      next()
    }
  }

export const authRateLimit = createRateLimitMiddleware(
  authLimiter,
  'Too many attempts, please try again in 15 minutes',
)

export const loginHintRateLimit = createRateLimitMiddleware(loginHintLimiter, 'Too many requests')

export const apiRateLimit = createRateLimitMiddleware(
  apiLimiter,
  'Too many requests, please try again later',
)
