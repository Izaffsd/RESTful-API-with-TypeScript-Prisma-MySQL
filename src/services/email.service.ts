import { resend } from '../config/resend.js'
import { env } from '../config/env.js'
import logger from '../utils/logger.js'

const BRAND_COLOR = '#003087'

const baseTemplate = (title: string, body: string) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f4f4f4">
<div style="max-width:600px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1)">
  <div style="background:${BRAND_COLOR};padding:24px;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:22px">Monash College</h1>
  </div>
  <div style="padding:32px">
    <h2 style="color:#333;margin:0 0 16px">${title}</h2>
    ${body}
  </div>
  <div style="background:#f9f9f9;padding:16px;text-align:center;font-size:12px;color:#999">
    &copy; ${new Date().getFullYear()} Monash College Management System
  </div>
</div>
</body>
</html>`

const actionButton = (url: string, label: string) =>
  `<div style="text-align:center;margin:24px 0"><a href="${url}" style="display:inline-block;padding:12px 32px;background:${BRAND_COLOR};color:#fff;text-decoration:none;border-radius:6px;font-weight:bold">${label}</a></div>`

export const sendVerificationEmail = async (email: string, name: string, token: string) => {
  const url = `${env.APP_URL}/api/auth/verify-email?token=${token}`

  if (env.NODE_ENV === 'development') {
    logger.info(`[DEV] Verification URL for ${email}: ${url}`)
    // Resend test mode only allows sending to your account email; for other addresses skip send and use URL from logs
    if (env.RESEND_TEST_RECIPIENT && email.toLowerCase() !== env.RESEND_TEST_RECIPIENT.toLowerCase()) {
      logger.info(`[DEV] Skipping Resend (test mode allows only ${env.RESEND_TEST_RECIPIENT}). Use the URL above to verify.`)
      return
    }
    logger.info(`[DEV] Sending email via Resend…`)
  }

  const { data, error } = await resend.emails.send({
    from: env.FROM_EMAIL,
    to: email,
    subject: 'Verify your email — Monash College',
    html: baseTemplate('Verify Your Email', `
      <p style="color:#555;line-height:1.6">Hi ${name},</p>
      <p style="color:#555;line-height:1.6">Welcome to Monash College Management System. Please verify your email address to activate your account.</p>
      ${actionButton(url, 'Verify Email')}
      <p style="color:#999;font-size:13px">This link expires in 24 hours. If you didn't create this account, please ignore this email.</p>
    `),
  })

  if (error) {
    logger.error(`[Email] Verification send failed for ${email}:`, error)
    throw new Error(`Failed to send verification email: ${error.message}`)
  }
  if (data?.id && env.NODE_ENV === 'development') {
    logger.info(`[DEV] Email sent successfully (Resend id: ${data.id})`)
  }
}

export const sendPasswordResetEmail = async (email: string, name: string, token: string) => {
  // Link to frontend so SPA can show reset form and POST token to API
  const url = `${env.APP_URL}?token=${encodeURIComponent(token)}`

  if (env.NODE_ENV === 'development') {
    logger.info(`[DEV] Password reset URL for ${email}: ${url}`)
  }

  await resend.emails.send({
    from: env.FROM_EMAIL,
    to: email,
    subject: 'Reset your password — Monash College',
    html: baseTemplate('Reset Your Password', `
      <p style="color:#555;line-height:1.6">Hi ${name},</p>
      <p style="color:#555;line-height:1.6">We received a request to reset your password. Click the button below to set a new password.</p>
      ${actionButton(url, 'Reset Password')}
      <p style="color:#999;font-size:13px">This link expires in 1 hour. If you didn't request this, please ignore this email.</p>
    `),
  })
}

export const sendWelcomeEmail = async (email: string, name: string) => {
  await resend.emails.send({
    from: env.FROM_EMAIL,
    to: email,
    subject: 'Welcome to Monash College!',
    html: baseTemplate('Welcome!', `
      <p style="color:#555;line-height:1.6">Hi ${name},</p>
      <p style="color:#555;line-height:1.6">Your email has been verified and your account is now active. You can now log in and start using the system.</p>
      ${actionButton(`${env.APP_URL}`, 'Go to Dashboard')}
    `),
  })
}
