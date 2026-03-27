import { Router } from 'express'
import * as authController from '../controllers/auth.controller.js'
import { validateZod } from '../middleware/validateZod.middleware.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { authRateLimit, loginHintRateLimit } from '../middleware/rateLimit.middleware.js'
import {
  registerSchema,
  loginSchema,
  oauthSessionSchema,
  loginHintSchema,
  resendVerificationSchema,
  forgotPasswordSchema,
  verifyEmailSchema,
  resetPasswordSchema,
  updateMeSchema,
  changePasswordSchema,
} from '../validations/authValidation.js'
import { updateProfileSchema } from '../validations/profileValidation.js'

const router = Router()

router.post('/register', authRateLimit, validateZod(registerSchema, 'body'), authController.register)
router.post('/login', authRateLimit, validateZod(loginSchema, 'body'), authController.login)
router.post('/login-hint', loginHintRateLimit, validateZod(loginHintSchema, 'body'), authController.loginHint)
router.post('/oauth-session', authRateLimit, validateZod(oauthSessionSchema, 'body'), authController.oauthSession)
router.post('/refresh', authRateLimit, authController.refresh)
router.post('/logout', authenticate, authController.logout)

router.post('/resend-verification', authRateLimit, validateZod(resendVerificationSchema, 'body'), authController.resendVerification)

router.post(
  '/forgot-password',
  authRateLimit,
  validateZod(forgotPasswordSchema, 'body'),
  authController.forgotPassword,
)

router.post(
  '/verify-email',
  authRateLimit,
  validateZod(verifyEmailSchema, 'body'),
  authController.verifyEmail,
)

router.post(
  '/reset-password',
  authRateLimit,
  validateZod(resetPasswordSchema, 'body'),
  authController.resetPassword,
)

router.get('/me', authenticate, authController.getMe)
router.patch('/me', authenticate, validateZod(updateMeSchema, 'body'), authController.updateMe)
router.patch('/me/profile', authenticate, validateZod(updateProfileSchema, 'body'), authController.updateProfile)
router.patch('/me/password', authenticate, validateZod(changePasswordSchema, 'body'), authController.changePassword)

export default router
