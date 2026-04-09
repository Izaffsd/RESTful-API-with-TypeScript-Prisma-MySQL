import prisma from '../../config/db.js'
import { supabase } from '../../config/supabase.js'
import { AppError } from '../../utils/AppError.js'
import logger from '../../utils/logger.js'
import { registerRefreshTokenFingerprint } from '../../redis/refreshTokenRotation.js'
import {
  hasGoogleIdentity,
  hasGoogleProvider,
  isOAuthOnlyUser,
  resolveHasPasswordLogin,
} from '../../utils/authIdentities.js'
import { findAuthUserByEmail } from '../../utils/authUserLookup.js'
import { type AuthUser, formatUserResponse, userInclude, throwDuplicateEmailConflict } from './userPayload.js'

export const register = async (data: {
  name: string
  email: string
  password: string
  studentNumber?: string
}) => {
  if (data.studentNumber) {
    const existingStudent = await prisma.student.findUnique({
      where: { studentNumber: data.studentNumber },
    })
    if (existingStudent) {
      throw new AppError('Student number already registered', 409, 'DUPLICATE_STUDENT_NUMBER_409')
    }
  }

  const { data: authData, error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: { data: { name: data.name } },
  })

  if (error) {
    logger.error({ supabaseError: error.message, code: error.status }, 'Supabase signUp failed')
    if (error.message?.toLowerCase().includes('already registered')) {
      await throwDuplicateEmailConflict(data.email)
    }
    throw new AppError('Registration failed', 400, 'REGISTRATION_FAILED_400')
  }

  if (!authData.user) {
    throw new AppError('Registration failed', 400, 'REGISTRATION_FAILED_400')
  }

  if (Array.isArray(authData.user.identities) && authData.user.identities.length === 0) {
    await throwDuplicateEmailConflict(data.email)
  }

  await prisma.user.upsert({
    where: { userId: authData.user.id },
    create: {
      userId: authData.user.id,
      type: 'STUDENT',
      status: 'ACTIVE',
      name: data.name,
      passwordSignupAt: new Date(),
    },
    update: { name: data.name, passwordSignupAt: new Date() },
  })

  if (data.studentNumber) {
    const prefix = data.studentNumber.match(/^([A-Z]{2,4})/)?.[1]
    if (!prefix) {
      throw new AppError('Invalid student number format', 400, 'INVALID_STUDENT_NUMBER_400')
    }
    const course = await prisma.course.findUnique({ where: { courseCode: prefix } })
    if (!course) {
      throw new AppError('Course not found for student number prefix', 404, 'COURSE_NOT_FOUND_404')
    }
    await prisma.student.create({
      data: {
        studentNumber: data.studentNumber,
        courseId: course.courseId,
        userId: authData.user.id,
      },
    })
  }

  return { email: data.email, name: data.name }
}

export const login = async (data: { email: string; password: string }) => {
  const { data: sessionData, error } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  })

  if (error) {
    logger.warn({ supabaseError: error.message, status: error.status }, 'Supabase signInWithPassword failed')
    const msg = (error.message ?? '').toLowerCase()
    const looksLikeEmailNotConfirmed =
      msg.includes('confirm') ||
      msg.includes('confirmation') ||
      msg.includes('not confirmed') ||
      msg.includes('email') && msg.includes('confirm')

    if (looksLikeEmailNotConfirmed) {
      throw new AppError('Please verify your email first', 403, 'EMAIL_NOT_VERIFIED_403')
    }

    const existing = await findAuthUserByEmail(data.email)
    if (existing && isOAuthOnlyUser(existing)) {
      throw new AppError(
        'This account uses Google Sign-In. Please continue with Google.',
        401,
        'OAUTH_ONLY_ACCOUNT_401',
      )
    }

    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS_401')
  }

  if (!sessionData.session || !sessionData.user) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS_401')
  }

  const dbUser = await prisma.user.findUnique({
    where: { userId: sessionData.user.id },
    include: userInclude,
  })

  if (!dbUser || dbUser.deletedAt) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS_401')
  }

  if (dbUser.status !== 'ACTIVE') {
    throw new AppError('Account is not active', 403, 'ACCOUNT_INACTIVE_403')
  }

  if (!sessionData.user.email_confirmed_at) {
    throw new AppError('Please verify your email first', 403, 'EMAIL_NOT_VERIFIED_403')
  }

  const nameFromAuth = (sessionData.user.user_metadata?.name as string) ?? null
  let displayName = dbUser.name ?? null
  if (!displayName && nameFromAuth) {
    await prisma.user.update({
      where: { userId: dbUser.userId },
      data: { name: nameFromAuth },
    })
    displayName = nameFromAuth
  }

  const authUser: AuthUser = {
    userId: dbUser.userId,
    email: sessionData.user.email ?? '',
    name: displayName,
    type: dbUser.type,
    status: dbUser.status,
    isEmailVerified: !!sessionData.user.email_confirmed_at,
    hasPasswordLogin: resolveHasPasswordLogin({
      identities: sessionData.user.identities,
      lastPasswordChangeAt: dbUser.lastPasswordChangeAt,
      accessToken: sessionData.session.access_token,
      appMetadataProviders: sessionData.user.app_metadata?.providers as string[] | undefined,
    }),
    hasGoogleLogin:
      hasGoogleIdentity(sessionData.user.identities) || hasGoogleProvider(sessionData.user),
    emailVerifiedAt: null,
    lastLoginAt: null,
    createdAt: dbUser.createdAt,
    updatedAt: dbUser.updatedAt,
    profile: dbUser.profile,
    student: dbUser.student,
    lecturer: dbUser.lecturer,
    headLecturer: dbUser.headLecturer,
  }

  const refreshToken = sessionData.session.refresh_token ?? ''
  if (refreshToken) {
    await registerRefreshTokenFingerprint(refreshToken, sessionData.user.id)
  }

  return {
    accessToken: sessionData.session.access_token,
    refreshToken,
    user: formatUserResponse(authUser),
  }
}

/** After a failed client password sign-in, suggests whether Google-only (does not confirm "wrong password"). */
export const getLoginHint = async (email: string) => {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return { accountKind: 'none' as const }
  const u = await findAuthUserByEmail(normalized)
  if (!u) return { accountKind: 'none' as const }
  if (isOAuthOnlyUser(u)) return { accountKind: 'oauth_only' as const }
  return { accountKind: 'password' as const }
}
