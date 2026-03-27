import type { User } from '@supabase/supabase-js'

export function hasEmailPasswordIdentity(identities: { provider: string }[] | null | undefined): boolean {
  return Array.isArray(identities) && identities.some((i) => i.provider === 'email')
}

/** Supabase access token `amr` includes `password` after a password-based sign-in for this session chain. */
export function accessTokenUsedPasswordSignIn(accessToken: string): boolean {
  try {
    const part = accessToken.split('.')[1]
    if (!part) return false
    const payload = JSON.parse(Buffer.from(part, 'base64url').toString('utf8')) as {
      amr?: { method?: string }[]
    }
    return Array.isArray(payload.amr) && payload.amr.some((m) => m?.method === 'password')
  } catch {
    return false
  }
}

/**
 * Whether the account can sign in with email + password for UX flags.
 * Supabase sometimes omits `email` in `identities` for OAuth users who added a password; we also use
 * Prisma `lastPasswordChangeAt` (set on our reset / change-password), JWT `amr` when available, and
 * `app_metadata.providers` when Supabase lists `email` there.
 */
export function resolveHasPasswordLogin(params: {
  identities: { provider: string }[] | null | undefined
  lastPasswordChangeAt?: Date | null
  accessToken?: string | null
  appMetadataProviders?: string[] | null | undefined
}): boolean {
  if (hasEmailPasswordIdentity(params.identities)) return true
  if (params.lastPasswordChangeAt != null) return true
  const providers = params.appMetadataProviders
  if (Array.isArray(providers) && providers.includes('email')) return true
  const t = params.accessToken?.trim()
  if (t && accessTokenUsedPasswordSignIn(t)) return true
  return false
}

export function hasGoogleIdentity(identities: { provider: string }[] | null | undefined): boolean {
  return Array.isArray(identities) && identities.some((i) => i.provider === 'google')
}

/** Has at least one identity but no email/password identity (Google-only, etc.). */
export function isOAuthOnlyUser(user: User): boolean {
  const ids = user.identities ?? []
  if (ids.length === 0) return false
  return !ids.some((i) => i.provider === 'email')
}
