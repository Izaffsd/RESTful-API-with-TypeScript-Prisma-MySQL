import crypto from 'node:crypto'
import type { UserIdentity } from '@supabase/supabase-js'
import prisma from '../config/db.js'
import { supabase, supabaseAdmin } from '../config/supabase.js'
import { resend } from '../config/resend.js'
import { AppError } from '../utils/AppError.js'
import { env } from '../config/env.js'
import logger from '../utils/logger.js'
import { blacklistAccessToken } from '../redis/accessTokenBlacklist.js'
import { storeEmailVerifyOtp, verifyAndConsumeEmailOtp } from '../redis/emailVerifyOtp.js'
import {
  consumePasswordResetToken,
  generatePasswordResetRawToken,
  storePasswordResetToken,
} from '../redis/passwordResetToken.js'
import {
  finalizeRefreshRotation,
  getUserIdForActiveRefresh,
  registerRefreshTokenFingerprint,
  revokeRefreshTokenFingerprint,
} from '../redis/refreshTokenRotation.js'
import {
  accessTokenUsedPasswordSignIn,
  hasEmailPasswordIdentity,
  hasGoogleIdentity,
  isOAuthOnlyUser,
  resolveHasPasswordLogin,
} from '../utils/authIdentities.js'
import { findAuthUserByEmail } from '../utils/authUserLookup.js'
import type { UserType, Gender, Race, State } from '@prisma/client'
import { mykadSchema } from '../validations/shared/mykad.validation.js'
import { describeUserAgent } from '../utils/clientDevice.js'
import { sendPasswordChangeSecurityEmail } from '../utils/emails/passwordChange.email.js'
import { sendEmailVerifyOtpEmail } from '../utils/emails/emailVerifyOtp.email.js'
import { sendPasswordResetLinkEmail } from '../utils/emails/passwordReset.email.js'

/** Latest profile photo per entity (header + /me). Omit `fileSize` (BigInt) for JSON responses. */
const profilePictureDocs = {
  where: { deletedAt: null, category: 'PROFILE_PICTURE' as const },
  orderBy: { createdAt: 'desc' as const },
  take: 1,
  select: {
    documentId: true,
    entityId: true,
    entityType: true,
    fileName: true,
    originalName: true,
    mimeType: true,
    filePath: true,
    fileUrl: true,
    category: true,
    createdAt: true,
    updatedAt: true,
  },
}

const userInclude = {
  profile: true,
  student: { include: { course: true, documents: profilePictureDocs } },
  lecturer: { include: { course: true, documents: profilePictureDocs } },
  headLecturer: { include: { documents: profilePictureDocs } },
} as const

/**
 * `true` if Google identity was created before the email/password identity (typical: OAuth-first, then “add password”).
 * `false` if email identity is older (typical: manual register, then Google from login).
 */
function isGoogleIdentityOlderThanEmail(identities: UserIdentity[]): boolean | null {
  const google = identities.find((i) => i.provider === 'google')
  const email = identities.find((i) => i.provider === 'email')
  if (!google?.created_at || !email?.created_at) return null
  return new Date(google.created_at).getTime() < new Date(email.created_at).getTime()
}

export type AuthUser = {
  userId: string
  email: string
  name: string | null
  type: UserType
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
  isEmailVerified: boolean
  emailVerifiedAt: Date | null
  lastLoginAt: Date | null
  createdAt: Date
  updatedAt: Date
  /** Supabase email/password identity exists (false for OAuth-only until they set a password). */
  hasPasswordLogin: boolean
  /** Google OAuth identity linked. */
  hasGoogleLogin: boolean
  profile: unknown
  student: unknown
  lecturer: unknown
  headLecturer: unknown
}

