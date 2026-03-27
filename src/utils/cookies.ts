import type { Request, Response } from 'express'
import { env } from '../config/env.js'

/**
 * Host-only cookies on `localhost` are shared across ALL ports (3000, 4000, etc.).
 * A generic name like `refreshToken` is often overwritten by other local apps.
 */
export const REFRESH_TOKEN_COOKIE = 'fp_sb_refresh' as const

/** Old name — cleared whenever we set/clear session so poisoned values stop breaking refresh. */
const LEGACY_REFRESH_COOKIE = 'refreshToken'

/**
 * Supabase refresh tokens can include characters that break the Cookie header when stored raw
 * (e.g. `;` truncates the value). Store as base64url with a version prefix.
 */
const COOKIE_V2_PREFIX = 'v2.'

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
}

const clearOpts = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
}

function encodeRefreshForCookie(token: string): string {
  return `${COOKIE_V2_PREFIX}${Buffer.from(token, 'utf8').toString('base64url')}`
}

function decodeStoredRefreshToken(raw: string): string {
  const t = raw.trim()
  if (!t) return ''
  if (t.startsWith(COOKIE_V2_PREFIX)) {
    try {
      return Buffer.from(t.slice(COOKIE_V2_PREFIX.length), 'base64url').toString('utf8')
    } catch {
      return ''
    }
  }
  return t
}

export const setRefreshCookie = (res: Response, token: string): void => {
  res.clearCookie(LEGACY_REFRESH_COOKIE, clearOpts)
  if (!token) {
    res.clearCookie(REFRESH_TOKEN_COOKIE, clearOpts)
    return
  }
  res.cookie(REFRESH_TOKEN_COOKIE, encodeRefreshForCookie(token), COOKIE_OPTIONS)
}

export const clearRefreshCookie = (res: Response): void => {
  res.clearCookie(REFRESH_TOKEN_COOKIE, clearOpts)
  res.clearCookie(LEGACY_REFRESH_COOKIE, clearOpts)
}

export function readRefreshTokenFromRequest(req: Request): string {
  const fromCookie = req.cookies?.[REFRESH_TOKEN_COOKIE] ?? req.cookies?.[LEGACY_REFRESH_COOKIE]
  if (typeof fromCookie === 'string' && fromCookie.trim()) {
    return decodeStoredRefreshToken(fromCookie)
  }
  const fromBody = (req.body as { refreshToken?: string })?.refreshToken
  return typeof fromBody === 'string' ? fromBody.trim() : ''
}
