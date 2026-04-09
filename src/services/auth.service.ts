/**
 * Barrel re-export — the actual implementations now live under `./auth/`.
 * This file is kept so existing `import * as authService from '../services/auth.service.js'`
 * continues to work without changing every consumer.
 */
export {
  type AuthUser,
  formatUserResponse,
  userInclude,
  profilePictureDocs,
  register,
  login,
  getLoginHint,
  establishOAuthSession,
  refreshTokens,
  logout,
  resendVerification,
  verifyEmailWithOtp,
  forgotPassword,
  resetPasswordWithToken,
  getMe,
  updateMe,
  updateProfile,
  changePassword,
  type ChangePasswordResult,
} from './auth/index.js'