function formatUserResponse(user: AuthUser) {
  const profile = user.profile as Record<string, unknown> | null
  let formattedProfile = null
  if (profile) {
    formattedProfile = {
      profileId: profile.profileId,
      phoneNumber: profile.phoneNumber,
      gender: profile.gender,
      race: profile.race,
      dateOfBirth: profile.dateOfBirth,
      state: profile.state,
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
    hasPasswordLogin: user.hasPasswordLogin,
    hasGoogleLogin: user.hasGoogleLogin,
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

async function throwDuplicateEmailConflict(email: string): Promise<never> {
  const u = await findAuthUserByEmail(email)
  if (u && isOAuthOnlyUser(u)) {
    throw new AppError(
      'Account already exists. Please sign in with Google.',
      409,
      'DUPLICATE_EMAIL_GOOGLE_409',
    )
  }
  throw new AppError(
    'Account already exists. Please log in with your password.',
    409,
    'DUPLICATE_EMAIL_409',
  )
}

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
    throw new AppError(error.message ?? 'Registration failed', 400, 'REGISTRATION_FAILED_400')
  }

  if (!authData.user) {
    throw new AppError('Registration failed', 400, 'REGISTRATION_FAILED_400')
  }

  // Supabase may return an obfuscated "success" response for existing users
  // (e.g. anti-enumeration mode), with an empty identities array.
  // Treat this as duplicate email so UI shows the correct feedback.
  if (Array.isArray(authData.user.identities) && authData.user.identities.length === 0) {
    await throwDuplicateEmailConflict(data.email)
  }

  // IMPORTANT:
  // Your `login()` requires a row in `public.users` (`prisma.user`) by `userId`.
  // OAuth sign-in typically creates/ensures that row via `authenticate` middleware,
  // but manual sign-up must do it here as well, otherwise login throws
  // INVALID_CREDENTIALS_401 at the `if (!dbUser || dbUser.deletedAt)` check.
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
    const msg = (error.message ?? '').toLowerCase()
    // Supabase often uses the same "invalid login" shape when the user hasn't confirmed email.
    // Map those cases to a more accurate error for the frontend.
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
  // Backfill name for existing rows where `name` wasn't persisted yet.
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
    // Prisma is the source of truth for display name.
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
    hasGoogleLogin: hasGoogleIdentity(sessionData.user.identities),
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

/**
 * Browser OAuth gives a Supabase session in localStorage only. Call with refresh_token after Google redirect.
 *
 * **Different Supabase user id, same email** → `AUTH_EMAIL_CONFLICT_409`.
 * **Same user, verified manual + Google from login** → `GOOGLE_LINK_CONSENT_409` until the user confirms (`googleLinkConsent`).
 *
 * @param oauthFlow `link` = Profile → Connect Google (sets `profileGoogleLinkedAt`). `login` / `password` are hints only;
 *   merge blocking uses JWT `amr`, not the client body (spoof-safe).
 *
 * **Scenario 7** — verified manual + Google from login: `GOOGLE_LINK_CONSENT_409` until `googleLinkConsent: true`.
 * **Scenario 8** — unverified manual + Google from login: allow session (no consent); Google identity satisfies access.
 */
export const establishOAuthSession = async (
  refreshToken: string,
  oauthFlow: 'login' | 'link' | 'password' = 'login',
  options: { googleLinkConsent?: boolean } = {},
) => {
  const googleLinkConsent = options.googleLinkConsent === true
  const trackedUserId = await getUserIdForActiveRefresh(refreshToken)
  const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken })
  if (error || !data.session || !data.user) {
    throw new AppError('Invalid refresh token', 401, 'UNAUTHORIZED_401')
  }

  const sessionUser = data.user
  if (trackedUserId && trackedUserId !== sessionUser.id) {
    throw new AppError('Invalid refresh token', 401, 'UNAUTHORIZED_401')
  }
  // refreshSession often omits or empties `identities`; admin getUser is needed for provider checks.
  const { data: adminUserWrap, error: adminUserErr } = await supabaseAdmin.auth.admin.getUserById(
    sessionUser.id,
  )
  if (adminUserErr || !adminUserWrap?.user) {
    logger.warn(
      { userId: sessionUser.id, err: adminUserErr?.message },
      'admin.getUserById failed in establishOAuthSession; identity checks may be incomplete',
    )
  }
  const identityUser = adminUserWrap?.user ?? sessionUser
  const identities = identityUser.identities ?? []

  const emailNorm = sessionUser.email?.trim().toLowerCase() ?? ''
  if (emailNorm) {
    const existingByEmail = await findAuthUserByEmail(emailNorm)
    if (existingByEmail && existingByEmail.id !== sessionUser.id) {
      throw new AppError(
        'This email is registered with email and password, not Google yet. Sign in with your email and password, then open Profile → Security → Connect Google. Using “Sign in with Google” before linking is not allowed.',
        409,
        'AUTH_EMAIL_CONFLICT_409',
      )
    }
  }

  const nameFromAuth = (sessionUser.user_metadata?.name as string) ?? null

  let dbUser = await prisma.user.findUnique({
    where: { userId: sessionUser.id },
    include: userInclude,
  })
  if (!dbUser) {
    await prisma.user.create({
      data: { userId: sessionUser.id, type: 'STUDENT', status: 'ACTIVE', name: nameFromAuth },
    })
    dbUser = await prisma.user.findUnique({
      where: { userId: sessionUser.id },
      include: userInclude,
    })
  }
  if (!dbUser || dbUser.deletedAt) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS_401')
  }
  if (dbUser.status !== 'ACTIVE') {
    throw new AppError('Account is not active', 403, 'ACCOUNT_INACTIVE_403')
  }

  const passwordThisSession = accessTokenUsedPasswordSignIn(data.session.access_token)
  const googleOlderThanEmail = isGoogleIdentityOlderThanEmail(identities)
  /** Manual account + Google from **login** (not Profile link / not password session). */
  const manualGoogleFromLoginMerge =
    oauthFlow === 'login' &&
    !passwordThisSession &&
    !dbUser.profileGoogleLinkedAt &&
    hasGoogleIdentity(identities) &&
    hasEmailPasswordIdentity(identities) &&
    googleOlderThanEmail !== true &&
    (dbUser.passwordSignupAt != null || googleOlderThanEmail === false)

  if (manualGoogleFromLoginMerge && sessionUser.email_confirmed_at) {
    if (googleLinkConsent) {
      await prisma.user.update({
        where: { userId: dbUser.userId },
        data: { profileGoogleLinkedAt: new Date() },
      })
      const refreshed = await prisma.user.findUnique({
        where: { userId: sessionUser.id },
        include: userInclude,
      })
      if (refreshed) dbUser = refreshed
    } else {
      const displayNameForPrompt =
        dbUser.name?.trim() ||
        (nameFromAuth?.trim() ?? '') ||
        (sessionUser.email ?? 'Your account')
      throw new AppError(
        'Confirm linking Google to this account.',
        409,
        'GOOGLE_LINK_CONSENT_409',
        undefined,
        {
          email: sessionUser.email ?? '',
          displayName: displayNameForPrompt,
        },
      )
    }
  } else if (manualGoogleFromLoginMerge && !sessionUser.email_confirmed_at) {
    // Scenario 8: unverified manual + Google — allow (Supabase often confirms via Google).
  }

  if (!sessionUser.email_confirmed_at && !hasGoogleIdentity(identities)) {
    throw new AppError('Please verify your email first', 403, 'EMAIL_NOT_VERIFIED_403')
  }

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
    email: sessionUser.email ?? '',
    name: displayName,
    type: dbUser.type,
    status: dbUser.status,
    isEmailVerified: !!sessionUser.email_confirmed_at,
    hasPasswordLogin: resolveHasPasswordLogin({
      identities,
      lastPasswordChangeAt: dbUser.lastPasswordChangeAt,
      accessToken: data.session.access_token,
      appMetadataProviders: identityUser.app_metadata?.providers as string[] | undefined,
    }),
    hasGoogleLogin: hasGoogleIdentity(identities),
    emailVerifiedAt: null,
    lastLoginAt: null,
    createdAt: dbUser.createdAt,
    updatedAt: dbUser.updatedAt,
    profile: dbUser.profile,
    student: dbUser.student,
    lecturer: dbUser.lecturer,
    headLecturer: dbUser.headLecturer,
  }

  if (oauthFlow === 'link' && hasGoogleIdentity(identities)) {
    await prisma.user.update({
      where: { userId: dbUser.userId },
      data: { profileGoogleLinkedAt: new Date() },
    })
  }

  const newRefresh = data.session.refresh_token ?? refreshToken
  if (trackedUserId) {
    await finalizeRefreshRotation(refreshToken, newRefresh, sessionUser.id)
  } else if (newRefresh) {
    await registerRefreshTokenFingerprint(newRefresh, sessionUser.id)
  }

  return {
    accessToken: data.session.access_token,
    refreshToken: newRefresh,
    user: formatUserResponse(authUser),
  }
}

