import { supabase, supabaseAdmin } from '../../config/supabase.js'
import { AppError } from '../../utils/AppError.js'
import logger from '../../utils/logger.js'
import { blacklistAccessToken } from '../../redis/accessTokenBlacklist.js'
import {
  finalizeRefreshRotation,
  getUserIdForActiveRefresh,
  registerRefreshTokenFingerprint,
  revokeRefreshTokenFingerprint,
} from '../../redis/refreshTokenRotation.js'

export const refreshTokens = async (oldRefreshToken: string) => {
  const trackedUserId = await getUserIdForActiveRefresh(oldRefreshToken)
  const { data, error } = await supabase.auth.refreshSession({ refresh_token: oldRefreshToken })

  if (error || !data.session || !data.user) {
    if (error) logger.warn({ supabaseError: error.message }, 'Supabase refreshSession failed')
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
