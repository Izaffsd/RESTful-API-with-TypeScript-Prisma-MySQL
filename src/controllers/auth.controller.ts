import type { Request, Response } from 'express'
import { response } from '../utils/response.js'
import { AppError } from '../utils/AppError.js'
import * as authService from '../services/auth.service.js'
import { setRefreshCookie, clearRefreshCookie, readRefreshTokenFromRequest } from '../utils/cookies.js'

export const register = async (req: Request, res: Response): Promise<void> => {
  const data = req.validated.body as { name: string; email: string; password: string; studentNumber?: string }
  const result = await authService.register(data)
  response(res, 201, 'Registration successful. Please check your email to verify your account.', result)
}

export const login = async (req: Request, res: Response): Promise<void> => {
  const data = req.validated.body as { email: string; password: string }
  const result = await authService.login(data)
  setRefreshCookie(res, result.refreshToken)
  response(res, 200, 'Login successful', { accessToken: result.accessToken, user: result.user })
}

export const oauthSession = async (req: Request, res: Response): Promise<void> => {
  const { refreshToken, oauthFlow, googleLinkConsent } = req.validated.body as {
    refreshToken: string
    oauthFlow?: 'login' | 'link' | 'password'
    googleLinkConsent?: boolean
  }
  try {
    const result = await authService.establishOAuthSession(refreshToken, oauthFlow ?? 'login', {
      googleLinkConsent: googleLinkConsent === true,
    })
    setRefreshCookie(res, result.refreshToken)
    response(res, 200, 'Session established', { accessToken: result.accessToken, user: result.user })
  } catch (e) {
    if (e instanceof AppError && e.errorCode === 'AUTH_EMAIL_CONFLICT_409') {
      clearRefreshCookie(res)
    }
    throw e
  }
}

export const loginHint = async (req: Request, res: Response): Promise<void> => {
  const { email } = req.validated.body as { email: string }
  const hint = await authService.getLoginHint(email)
  response(res, 200, 'OK', hint)
}

export const refresh = async (req: Request, res: Response): Promise<void> => {
  const refreshToken = readRefreshTokenFromRequest(req)
  if (!refreshToken) {
    response(res, 401, 'No refresh token', null, 'UNAUTHORIZED_401')
    return
  }
  try {
    const result = await authService.refreshTokens(refreshToken)
    if (result.refreshToken) {
      setRefreshCookie(res, result.refreshToken)
    }
    response(res, 200, 'Token refreshed successfully', { accessToken: result.accessToken })
  } catch (e) {
    if (e instanceof AppError && e.statusCode === 401) {
      clearRefreshCookie(res)
    }
    throw e
  }
}

export const logout = async (req: Request, res: Response): Promise<void> => {
  const token = req.headers.authorization?.slice(7) ?? ''
  const refreshToken = readRefreshTokenFromRequest(req)
  await authService.logout(req.user!.userId, token, refreshToken || undefined)
  clearRefreshCookie(res)
  response(res, 200, 'Logged out successfully')
}

export const resendVerification = async (req: Request, res: Response): Promise<void> => {
  const { email } = req.validated.body as { email: string }
  await authService.resendVerification(email)
  response(res, 200, 'Verification email resent. Please check your inbox.')
}

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  const { email } = req.validated.body as { email: string }
  const { sent } = await authService.forgotPassword(email)
  if (!sent) {
    response(
      res,
      503,
      'We could not send a reset email right now. Check Supabase Auth email/SMTP settings or try again later.',
      null,
      'EMAIL_DELIVERY_FAILED_503',
    )
    return
  }
  response(res, 200, 'If this email is registered, a reset link has been sent.')
}

export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  const { email, code } = req.validated.body as { email: string; code: string }
  const result = await authService.verifyEmailWithOtp(email, code)
  response(
    res,
    200,
    result.alreadyVerified ? 'Email was already verified' : 'Email verified successfully',
    result,
  )
}

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  const { token, newPassword } = req.validated.body as { token: string; newPassword: string }
  await authService.resetPasswordWithToken(token, newPassword)
  response(res, 200, 'Password reset successfully. You can sign in with your new password.')
}

export const getMe = async (req: Request, res: Response): Promise<void> => {
  const accessToken = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : undefined
  const user = await authService.getMe(req.user!.userId, accessToken ? { accessToken } : undefined)
  response(res, 200, 'Profile retrieved successfully', user)
}

export const updateMe = async (req: Request, res: Response): Promise<void> => {
  const data = req.validated.body as { name: string }
  const user = await authService.updateMe(req.user!.userId, data)
  response(res, 200, 'Profile updated successfully', user)
}

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  const data = req.validated.body as Record<string, unknown>
  const user = await authService.updateProfile(req.user!.userId, req.user!.type, data as Parameters<typeof authService.updateProfile>[2])
  response(res, 200, 'Profile updated successfully', user)
}

export const changePassword = async (req: Request, res: Response): Promise<void> => {
  const { currentPassword, newPassword } = req.validated.body as { currentPassword?: string; newPassword: string }
  const accessToken = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : ''
  if (!accessToken) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED_401')
  }
  const xf = req.headers['x-forwarded-for']
  const clientIp = typeof xf === 'string' ? xf.split(',')[0]?.trim() : undefined
  const refreshToken = readRefreshTokenFromRequest(req)
  const result = await authService.changePassword(req.user!.userId, currentPassword, newPassword, accessToken, {
    userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined,
    clientIp: clientIp || req.socket.remoteAddress || undefined,
    currentRefreshToken: refreshToken || undefined,
  })
  if (result.refreshToken) {
    setRefreshCookie(res, result.refreshToken)
  }
  response(res, 200, 'Password changed successfully', {
    accessToken: result.accessToken,
    othersSignedOut: result.othersSignedOut,
    securityEmailSent: result.securityEmailSent,
    ...(result.securityEmailFailureReason
      ? { securityEmailFailureReason: result.securityEmailFailureReason }
      : {}),
  })
}