/** After a failed client password sign-in, suggests whether Google-only (does not confirm “wrong password”). */
export const getLoginHint = async (email: string) => {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return { accountKind: 'none' as const }
  const u = await findAuthUserByEmail(normalized)
  if (!u) return { accountKind: 'none' as const }
  if (isOAuthOnlyUser(u)) return { accountKind: 'oauth_only' as const }
  return { accountKind: 'password' as const }
}

export const refreshTokens = async (oldRefreshToken: string) => {
  const trackedUserId = await getUserIdForActiveRefresh(oldRefreshToken)
  const { data, error } = await supabase.auth.refreshSession({ refresh_token: oldRefreshToken })

  if (error || !data.session || !data.user) {
    throw new AppError('Invalid refresh token', 401, 'UNAUTHORIZED_401')
  }

  if (trackedUserId && trackedUserId !== data.user.id) {
    throw new AppError('Invalid refresh token', 401, 'UNAUTHORIZED_401')
  }

  const newRefreshToken = data.session.refresh_token ?? oldRefreshToken

  if (trackedUserId) {
    await finalizeRefreshRotation(oldRefreshToken, newRefreshToken, data.user.id)
  } else if (newRefreshToken) {
    await registerRefreshTokenFingerprint(newRefreshToken, data.user.id)
  }

  return {
    accessToken: data.session.access_token,
    refreshToken: newRefreshToken,
  }
}

