import prisma from '../../config/db.js'
import { supabase, supabaseAdmin } from '../../config/supabase.js'
import { AppError } from '../../utils/AppError.js'
import { env } from '../../config/env.js'
import logger from '../../utils/logger.js'
import { blacklistAccessToken } from '../../redis/accessTokenBlacklist.js'
import {
  finalizeRefreshRotation,
  registerRefreshTokenFingerprint,
} from '../../redis/refreshTokenRotation.js'
import {
  generatePasswordResetRawToken,
  storePasswordResetToken,
} from '../../redis/passwordResetToken.js'
import {
  hasGoogleIdentity,
  hasGoogleProvider,
  resolveHasPasswordLogin,
} from '../../utils/authIdentities.js'
import { mykadSchema } from '../../validations/shared/mykad.validation.js'
import { describeUserAgent } from '../../utils/clientDevice.js'
import { sendPasswordChangeSecurityEmail } from '../../utils/emails/passwordChange.email.js'
import type { UserType, Gender, Race, State } from '@prisma/client'
import { type AuthUser, formatUserResponse, userInclude } from './userPayload.js'

export const getMe = async (userId: string, opts?: { accessToken?: string }) => {
  const dbUser = await prisma.user.findUnique({
    where: { userId },
    include: userInclude,
  })
  if (!dbUser) throw new AppError('User not found', 404, 'USER_NOT_FOUND_404')

  const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(userId)
  const email = authUser?.email ?? ''
  const nameFromAuth = (authUser?.user_metadata?.name as string) ?? null
  let name = dbUser.name ?? null
  if (!name && nameFromAuth) {
    await prisma.user.update({
      where: { userId },
      data: { name: nameFromAuth },
    })
    name = nameFromAuth
  }
  const isEmailVerified = !!authUser?.email_confirmed_at

  const authUserFormatted: AuthUser = {
    userId: dbUser.userId,
    email,
    name,
    type: dbUser.type,
    status: dbUser.status,
    isEmailVerified,
    hasPasswordLogin: resolveHasPasswordLogin({
      identities: authUser?.identities,
      lastPasswordChangeAt: dbUser.lastPasswordChangeAt,
      accessToken: opts?.accessToken,
      appMetadataProviders: authUser?.app_metadata?.providers as string[] | undefined,
    }),
    hasGoogleLogin:
      hasGoogleIdentity(authUser?.identities) || hasGoogleProvider(authUser ?? {}),
    emailVerifiedAt: null,
    lastLoginAt: null,
    createdAt: dbUser.createdAt,
    updatedAt: dbUser.updatedAt,
    profile: dbUser.profile,
    student: dbUser.student,
    lecturer: dbUser.lecturer,
    headLecturer: dbUser.headLecturer,
  }
  return formatUserResponse(authUserFormatted)
}

export const updateMe = async (userId: string, data: { name: string }) => {
  await prisma.user.update({
    where: { userId },
    data: { name: data.name },
  })
  return getMe(userId)
}

