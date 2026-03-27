import { Ratelimit, type Duration } from '@upstash/ratelimit'
import { redis } from './redis.js'
import { env } from './env.js'

/**
 * Convert milliseconds to Upstash duration string
 * Example: 900000ms → "900 s"
 */
const toWindow = (ms: number): Duration =>
  `${Math.max(1, Math.floor(ms / 1000))} s` as Duration

/**
 * Limits login, signup, and OAuth attempts
 * Prevents brute force attacks
 * Example: max 10 attempts per 15 minutes per IP
 */
export const authLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(
    env.RATE_LIMIT_AUTH_MAX,          // max attempts
    toWindow(env.RATE_LIMIT_AUTH_WINDOW_MS) // per window
  ),
  prefix: 'rl:auth', // Redis key: rl:auth:<identifier>
})

/**
 * Limits "add new sign in method" prompt checks
 * Prevents email enumeration (checking if email exists)
 * Example: max 5 checks per 10 minutes per IP
 */
export const loginHintLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(
    env.RATE_LIMIT_LOGIN_HINT_MAX,
    toWindow(env.RATE_LIMIT_LOGIN_HINT_WINDOW_MS)
  ),
  prefix: 'rl:login-hint', // Redis key: rl:login-hint:<identifier>
})

/**
 * Limits general API requests
 * Prevents API abuse and scraping
 * Example: max 100 requests per minute per IP
 */
export const apiLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(
    env.RATE_LIMIT_API_MAX,
    toWindow(env.RATE_LIMIT_API_WINDOW_MS)
  ),
  prefix: 'rl:api', // Redis key: rl:api:<identifier>
})