import prisma from '../../config/db.js'
import { supabase, supabaseAdmin } from '../../config/supabase.js'
import { resend } from '../../config/resend.js'
import { AppError } from '../../utils/AppError.js'
import { env } from '../../config/env.js'
import logger from '../../utils/logger.js'
import {
  consumePasswordResetToken,
  generatePasswordResetRawToken,
  storePasswordResetToken,
} from '../../redis/passwordResetToken.js'
import { findAuthUserByEmail } from '../../utils/authUserLookup.js'
import { sendPasswordResetLinkEmail } from '../../utils/emails/passwordReset.email.js'

async function forgotPasswordViaSupabase(emailNorm: string): Promise<{ sent: boolean }> {
  const { error } = await supabase.auth.resetPasswordForEmail(emailNorm, {
    redirectTo: `${env.FRONTEND_URL}/reset-password`,
  })
  if (error) {
    logger.warn(
      {
        email: emailNorm,
        redirectTo: `${env.FRONTEND_URL}/reset-password`,
        supabaseError: error.message,
        status: error.status,
        code: error.code,
      },
      'Supabase forgot password failed',
    )
    return { sent: false }
  }
  return { sent: true }
}

export const forgotPassword = async (email: string): Promise<{ sent: boolean }> => {
  const emailNorm = email.trim().toLowerCase()
  const from = env.FROM_EMAIL?.trim()

  if (resend && from) {
    const authUser = await findAuthUserByEmail(emailNorm)
    if (!authUser) {
      return { sent: true }
    }
    const raw = generatePasswordResetRawToken()
    try {
      await storePasswordResetToken(raw, authUser.id)
    } catch {
      return forgotPasswordViaSupabase(emailNorm)
    }
    const dbUser = await prisma.user.findUnique({
      where: { userId: authUser.id },
      select: { name: true },
    })
    const base = env.FRONTEND_URL.replace(/\/$/, '')
    const resetUrl = `${base}/reset-password?token=${raw}`
    const sent = await sendPasswordResetLinkEmail({
      to: authUser.email ?? emailNorm,
      recipientName: dbUser?.name ?? null,
      resetUrl,
      teamName: 'Monash College Security Team',
    })
    if (!sent) {
      return forgotPasswordViaSupabase(emailNorm)
    }
    return { sent: true }
  }

  return forgotPasswordViaSupabase(emailNorm)
}

export const resetPasswordWithToken = async (token: string, newPassword: string) => {
  const userId = await consumePasswordResetToken(token.trim())
  if (!userId) {
    throw new AppError('Invalid or expired reset link', 400, 'RESET_TOKEN_INVALID_400')
  }
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    password: newPassword,
  })
  if (error) {
    logger.error({ supabaseError: error.message, userId }, 'Supabase password reset updateUserById failed')
    throw new AppError('Password reset failed', 400, 'RESET_FAILED_400')
  }
  await prisma.user.update({
    where: { userId },
    data: { lastPasswordChangeAt: new Date() },
  })
}