export const updateProfile = async (userId: string, userType: UserType, data: {
  phoneNumber?: string | null
  gender?: Gender | null
  race?: Race | null
  dateOfBirth?: string | null
  streetOne?: string | null
  streetTwo?: string | null
  postcode?: string | null
  city?: string | null
  state?: State | null
  studentNumber?: string
  mykadNumber?: string | null
}) => {
  const { studentNumber, mykadNumber, ...profileFields } = data

  if (userType === 'STUDENT') {
    const student = await prisma.student.findUnique({ where: { userId } })
    if (student) {
      const digits = (mykadNumber ?? '').toString().trim().replace(/\D/g, '')
      if (!digits || digits.length === 0) {
        throw new AppError('MyKad number is required', 400, 'MYKAD_REQUIRED_400', [
          { field: 'mykadNumber', message: 'MyKad number is required (12 digits, format: YYMMDDxxxxxx)' },
        ])
      }
      const parsed = mykadSchema.safeParse(digits)
      if (!parsed.success) {
        const msg = parsed.error.issues[0]?.message ?? 'Invalid MyKad number format (YYMMDDxxxxxx)'
        throw new AppError(msg, 400, 'INVALID_MYKAD_400', [{ field: 'mykadNumber', message: msg }])
      }
    }
  }

  if (userType === 'STUDENT' && mykadNumber) {
    const existing = await prisma.student.findFirst({
      where: { mykadNumber, userId: { not: userId } },
    })
    if (existing) {
      throw new AppError('MyKad number already registered to another student', 409, 'DUPLICATE_MYKAD_409')
    }
  }
  const profileData = {
    ...profileFields,
    dateOfBirth: profileFields.dateOfBirth ? new Date(profileFields.dateOfBirth) : profileFields.dateOfBirth,
  }

  await prisma.profile.upsert({
    where: { userId },
    create: { userId, ...profileData },
    update: profileData,
  })

  if (userType === 'STUDENT' && studentNumber) {
    if (!/^[A-Z]{2,4}[0-9]{4,5}$/.test(studentNumber)) {
      throw new AppError('Invalid student number format (e.g., LAW0504, SE03001)', 400, 'INVALID_STUDENT_NUMBER_400')
    }
    const prefix = studentNumber.match(/^([A-Z]{2,4})/)?.[1]
    if (!prefix) {
      throw new AppError('Invalid student number format (e.g. MC12345)', 400, 'INVALID_STUDENT_NUMBER_400')
    }
    const course = await prisma.course.findUnique({ where: { courseCode: prefix } })
    if (!course) {
      throw new AppError('Course not found for student number prefix', 404, 'COURSE_NOT_FOUND_404')
    }

    const student = await prisma.student.findUnique({ where: { userId } })
    if (!student) {
      const existing = await prisma.student.findUnique({ where: { studentNumber } })
      if (existing) {
        throw new AppError('Student number already registered', 409, 'DUPLICATE_STUDENT_NUMBER_409')
      }
      await prisma.student.create({
        data: { studentNumber, courseId: course.courseId, userId },
      })
    } else {
      const existing = await prisma.student.findUnique({ where: { studentNumber } })
      if (existing && existing.studentId !== student.studentId) {
        throw new AppError('Student number already registered', 409, 'DUPLICATE_STUDENT_NUMBER_409')
      }
      await prisma.student.update({
        where: { studentId: student.studentId },
        data: {
          studentNumber,
          courseId: course.courseId,
        },
      })
    }
  }

  if (userType === 'STUDENT') {
    const student = await prisma.student.findUnique({ where: { userId } })
    if (student && mykadNumber !== undefined) {
      if (mykadNumber) {
        const existing = await prisma.student.findFirst({
          where: { mykadNumber, studentId: { not: student.studentId } },
        })
        if (existing) {
          throw new AppError('MyKad number already registered to another student', 409, 'DUPLICATE_MYKAD_409')
        }
      }
      await prisma.student.update({
        where: { studentId: student.studentId },
        data: { mykadNumber: mykadNumber || null },
      })
    }
  }

  return getMe(userId)
}

export type ChangePasswordResult = {
  accessToken: string
  refreshToken: string
  othersSignedOut: boolean
  securityEmailSent: boolean
  securityEmailFailureReason?: string
}

