import { Router } from 'express'
import * as authController from '../controllers/auth.controller.js'
import { validateZod } from '../middleware/validateZod.middleware.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { authLimiter } from '../middleware/rateLimit.middleware.js'
import {
  registerSchema, loginSchema, verifyEmailQuerySchema,
  resendVerificationSchema, forgotPasswordSchema, resetPasswordSchema,
  updateMeSchema, changePasswordSchema,
} from '../validations/authValidation.js'
import { updateProfileSchema } from '../validations/profileValidation.js'

const router = Router()

router.post('/register', authLimiter, validateZod(registerSchema, 'body'), authController.register)
router.post('/login', authLimiter, validateZod(loginSchema, 'body'), authController.login)
router.post('/refresh', authLimiter, authController.refresh)
router.post('/logout', authenticate, authController.logout)

router.get('/verify-email', validateZod(verifyEmailQuerySchema, 'query'), authController.verifyEmail)
router.post('/resend-verification', authLimiter, validateZod(resendVerificationSchema, 'body'), authController.resendVerification)
router.post('/forgot-password', authLimiter, validateZod(forgotPasswordSchema, 'body'), authController.forgotPassword)
router.post('/reset-password', authLimiter, validateZod(resetPasswordSchema, 'body'), authController.resetPassword)

router.get('/me', authenticate, authController.getMe)
router.patch('/me', authenticate, validateZod(updateMeSchema, 'body'), authController.updateMe)
router.patch('/me/profile', authenticate, validateZod(updateProfileSchema, 'body'), authController.updateProfile)
router.patch('/me/password', authenticate, validateZod(changePasswordSchema, 'body'), authController.changePassword)

export default router
