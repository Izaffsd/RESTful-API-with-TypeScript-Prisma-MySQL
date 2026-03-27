import { redis } from '../config/redis.js'
import { env } from '../config/env.js'
import logger from '../utils/logger.js'
import { sha256Hex } from './crypto.js'

const PREFIX = 'signedurl:'

function cacheKey(bucket: string, storagePath: string, ttlSec: number): string {
  return `${PREFIX}${sha256Hex(`${bucket}:${storagePath}:${ttlSec}`)}`
}

/**
 * Caches signed URLs slightly shorter than their validity window to avoid serving expired links.
 */
export async function getCachedSignedUrl(
  bucket: string,
  storagePath: string,
  signedUrlTtlSec: number,
  createSignedUrl: () => Promise<string | null>,
): Promise<string | null> {
  const cacheTtl = Math.min(env.REDIS_SIGNED_URL_CACHE_TTL_SEC, Math.max(1, signedUrlTtlSec - 60))
  const key = cacheKey(bucket, storagePath, signedUrlTtlSec)
  try {
    const hit = await redis.get(key)
    if (typeof hit === 'string' && hit.length > 0) {
      return hit
    }
  } catch (e) {
    logger.warn({ err: (e as Error).message }, 'Redis signed URL get failed (fail-open)')
  }

  const url = await createSignedUrl()
  if (!url) return null

  try {
    await redis.set(key, url, { ex: cacheTtl })
  } catch (e) {
    logger.warn({ err: (e as Error).message }, 'Redis signed URL set failed')
  }
  return url
}
