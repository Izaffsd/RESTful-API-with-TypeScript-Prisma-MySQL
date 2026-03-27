import { redis } from '../config/redis.js'
import { env } from '../config/env.js'
import logger from '../utils/logger.js'
import { sha256Hex } from './crypto.js'

const PREFIX = 'otp:email:'

function otpKey(normalizedEmail: string): string {
  return `${PREFIX}${normalizedEmail.toLowerCase().trim()}`
}

function hashOtp(emailNorm: string, code: string): string {
  const pepper = env.EMAIL_OTP_PEPPER || env.SUPABASE_SERVICE_KEY
  return sha256Hex(`${pepper}:${emailNorm}:${code.trim()}`)
}

export async function storeEmailVerifyOtp(emailNorm: string, code: string): Promise<void> {
  const key = otpKey(emailNorm)
  const ttl = env.EMAIL_OTP_TTL_SEC
  const value = hashOtp(emailNorm, code)
  try {
    await redis.set(key, value, { ex: ttl })
  } catch (e) {
    logger.warn({ err: (e as Error).message }, 'Redis storeEmailVerifyOtp failed')
    throw e
  }
}

export async function verifyAndConsumeEmailOtp(emailNorm: string, code: string): Promise<boolean> {
  const key = otpKey(emailNorm)
  const expected = hashOtp(emailNorm, code)
  try {
    const stored = await redis.get(key)
    if (typeof stored !== 'string' || stored !== expected) {
      return false
    }
    await redis.del(key)
    return true
  } catch (e) {
    logger.warn({ err: (e as Error).message }, 'Redis verifyAndConsumeEmailOtp failed')
    return false
  }
}
