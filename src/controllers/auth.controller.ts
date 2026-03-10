import type { Request, Response } from 'express'
import { response } from '../utils/response.js'
import * as authService from '../services/auth.service.js'
import * as tokenService from '../services/token.service.js'

export const register = async (req: Request, res: Response): Promise<void> => {
  const data = req.validated.body as { name: string; email: string; password: string; studentNumber?: string }
  const result = await authService.register(data)
  response(res, 201, 'Registration successful. Please check your email to verify your account.', result)
}

export const login = async (req: Request, res: Response): Promise<void> => {
  const data = req.validated.body as { email: string; password: string }
  const result = await authService.login(data)
  tokenService.setRefreshCookie(res, result.refreshToken)
  response(res, 200, 'Login successful', { accessToken: result.accessToken, user: result.user })
}

export const refresh = async (req: Request, res: Response): Promise<void> => {
  const refreshToken = req.cookies?.refreshToken
  if (!refreshToken) {
    response(res, 401, 'No refresh token', null, 'UNAUTHORIZED_401')
    return
  }
  const result = await authService.refreshTokens(refreshToken)
  response(res, 200, 'Token refreshed successfully', result)
}

export const logout = async (req: Request, res: Response): Promise<void> => {
  const token = req.headers.authorization?.slice(7) ?? ''
  await authService.logout(req.user!.userId, token)
  tokenService.clearRefreshCookie(res)
  response(res, 200, 'Logged out successfully')
}

export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  const { token } = req.validated.query as { token: string }
  const result = await authService.verifyEmail(token)
  tokenService.setRefreshCookie(res, result.refreshToken)
  response(res, 200, 'Email verified successfully', { accessToken: result.accessToken, user: result.user })
}

export const resendVerification = async (req: Request, res: Response): Promise<void> => {
  const { email } = req.validated.body as { email: string }
  await authService.resendVerification(email)
  response(res, 200, 'Verification email resent. Please check your inbox.')
}

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  const { email } = req.validated.body as { email: string }
  await authService.forgotPassword(email)
  response(res, 200, 'If this email is registered, a reset link has been sent.')
}

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  const { token, password } = req.validated.body as { token: string; password: string }
  await authService.resetPassword(token, password)
  response(res, 200, 'Password reset successful. Please login.')
}

export const getMe = async (req: Request, res: Response): Promise<void> => {
  const user = await authService.getMe(req.user!.userId)
  response(res, 200, 'Profile retrieved successfully', user)
}

export const updateMe = async (req: Request, res: Response): Promise<void> => {
  const data = req.validated.body as { name: string }
  const user = await authService.updateMe(req.user!.userId, data)
  response(res, 200, 'Profile updated successfully', user)
}

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  const data = req.validated.body as Record<string, unknown>
  const user = await authService.updateProfile(req.user!.userId, data as Parameters<typeof authService.updateProfile>[1])
  response(res, 200, 'Profile updated successfully', user)
}

export const changePassword = async (req: Request, res: Response): Promise<void> => {
  const { currentPassword, newPassword } = req.validated.body as { currentPassword: string; newPassword: string }
  await authService.changePassword(req.user!.userId, currentPassword, newPassword)
  response(res, 200, 'Password changed successfully')
}