export const logout = async (userId: string, accessToken: string, refreshToken?: string) => {
  await blacklistAccessToken(accessToken)
  const rt = refreshToken?.trim()
  if (rt) {
    await revokeRefreshTokenFingerprint(rt, userId)
  }
  try {
    await supabaseAdmin.auth.admin.signOut(accessToken)
  } catch {
    // Token may already be invalid
  }
}

export const resendVerification = async (email: string) => {
  const emailNorm = email.trim().toLowerCase()
  const from = env.FROM_EMAIL?.trim()

  if (resend && from) {
    const authUser = await findAuthUserByEmail(emailNorm)
    if (authUser && !authUser.email_confirmed_at) {
      const code = String(crypto.randomInt(100_000, 1_000_000))
      try {
        await storeEmailVerifyOtp(emailNorm, code)
      } catch {
        const { error } = await supabase.auth.resend({ type: 'signup', email: emailNorm })
        if (error) {
          logger.warn(
            { email: emailNorm, supabaseError: error.message, status: error.status, code: error.code },
            'Supabase resend verification failed (OTP Redis fallback)',
          )
        }
        return
      }
      const dbUser = await prisma.user.findUnique({
        where: { userId: authUser.id },
        select: { name: true },
      })
      const sent = await sendEmailVerifyOtpEmail({
        to: authUser.email ?? emailNorm,
        recipientName: dbUser?.name ?? null,
        code,
        teamName: 'Monash College',
      })
      if (!sent) {
        const { error } = await supabase.auth.resend({ type: 'signup', email: emailNorm })
        if (error) {
          logger.warn(
            { email: emailNorm, supabaseError: error.message, status: error.status, code: error.code },
            'Supabase resend verification failed (after OTP email failure)',
          )
        }
      }
      return
    }
  }

  const { error } = await supabase.auth.resend({ type: 'signup', email: emailNorm })
  if (error) {
    logger.warn(
      { email: emailNorm, supabaseError: error.message, status: error.status, code: error.code },
      'Supabase resend verification failed',
    )
  }
}

export const verifyEmailWithOtp = async (email: string, code: string) => {
  const emailNorm = email.trim().toLowerCase()
  const ok = await verifyAndConsumeEmailOtp(emailNorm, code)
  if (!ok) {
    throw new AppError('Invalid or expired verification code', 400, 'INVALID_OTP_400')
  }
  const authUser = await findAuthUserByEmail(emailNorm)
  if (!authUser) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND_404')
  }
  if (authUser.email_confirmed_at) {
    return { alreadyVerified: true as const }
  }
  const { error } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
    email_confirm: true,
  })
  if (error) {
    throw new AppError(error.message ?? 'Verification failed', 400, 'VERIFY_FAILED_400')
  }
  return { alreadyVerified: false as const }
}

