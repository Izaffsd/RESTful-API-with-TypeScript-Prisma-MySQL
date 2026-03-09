import bcrypt from 'bcrypt'
import crypto from 'node:crypto'
import prisma from '../config/db.js'
import { env } from '../config/env.js'
import { AppError } from '../utils/AppError.js'
import * as tokenService from './token.service.js'
import * as emailService from './email.service.js'
import logger from '../utils/logger.js'
import type { UserType, Gender, Race, State } from '@prisma/client'

const SALT_ROUNDS = 12
const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_MINUTES = 15
const VERIFY_TOKEN_HOURS = 24
const RESET_TOKEN_HOURS = 1

const userInclude = {
  profile: true,
  student: { include: { course: true } },
  lecturer: { include: { course: true } },
  headLecturer: true,
} as const

const userSelect = {
  userId: true,
  email: true,
  name: true,
  type: true,
  status: true,
  isEmailVerified: true,
  emailVerifiedAt: true,
  lastLoginAt: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
  ...userInclude,
} as const

function formatUserResponse(user: Record<string, unknown>) {
  const profile = user.profile as Record<string, unknown> | null
  let formattedProfile = null
  if (profile) {
    formattedProfile = {
      profileId: profile.profileId,
      phoneNumber: profile.phoneNumber,
      gender: profile.gender,
      race: profile.race,
      dateOfBirth: profile.dateOfBirth,
      address: {
        streetOne: profile.streetOne,
        streetTwo: profile.streetTwo,
        postcode: profile.postcode,
        city: profile.city,
        state: profile.state,
      },
    }
  }
  return {
    userId: user.userId,
    email: user.email,
    name: user.name,
    type: user.type,
    status: user.status,
    isEmailVerified: user.isEmailVerified,
    emailVerifiedAt: user.emailVerifiedAt,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    profile: formattedProfile,
    student: user.student ?? null,
    lecturer: user.lecturer ?? null,
    headLecturer: user.headLecturer ?? null,
  }
}

export const register = async (data: {
  name: string
  email: string
  password: string
  studentNumber?: string
}) => {
  const existing = await prisma.user.findUnique({ where: { email: data.email } })
  if (existing) {
    throw new AppError('Email already registered', 409, 'DUPLICATE_EMAIL_409')
  }

  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS)
  const emailVerifyToken = crypto.randomUUID()
  const emailVerifyExpiry = new Date(Date.now() + VERIFY_TOKEN_HOURS * 60 * 60 * 1000)

  let type: UserType = 'STUDENT'
  if (data.studentNumber) {
    type = 'STUDENT'
  }

  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        email: data.email,
        passwordHash,
        name: data.name,
        type,
        emailVerifyToken,
        emailVerifyExpiry,
      },
    })

    if (type === 'STUDENT' && data.studentNumber) {
      const prefix = data.studentNumber.match(/^([A-Z]{2,4})/)?.[1]
      if (!prefix) {
        throw new AppError('Invalid student number format', 400, 'INVALID_STUDENT_NUMBER_400')
      }
      const course = await tx.course.findUnique({ where: { courseCode: prefix } })
      if (!course) {
        throw new AppError('Course not found for student number prefix', 404, 'COURSE_NOT_FOUND_404')
      }
      await tx.student.create({
        data: {
          studentNumber: data.studentNumber,
          courseId: course.courseId,
          userId: newUser.userId,
        },
      })
    }

    return newUser
  })

  try {
    await emailService.sendVerificationEmail(user.email, user.name, emailVerifyToken)
  } catch (err) {
    if (env.NODE_ENV === 'development') {
      logger.warn('[DEV] Verification email failed; check logs above for the verification URL:', (err as Error).message)
      // Registration still succeeds; user can verify via the URL already logged
    } else {
      throw err
    }
  }

  return { email: user.email, name: user.name }
}

export const login = async (data: { email: string; password: string }) => {
  const user = await prisma.user.findUnique({
    where: { email: data.email },
    select: { ...userSelect, passwordHash: true, failedLoginAttempts: true, lockedUntil: true },
  })

  if (!user || user.deletedAt) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS_401')
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new AppError(
      `Account locked due to too many failed attempts. Try again in ${LOCKOUT_MINUTES} minutes.`,
      423,
      'ACCOUNT_LOCKED_423',
    )
  }

  const valid = await bcrypt.compare(data.password, user.passwordHash)
  if (!valid) {
    const attempts = user.failedLoginAttempts + 1
    const updateData: Record<string, unknown> = { failedLoginAttempts: attempts }
    if (attempts >= MAX_FAILED_ATTEMPTS) {
      updateData.lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
    }
    await prisma.user.update({ where: { userId: user.userId }, data: updateData })
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS_401')
  }

  if (!user.isEmailVerified) {
    throw new AppError('Please verify your email first', 403, 'EMAIL_NOT_VERIFIED_403')
  }

  if (user.status !== 'ACTIVE') {
    throw new AppError('Account is not active', 403, 'ACCOUNT_INACTIVE_403')
  }

  const payload = tokenService.buildTokenPayload(user)
  const accessToken = tokenService.signAccessToken(payload)
  const refreshToken = tokenService.signRefreshToken(payload)

  await prisma.user.update({
    where: { userId: user.userId },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
      refreshToken,
      refreshTokenExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  })

  const { passwordHash: _ph, failedLoginAttempts: _fa, lockedUntil: _lu, ...safeUser } = user
  return { accessToken, refreshToken, user: formatUserResponse(safeUser as Record<string, unknown>) }
}

