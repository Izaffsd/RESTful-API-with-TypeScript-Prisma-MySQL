import rateLimit from 'express-rate-limit'

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    statusCode: 429,
    success: false,
    message: 'Too many requests, please try again later',
    errorCode: 'RATE_LIMIT_429',
    timestamp: new Date().toISOString(),
    errors: [],
  },
})

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    statusCode: 429,
    success: false,
    message: 'Too many requests, please try again later',
    errorCode: 'RATE_LIMIT_429',
    timestamp: new Date().toISOString(),
    errors: [],
  },
})
