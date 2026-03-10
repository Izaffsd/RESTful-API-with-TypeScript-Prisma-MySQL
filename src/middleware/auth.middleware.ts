import type { Request, Response, NextFunction } from 'express'
import { AppError } from '../utils/AppError.js'
import * as tokenService from '../services/token.service.js'
import type { UserType } from '@prisma/client'

export const authenticate = async (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED_401')
  }

  const token = header.slice(7)

  const blacklisted = await tokenService.isTokenBlacklisted(token)
  if (blacklisted) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED_401')
  }

  try {
    const payload = tokenService.verifyAccessToken(token)
    req.user = payload
    next()
  } catch {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED_401')
  }
}

export const authorize = (...roles: UserType[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED_401')
    }
    if (!roles.includes(req.user.type as UserType)) {
      throw new AppError('You do not have permission to perform this action', 403, 'FORBIDDEN_403')
    }
    next()
  }
}

export const requireVerifiedEmail = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user?.isEmailVerified) {
    throw new AppError('Please verify your email first', 403, 'EMAIL_NOT_VERIFIED_403')
  }
  next()
}