export const changePassword = async (
  userId: string,
  currentPassword: string | undefined,
  newPassword: string,
  currentAccessToken: string,
  meta?: { userAgent?: string; clientIp?: string; currentRefreshToken?: string },
): Promise<ChangePasswordResult> => {
  const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(userId)
  if (!authUser?.email) throw new AppError('User not found', 404, 'USER_NOT_FOUND_404')

  const dbUserRow = await prisma.user.findUnique({
    where: { userId },
    select: { lastPasswordChangeAt: true, name: true },
  })

  const accountHasPassword = resolveHasPasswordLogin({
    identities: authUser.identities,
    lastPasswordChangeAt: dbUserRow?.lastPasswordChangeAt ?? null,
    accessToken: currentAccessToken,
    appMetadataProviders: authUser.app_metadata?.providers as string[] | undefined,
  })

  const cp = (currentPassword ?? '').trim()

  if (accountHasPassword && !cp) {
    throw new AppError('Current password is required', 400, 'CURRENT_PASSWORD_REQUIRED_400')
  }

  if (cp) {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: authUser.email,
      password: cp,
    })
    if (signInError) {
      throw new AppError('Current password is incorrect', 401, 'INVALID_CREDENTIALS_401')
    }
    if (cp === newPassword.trim()) {
      throw new AppError(
        'New password must be different from your current password',
        400,
        'NEW_PASSWORD_SAME_AS_CURRENT_400',
      )
    }
  }

  let othersSignedOut = false
  const { error: signOutOthersErr } = await supabaseAdmin.auth.admin.signOut(currentAccessToken, 'others')
  if (signOutOthersErr) {
    logger.warn(
      { userId, err: signOutOthersErr.message },
      'signOut(scope=others) before password change failed — other sessions may stay active',
    )
  } else {
    othersSignedOut = true
  }

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    password: newPassword,
  })
  if (updateError) {
    logger.error({ supabaseError: updateError.message, userId }, 'Supabase password update failed')
    throw new AppError('Password update failed', 400, 'UPDATE_FAILED_400')
  }

  const now = new Date()
  await prisma.user.update({
    where: { userId },
    data: { lastPasswordChangeAt: now },
  })

  const { data: newSessionWrap, error: newSessionErr } = await supabase.auth.signInWithPassword({
    email: authUser.email,
    password: newPassword,
  })
  if (newSessionErr || !newSessionWrap.session?.access_token) {
    logger.error(
      { userId, err: newSessionErr?.message },
      'signIn after password change failed — user must sign in manually',
    )
    throw new AppError(
      'Password was updated but we could not start a new session. Please sign in with your new password.',
      503,
      'SESSION_REISSUE_FAILED_503',
    )
  }

  const newAccessToken = newSessionWrap.session.access_token
  const newRefreshToken = newSessionWrap.session.refresh_token ?? ''

  await blacklistAccessToken(currentAccessToken)

  const crt = meta?.currentRefreshToken?.trim()
  if (newRefreshToken) {
    if (crt) {
      await finalizeRefreshRotation(crt, newRefreshToken, userId)
    } else {
      await registerRefreshTokenFingerprint(newRefreshToken, userId)
    }
  }

  const support =
    env.SUPPORT_EMAIL?.trim() || env.FROM_EMAIL?.trim() || 'support@example.com'
  const locationHint = env.SECURITY_EMAIL_LOCATION_HINT?.trim() ?? ''
  const base = env.FRONTEND_URL.replace(/\/$/, '')

  let resetUrl = `${base}/forgot-password`
  try {
    const raw = generatePasswordResetRawToken()
    await storePasswordResetToken(raw, userId)
    resetUrl = `${base}/reset-password?token=${raw}`
  } catch {
    logger.warn({ userId }, 'Could not generate reset token for security email — falling back to /forgot-password')
  }

  const emailResult = await sendPasswordChangeSecurityEmail({
    to: authUser.email,
    recipientName: dbUserRow?.name ?? null,
    wasExistingPassword: accountHasPassword,
    when: now,
    deviceLabel: describeUserAgent(meta?.userAgent),
    locationHint,
    resetUrl,
    supportEmail: support,
    teamName: 'Monash College Security Team',
  })

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    othersSignedOut,
    securityEmailSent: emailResult.sent,
    ...(emailResult.sent ? {} : { securityEmailFailureReason: emailResult.failureReason }),
  }
}
