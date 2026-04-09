import type { User } from '@supabase/supabase-js'

/** Sources for linked providers: `identities` array and/or `app_metadata.providers` on the JWT/user object. */
export type AuthProviderSource = {
  identities?: { provider?: string }[] | null | undefined
  app_metadata?: { providers?: unknown } | null | undefined
}

/**
 * Supabase `refreshSession` often returns an empty `identities` array; `app_metadata.providers`
 * still lists `email` / `google`. Use this for “is Google linked?” checks in API session code.
 */
export function collectAuthProviders(user: AuthProviderSource): Set<string> {
  const s = new Set<string>()
  for (const i of user.identities ?? []) {
    const p = i.provider
    if (typeof p === 'string' && p) s.add(p)
  }
  const meta = user.app_metadata?.providers
  if (Array.isArray(meta)) {
    for (const p of meta) {
      if (typeof p === 'string' && p) s.add(p)
    }
  }
  return s
}

export function hasGoogleProvider(user: AuthProviderSource): boolean {
  return collectAuthProviders(user).has('google')
}

export function hasEmailProvider(user: AuthProviderSource): boolean {
  return collectAuthProviders(user).has('email')
}

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
