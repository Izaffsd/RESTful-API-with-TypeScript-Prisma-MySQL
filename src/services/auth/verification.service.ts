import crypto from 'node:crypto'
import prisma from '../../config/db.js'
import { supabase, supabaseAdmin } from '../../config/supabase.js'
import { resend } from '../../config/resend.js'
import { AppError } from '../../utils/AppError.js'
import { env } from '../../config/env.js'
import logger from '../../utils/logger.js'
import { storeEmailVerifyOtp, verifyAndConsumeEmailOtp } from '../../redis/emailVerifyOtp.js'
import { findAuthUserByEmail } from '../../utils/authUserLookup.js'
import { sendEmailVerifyOtpEmail } from '../../utils/emails/emailVerifyOtp.email.js'

export const resendVerification = async (email: string) => {
  const emailNorm = email.trim().toLowerCase()
  const from = env.FROM_EMAIL?.trim()

  if (resend && from) {
    const authUser = await findAuthUserByEmail(emailNorm)
    if (authUser && !authUser.email_confirmed_at) {
      const code = String(crypto.randomInt(100_000, 1_000_000))
      try {
        await storeEmailVerifyOtp(emailNorm, code)
      } catch {
        const { error } = await supabase.auth.resend({ type: 'signup', email: emailNorm })
        if (error) {
          logger.warn(
            { email: emailNorm, supabaseError: error.message, status: error.status, code: error.code },
            'Supabase resend verification failed (OTP Redis fallback)',
          )
        }
        return
      }
      const dbUser = await prisma.user.findUnique({
        where: { userId: authUser.id },
        select: { name: true },
      })
      const sent = await sendEmailVerifyOtpEmail({
        to: authUser.email ?? emailNorm,
        recipientName: dbUser?.name ?? null,
        code,
        teamName: 'Monash College',
      })
      if (!sent) {
        const { error } = await supabase.auth.resend({ type: 'signup', email: emailNorm })
        if (error) {
          logger.warn(
            { email: emailNorm, supabaseError: error.message, status: error.status, code: error.code },
            'Supabase resend verification failed (after OTP email failure)',
          )
        }
      }
      return
    }
  }

  const { error } = await supabase.auth.resend({ type: 'signup', email: emailNorm })
  if (error) {
    logger.warn(
      { email: emailNorm, supabaseError: error.message, status: error.status, code: error.code },
      'Supabase resend verification failed',
    )
  }
}

export const verifyEmailWithOtp = async (email: string, code: string) => {
  const emailNorm = email.trim().toLowerCase()
  const ok = await verifyAndConsumeEmailOtp(emailNorm, code)
  if (!ok) {
    throw new AppError('Invalid or expired verification code', 400, 'INVALID_OTP_400')
  }
  const authUser = await findAuthUserByEmail(emailNorm)
  if (!authUser) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND_404')
  }
  if (authUser.email_confirmed_at) {
    return { alreadyVerified: true as const }
  }
  const { error } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
    email_confirm: true,
  })
  if (error) {
    logger.error({ supabaseError: error.message, userId: authUser.id }, 'Supabase email confirm failed')
    throw new AppError('Email verification failed', 400, 'VERIFY_FAILED_400')
  }
  return { alreadyVerified: false as const }
}
