import { redis } from '../config/redis.js'
import { env } from '../config/env.js'
import logger from '../utils/logger.js'
import { sha256Hex } from './crypto.js'

const RT_PREFIX = 'rtfp:'
const USER_SET_PREFIX = 'rt_user:'

function rtKey(hash: string): string {
  return `${RT_PREFIX}${hash}`
}

function userSetKey(userId: string): string {
  return `${USER_SET_PREFIX}${userId}`
}

function hashRefresh(refreshToken: string): string {
  return sha256Hex(refreshToken)
}

export async function registerRefreshTokenFingerprint(refreshToken: string, userId: string): Promise<void> {
  const h = hashRefresh(refreshToken)
  const ex = env.REDIS_REFRESH_FP_TTL_SEC
  try {
    await redis.set(rtKey(h), userId, { ex })
    await redis.sadd(userSetKey(userId), h)
    await redis.expire(userSetKey(userId), ex)
  } catch (e) {
    logger.warn({ err: (e as Error).message, userId }, 'Redis registerRefreshTokenFingerprint failed (fail-open)')
  }
}

/** User id if this refresh token is tracked in Redis; null if not yet registered (e.g. pre-migration session). */
export async function getUserIdForActiveRefresh(refreshToken: string): Promise<string | null> {
  const h = hashRefresh(refreshToken)
  try {
    const stored = await redis.get(rtKey(h))
    return typeof stored === 'string' && stored.length > 0 ? stored : null
  } catch (e) {
    logger.warn({ err: (e as Error).message }, 'Redis getUserIdForActiveRefresh failed (fail-open)')
    return null
  }
}

export async function finalizeRefreshRotation(
  oldRefreshToken: string,
  newRefreshToken: string,
  userId: string,
): Promise<void> {
  const oldH = hashRefresh(oldRefreshToken)
  const newH = hashRefresh(newRefreshToken)
  const ex = env.REDIS_REFRESH_FP_TTL_SEC
  const setKey = userSetKey(userId)
  try {
    await redis.del(rtKey(oldH))
    await redis.srem(setKey, oldH)
    await redis.set(rtKey(newH), userId, { ex })
    await redis.sadd(setKey, newH)
    await redis.expire(setKey, ex)
  } catch (e) {
    logger.warn({ err: (e as Error).message, userId }, 'Redis finalizeRefreshRotation failed')
  }
}

export async function revokeRefreshTokenFingerprint(refreshToken: string, userId: string): Promise<void> {
  const h = hashRefresh(refreshToken)
  const setKey = userSetKey(userId)
  try {
    await redis.del(rtKey(h))
    await redis.srem(setKey, h)
  } catch (e) {
    logger.warn({ err: (e as Error).message, userId }, 'Redis revokeRefreshTokenFingerprint failed')
  }
}

/** Invalidate all tracked refresh fingerprints except the one from the current browser session. */
export async function revokeOtherRefreshFingerprints(userId: string, keepRefreshToken: string): Promise<void> {
  const keepH = hashRefresh(keepRefreshToken)
  const setKey = userSetKey(userId)
  try {
    const members = (await redis.smembers(setKey)) as string[]
    for (const m of members) {
      if (m === keepH) continue
      await redis.del(rtKey(m))
      await redis.srem(setKey, m)
    }
  } catch (e) {
    logger.warn({ err: (e as Error).message, userId }, 'Redis revokeOtherRefreshFingerprints failed')
  }
}
