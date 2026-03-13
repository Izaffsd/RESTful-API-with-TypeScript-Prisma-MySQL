import type { Request, Response } from 'express'
import { response } from '../utils/response.js'
import * as authService from '../services/auth.service.js'
import { setRefreshCookie, clearRefreshCookie } from '../utils/cookies.js'

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

export const refresh = async (req: Request, res: Response): Promise<void> => {
  const refreshToken = req.cookies?.refreshToken ?? (req.body as { refreshToken?: string })?.refreshToken
  if (!refreshToken) {
    response(res, 401, 'No refresh token', null, 'UNAUTHORIZED_401')
    return
  }
  const result = await authService.refreshTokens(refreshToken)
  if (result.refreshToken) {
    setRefreshCookie(res, result.refreshToken)
  }
  response(res, 200, 'Token refreshed successfully', { accessToken: result.accessToken })
}

export const logout = async (req: Request, res: Response): Promise<void> => {
  const token = req.headers.authorization?.slice(7) ?? ''
  await authService.logout(req.user!.userId, token)
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
  await authService.forgotPassword(email)
  response(res, 200, 'If this email is registered, a reset link has been sent.')
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
  const user = await authService.updateProfile(req.user!.userId, req.user!.type, data as Parameters<typeof authService.updateProfile>[2])
  response(res, 200, 'Profile updated successfully', user)
}

export const changePassword = async (req: Request, res: Response): Promise<void> => {
  const { currentPassword, newPassword } = req.validated.body as { currentPassword: string; newPassword: string }
  await authService.changePassword(req.user!.userId, currentPassword, newPassword)
  response(res, 200, 'Password changed successfully')
}