async function forgotPasswordViaSupabase(emailNorm: string): Promise<{ sent: boolean }> {
  const { error } = await supabase.auth.resetPasswordForEmail(emailNorm, {
    redirectTo: `${env.FRONTEND_URL}/reset-password`,
  })
  if (error) {
    logger.warn(
      {
        email: emailNorm,
        redirectTo: `${env.FRONTEND_URL}/reset-password`,
        supabaseError: error.message,
        status: error.status,
        code: error.code,
      },
      'Supabase forgot password failed',
    )
    return { sent: false }
  }
  return { sent: true }
}

export const forgotPassword = async (email: string): Promise<{ sent: boolean }> => {
  const emailNorm = email.trim().toLowerCase()
  const from = env.FROM_EMAIL?.trim()

  if (resend && from) {
    const authUser = await findAuthUserByEmail(emailNorm)
    if (!authUser) {
      return { sent: true }
    }
    const raw = generatePasswordResetRawToken()
    try {
      await storePasswordResetToken(raw, authUser.id)
    } catch {
      return forgotPasswordViaSupabase(emailNorm)
    }
    const dbUser = await prisma.user.findUnique({
      where: { userId: authUser.id },
      select: { name: true },
    })
    const base = env.FRONTEND_URL.replace(/\/$/, '')
    const resetUrl = `${base}/reset-password?token=${raw}`
    const sent = await sendPasswordResetLinkEmail({
      to: authUser.email ?? emailNorm,
      recipientName: dbUser?.name ?? null,
      resetUrl,
      teamName: 'Monash College Security Team',
    })
    if (!sent) {
      return forgotPasswordViaSupabase(emailNorm)
    }
    return { sent: true }
  }

  return forgotPasswordViaSupabase(emailNorm)
}

export const resetPasswordWithToken = async (token: string, newPassword: string) => {
  const userId = await consumePasswordResetToken(token.trim())
  if (!userId) {
    throw new AppError('Invalid or expired reset link', 400, 'RESET_TOKEN_INVALID_400')
  }
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    password: newPassword,
  })
  if (error) {
    throw new AppError(error.message ?? 'Password reset failed', 400, 'RESET_FAILED_400')
  }
  await prisma.user.update({
    where: { userId },
    data: { lastPasswordChangeAt: new Date() },
  })
}

export const getMe = async (userId: string, opts?: { accessToken?: string }) => {
  const dbUser = await prisma.user.findUnique({
    where: { userId },
    include: userInclude,
  })
  if (!dbUser) throw new AppError('User not found', 404, 'USER_NOT_FOUND_404')

  const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(userId)
  const email = authUser?.email ?? ''
  // Prisma is the source of truth for display name.
  const nameFromAuth = (authUser?.user_metadata?.name as string) ?? null
  let name = dbUser.name ?? null
  // Backfill for existing rows where `name` wasn't persisted yet.
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
    hasGoogleLogin: hasGoogleIdentity(authUser?.identities),
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
  // Update only Prisma. Supabase metadata may be overwritten by OAuth provider.
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

  // MyKad is required for students with a student record (data persists in DB, not browser memory)
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

  // If MyKad is being set/changed, ensure uniqueness before any write that could violate a DB unique constraint.
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
  /** New session for this device (password updates invalidate prior Supabase refresh tokens). */
  accessToken: string
  refreshToken: string
  othersSignedOut: boolean
  securityEmailSent: boolean
  /** Present when `securityEmailSent` is false and we can explain why (e.g. Resend rejection). */
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
  // No current password: OAuth-only first-time set password (session proves ownership).

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    password: newPassword,
  })
  if (updateError) {
    throw new AppError(updateError.message ?? 'Password update failed', 400, 'UPDATE_FAILED_400')
  }

  const now = new Date()
  await prisma.user.update({
    where: { userId },
    data: { lastPasswordChangeAt: now },
  })

  let othersSignedOut = false
  const { error: signOutOthersErr } = await supabaseAdmin.auth.admin.signOut(currentAccessToken, 'others')
  if (signOutOthersErr) {
    logger.warn(
      { userId, err: signOutOthersErr.message },
      'signOut(scope=others) after password change failed — other sessions may stay active',
    )
  } else {
    othersSignedOut = true
  }

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
  const resetUrl = `${env.FRONTEND_URL.replace(/\/$/, '')}/forgot-password`

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