export const refreshTokens = async (oldRefreshToken: string) => {
  let payload: tokenService.TokenPayload
  try {
    payload = tokenService.verifyRefreshToken(oldRefreshToken)
  } catch {
    throw new AppError('Invalid refresh token', 401, 'UNAUTHORIZED_401')
  }

  const user = await prisma.user.findUnique({ where: { userId: payload.userId } })
  if (!user || user.refreshToken !== oldRefreshToken) {
    throw new AppError('Invalid refresh token', 401, 'UNAUTHORIZED_401')
  }

  const newPayload = tokenService.buildTokenPayload(user)
  const accessToken = tokenService.signAccessToken(newPayload)

  return { accessToken }
}

export const logout = async (userId: string, accessToken: string) => {
  try {
    const decoded = tokenService.verifyAccessToken(accessToken)
    const exp = (decoded as unknown as { exp: number }).exp
    await tokenService.blacklistToken(accessToken, new Date(exp * 1000))
  } catch {
    // token already invalid — still clear refresh
  }

  await prisma.user.update({
    where: { userId },
    data: { refreshToken: null, refreshTokenExpiry: null },
  })
}

export const verifyEmail = async (token: string) => {
  const user = await prisma.user.findUnique({ where: { emailVerifyToken: token } })
  if (!user || !user.emailVerifyExpiry || user.emailVerifyExpiry < new Date()) {
    throw new AppError('Invalid or expired verification token', 400, 'INVALID_TOKEN_400')
  }

  const updated = await prisma.user.update({
    where: { userId: user.userId },
    data: {
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
      emailVerifyToken: null,
      emailVerifyExpiry: null,
    },
    select: userSelect,
  })

  await emailService.sendWelcomeEmail(updated.email, updated.name)

  const payload = tokenService.buildTokenPayload(updated)
  const accessToken = tokenService.signAccessToken(payload)
  const refreshToken = tokenService.signRefreshToken(payload)

  await prisma.user.update({
    where: { userId: updated.userId },
    data: { refreshToken, refreshTokenExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  })

  return { accessToken, refreshToken, user: formatUserResponse(updated as unknown as Record<string, unknown>) }
}

export const resendVerification = async (email: string) => {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || user.isEmailVerified) return

  const emailVerifyToken = crypto.randomUUID()
  const emailVerifyExpiry = new Date(Date.now() + VERIFY_TOKEN_HOURS * 60 * 60 * 1000)

  await prisma.user.update({
    where: { userId: user.userId },
    data: { emailVerifyToken, emailVerifyExpiry },
  })

  await emailService.sendVerificationEmail(user.email, user.name, emailVerifyToken)
}

export const forgotPassword = async (email: string) => {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return

  const passwordResetToken = crypto.randomUUID()
  const passwordResetExpiry = new Date(Date.now() + RESET_TOKEN_HOURS * 60 * 60 * 1000)

  await prisma.user.update({
    where: { userId: user.userId },
    data: { passwordResetToken, passwordResetExpiry },
  })

  await emailService.sendPasswordResetEmail(user.email, user.name, passwordResetToken)
}

export const resetPassword = async (token: string, newPassword: string) => {
  const user = await prisma.user.findUnique({ where: { passwordResetToken: token } })
  if (!user || !user.passwordResetExpiry || user.passwordResetExpiry < new Date()) {
    throw new AppError('Invalid or expired reset token', 400, 'INVALID_TOKEN_400')
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS)
  await prisma.user.update({
    where: { userId: user.userId },
    data: {
      passwordHash,
      passwordResetToken: null,
      passwordResetExpiry: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  })
}

export const getMe = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { userId }, select: userSelect })
  if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND_404')
  return formatUserResponse(user as unknown as Record<string, unknown>)
}

export const updateMe = async (userId: string, data: { name: string }) => {
  const user = await prisma.user.update({
    where: { userId },
    data: { name: data.name },
    select: userSelect,
  })
  return formatUserResponse(user as unknown as Record<string, unknown>)
}

export const updateProfile = async (userId: string, data: {
  phoneNumber?: string | null
  gender?: Gender | null
  race?: Race | null
  dateOfBirth?: string | null
  streetOne?: string | null
  streetTwo?: string | null
  postcode?: string | null
  city?: string | null
  state?: State | null
}) => {
  const profileData = {
    ...data,
    dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : data.dateOfBirth,
  }

  await prisma.profile.upsert({
    where: { userId },
    create: { userId, ...profileData },
    update: profileData,
  })

  const user = await prisma.user.findUnique({ where: { userId }, select: userSelect })
  return formatUserResponse(user as unknown as Record<string, unknown>)
}

export const changePassword = async (userId: string, currentPassword: string, newPassword: string) => {
  const user = await prisma.user.findUnique({ where: { userId }, select: { passwordHash: true } })
  if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND_404')

  const valid = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!valid) {
    throw new AppError('Current password is incorrect', 401, 'INVALID_CREDENTIALS_401')
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS)
  await prisma.user.update({ where: { userId }, data: { passwordHash } })
}
