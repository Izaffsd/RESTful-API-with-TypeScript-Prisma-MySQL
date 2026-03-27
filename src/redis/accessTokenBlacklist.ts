import { redis } from '../config/redis.js'
import { env } from '../config/env.js'
import logger from '../utils/logger.js'
import { sha256Hex } from './crypto.js'

const PREFIX = 'bl:at:'

function accessTokenExpSeconds(token: string): number | null {
  try {
    const part = token.split('.')[1]
    if (!part) return null
    const payload = JSON.parse(Buffer.from(part, 'base64url').toString('utf8')) as { exp?: number }
    return typeof payload.exp === 'number' ? payload.exp : null
  } catch {
    return null
  }
}

export function accessTokenBlacklistTtlSec(token: string): number {
  const exp = accessTokenExpSeconds(token)
  if (exp == null) return env.REDIS_ACCESS_BLACKLIST_FALLBACK_TTL_SEC
  const now = Math.floor(Date.now() / 1000)
  return Math.max(1, exp - now)
}

export async function blacklistAccessToken(token: string): Promise<void> {
  const key = `${PREFIX}${sha256Hex(token)}`
  const ttl = accessTokenBlacklistTtlSec(token)
  try {
    await redis.set(key, '1', { ex: ttl })
  } catch (e) {
    logger.warn({ err: (e as Error).message }, 'Redis blacklistAccessToken failed (fail-open)')
  }
}

/** Returns true if token must be rejected. On Redis errors, returns false (fail-open). */
export async function isAccessTokenBlacklisted(token: string): Promise<boolean> {
  const key = `${PREFIX}${sha256Hex(token)}`
  try {
    const v = await redis.get(key)
    return v != null
  } catch (e) {
    logger.warn({ err: (e as Error).message }, 'Redis isAccessTokenBlacklisted failed (fail-open)')
    return false
  }
}
