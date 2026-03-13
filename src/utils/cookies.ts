import type { Response } from 'express'
import { env } from '../config/env.js'

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
}

export const setRefreshCookie = (res: Response, token: string): void => {
  res.cookie('refreshToken', token, COOKIE_OPTIONS)
}

export const clearRefreshCookie = (res: Response): void => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  })
}
