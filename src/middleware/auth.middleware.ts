import type { Request, Response, NextFunction } from 'express'
import { AppError } from '../utils/AppError.js'
import { supabase } from '../config/supabase.js'
import prisma from '../config/db.js'
import type { UserType } from '@prisma/client'
import { isAccessTokenBlacklisted } from '../redis/accessTokenBlacklist.js'

export const authenticate = async (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED_401')
  }

  const token = header.slice(7)

  if (await isAccessTokenBlacklisted(token)) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED_401')
  }

  const { data: { user: authUser }, error } = await supabase.auth.getUser(token)
  if (error || !authUser) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED_401')
  }

  const nameFromAuth = (authUser.user_metadata?.name as string) ?? null

  let dbUser = await prisma.user.findUnique({
    where: { userId: authUser.id },
    select: { type: true, status: true, deletedAt: true, name: true },
  })

  if (!dbUser) {
    dbUser = await prisma.user.upsert({
      where: { userId: authUser.id },
      create: { userId: authUser.id, type: 'STUDENT', status: 'ACTIVE', name: nameFromAuth },
      update: {},
      select: { type: true, status: true, deletedAt: true, name: true },
    })
  }

  if (dbUser.deletedAt) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED_401')
  }

  if (dbUser.status !== 'ACTIVE') {
    throw new AppError('Account is not active', 403, 'ACCOUNT_INACTIVE_403')
  }

  // Prisma is the source of truth for display name.
  if (!dbUser.name && nameFromAuth) {
    await prisma.user.update({
      where: { userId: authUser.id },
      data: { name: nameFromAuth },
    })
  }

  const name = dbUser.name ?? nameFromAuth ?? null
  req.user = {
    userId: authUser.id,
    email: authUser.email ?? '',
    name,
    type: dbUser.type as UserType,
    status: dbUser.status,
    isEmailVerified: !!authUser.email_confirmed_at,
  }
  next()
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
