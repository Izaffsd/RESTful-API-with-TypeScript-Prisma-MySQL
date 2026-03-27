import crypto from 'node:crypto'
import { redis } from '../config/redis.js'
import { env } from '../config/env.js'
import logger from '../utils/logger.js'
import { sha256Hex } from './crypto.js'

const PREFIX = 'pwdreset:'

function keyForRawToken(rawToken: string): string {
  return `${PREFIX}${sha256Hex(rawToken)}`
}

export function generatePasswordResetRawToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export async function storePasswordResetToken(rawToken: string, userId: string): Promise<void> {
  const ttl = env.PASSWORD_RESET_TTL_SEC
  try {
    await redis.set(keyForRawToken(rawToken), userId, { ex: ttl })
  } catch (e) {
    logger.warn({ err: (e as Error).message }, 'Redis storePasswordResetToken failed')
    throw e
  }
}

export async function consumePasswordResetToken(rawToken: string): Promise<string | null> {
  const key = keyForRawToken(rawToken)
  try {
    const userId = await redis.get(key)
    if (typeof userId !== 'string' || !userId) {
      return null
    }
    await redis.del(key)
    return userId
  } catch (e) {
    logger.warn({ err: (e as Error).message }, 'Redis consumePasswordResetToken failed')
    return null
  }
}
