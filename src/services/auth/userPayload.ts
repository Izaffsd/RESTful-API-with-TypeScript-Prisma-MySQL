import type { UserIdentity } from '@supabase/supabase-js'
import type { UserType } from '@prisma/client'
import { AppError } from '../../utils/AppError.js'
import { findAuthUserByEmail } from '../../utils/authUserLookup.js'
import { isOAuthOnlyUser } from '../../utils/authIdentities.js'

/** Latest profile photo per entity (header + /me). Omit `fileSize` (BigInt) for JSON responses. */
export const profilePictureDocs = {
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

export const userInclude = {
  profile: true,
  student: { include: { course: true, documents: profilePictureDocs } },
  lecturer: { include: { course: true, documents: profilePictureDocs } },
  headLecturer: { include: { documents: profilePictureDocs } },
} as const

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

export function formatUserResponse(user: AuthUser) {
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

/**
 * `true` if Google identity was created before the email/password identity (typical: OAuth-first, then "add password").
 * `false` if email identity is older (typical: manual register, then Google from login).
 */
export function isGoogleIdentityOlderThanEmail(identities: UserIdentity[]): boolean | null {
  const google = identities.find((i) => i.provider === 'google')
  const email = identities.find((i) => i.provider === 'email')
  if (!google?.created_at || !email?.created_at) return null
  return new Date(google.created_at).getTime() < new Date(email.created_at).getTime()
}

export async function throwDuplicateEmailConflict(email: string): Promise<never> {
  const u = await findAuthUserByEmail(email)
  if (u && isOAuthOnlyUser(u)) {
    throw new AppError(
      'Account already exists. Please sign in with Google.',
      409,
      'DUPLICATE_EMAIL_GOOGLE_409',
    )
  }
  throw new AppError(
    'Account already exists. Please log in.',
    409,
    'DUPLICATE_EMAIL_409',
  )
}
