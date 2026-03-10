import jwt from 'jsonwebtoken'
import type { Response } from 'express'
import { env } from '../config/env.js'
import prisma from '../config/db.js'

export type TokenPayload = {
  userId: string
  email: string
  name: string
  type: 'STUDENT' | 'LECTURER' | 'HEAD_LECTURER'
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
  isEmailVerified: boolean
}

export const signAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRES as jwt.SignOptions['expiresIn'] })
}

export const signRefreshToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES as jwt.SignOptions['expiresIn'] })
}

export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenPayload
}

export const verifyRefreshToken = (token: string): TokenPayload => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as TokenPayload
}

export const blacklistToken = async (token: string, expiresAt: Date) => {
  return prisma.tokenBlacklist.create({ data: { token, expiresAt } })
}

export const isTokenBlacklisted = async (token: string): Promise<boolean> => {
  const entry = await prisma.tokenBlacklist.findUnique({ where: { token } })
  return !!entry
}

export const setRefreshCookie = (res: Response, token: string) => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  })
}

export const clearRefreshCookie = (res: Response) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  })
}

export const buildTokenPayload = (user: {
  userId: string
  email: string
  name: string
  type: 'STUDENT' | 'LECTURER' | 'HEAD_LECTURER'
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
  isEmailVerified: boolean
}): TokenPayload => ({
  userId: user.userId,
  email: user.email,
  name: user.name,
  type: user.type,
  status: user.status,
  isEmailVerified: user.isEmailVerified,
})
