import prisma from '../../config/db.js'
import { supabase, supabaseAdmin } from '../../config/supabase.js'
import { AppError } from '../../utils/AppError.js'
import logger from '../../utils/logger.js'
import {
  finalizeRefreshRotation,
  getUserIdForActiveRefresh,
  registerRefreshTokenFingerprint,
} from '../../redis/refreshTokenRotation.js'
import {
  accessTokenUsedPasswordSignIn,
  hasEmailPasswordIdentity,
  hasEmailProvider,
  hasGoogleIdentity,
  hasGoogleProvider,
  resolveHasPasswordLogin,
} from '../../utils/authIdentities.js'
import { findAuthUserByEmail } from '../../utils/authUserLookup.js'
import {
  type AuthUser,
  formatUserResponse,
  isGoogleIdentityOlderThanEmail,
  userInclude,
} from './userPayload.js'

/**
 * Browser OAuth gives a Supabase session in localStorage only. Call with refresh_token after Google redirect.
 *
 * **Different Supabase user id, same email** -> `AUTH_EMAIL_CONFLICT_409`.
 * **Same user, verified manual + Google from login** -> `GOOGLE_LINK_CONSENT_409` until the user confirms (`googleLinkConsent`).
 *
 * @param oauthFlow `link` = Profile -> Connect Google (sets `profileGoogleLinkedAt`). `login` / `password` are hints only;
 *   merge blocking uses JWT `amr`, not the client body (spoof-safe).
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
  const sessionHasGoogle = hasGoogleIdentity(identities) || hasGoogleProvider(identityUser)
  const sessionHasEmail = hasEmailPasswordIdentity(identities) || hasEmailProvider(identityUser)

  const emailNorm = sessionUser.email?.trim().toLowerCase() ?? ''
  if (emailNorm) {
    const existingByEmail = await findAuthUserByEmail(emailNorm)
    if (existingByEmail && existingByEmail.id !== sessionUser.id) {
      throw new AppError(
        'This email is registered with email and password, not Google yet. Sign in with your email and password, then open Profile → Security → Connect Google. Using "Sign in with Google" before linking is not allowed.',
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

  // Repair stale Google link: identity exists but DB flag was never set.
  if (
    oauthFlow === 'login' &&
    !dbUser.profileGoogleLinkedAt &&
    sessionHasGoogle &&
    sessionHasEmail &&
    sessionUser.email_confirmed_at
  ) {
    const googleIdentity = identities.find((i) => i.provider === 'google') as
      | { created_at?: string | undefined }
      | undefined
    const createdAt = googleIdentity?.created_at ? new Date(googleIdentity.created_at).getTime() : 0
    const googleIdentityAgeMs = createdAt > 0 ? Date.now() - createdAt : 0
    const STALE_GOOGLE_LINK_MS = 120_000
    if (googleIdentityAgeMs > STALE_GOOGLE_LINK_MS) {
      await prisma.user.update({
        where: { userId: dbUser.userId },
        data: { profileGoogleLinkedAt: new Date() },
      })
      const refreshed = await prisma.user.findUnique({
        where: { userId: sessionUser.id },
        include: userInclude,
      })
      if (refreshed) dbUser = refreshed
    }
  }

  const passwordThisSession = accessTokenUsedPasswordSignIn(data.session.access_token)
  const googleOlderThanEmail = isGoogleIdentityOlderThanEmail(identities)
  const manualGoogleFromLoginMerge =
    oauthFlow === 'login' &&
    !passwordThisSession &&
    !dbUser.profileGoogleLinkedAt &&
    sessionHasGoogle &&
    sessionHasEmail &&
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
  }

  // Profile -> Connect Google (linkIdentity): after PKCE exchange the JWT may still list password in `amr`.
  if (
    sessionHasGoogle &&
    sessionHasEmail &&
    !dbUser.profileGoogleLinkedAt &&
    dbUser.passwordSignupAt != null &&
    passwordThisSession &&
    sessionUser.email_confirmed_at
  ) {
    await prisma.user.update({
      where: { userId: dbUser.userId },
      data: { profileGoogleLinkedAt: new Date() },
    })
    const refreshed = await prisma.user.findUnique({
      where: { userId: sessionUser.id },
      include: userInclude,
    })
    if (refreshed) dbUser = refreshed
  }

  if (!sessionUser.email_confirmed_at && !sessionHasGoogle) {
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
    hasGoogleLogin: sessionHasGoogle,
    emailVerifiedAt: null,
    lastLoginAt: null,
    createdAt: dbUser.createdAt,
    updatedAt: dbUser.updatedAt,
    profile: dbUser.profile,
    student: dbUser.student,
    lecturer: dbUser.lecturer,
    headLecturer: dbUser.headLecturer,
  }

  if (oauthFlow === 'link' && sessionHasGoogle) {
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
