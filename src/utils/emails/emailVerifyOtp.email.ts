import { resend } from '../../config/resend.js'
import { env } from '../../config/env.js'
import logger from '../logger.js'

type EmailVerifyOtpInput = {
  to: string
  recipientName: string | null
  code: string
  teamName: string
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function sendEmailVerifyOtpEmail(input: EmailVerifyOtpInput): Promise<boolean> {
  const from = env.FROM_EMAIL?.trim()
  if (!resend || !from) {
    logger.debug('Skipping verify OTP email: RESEND_API_KEY or FROM_EMAIL not set')
    return false
  }

  const firstName = (input.recipientName ?? '').trim().split(/\s+/)[0] || 'there'
  const subject = 'Your verification code'

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111;max-width:560px;margin:0 auto;padding:24px;">
  <p>Hi ${escapeHtml(firstName)},</p>
  <p>Use this code to verify your email address:</p>
  <p style="font-size:28px;letter-spacing:0.2em;font-weight:700;margin:20px 0;">${escapeHtml(input.code)}</p>
  <p style="font-size:14px;color:#6b7280;">This code expires in ${Math.round(env.EMAIL_OTP_TTL_SEC / 60)} minutes. If you did not request it, you can ignore this email.</p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
  <p style="font-size:13px;color:#6b7280;">${escapeHtml(input.teamName)}</p>
</body>
</html>`

  const text = [
    `Hi ${firstName},`,
    '',
    'Your email verification code is:',
    input.code,
    '',
    `This code expires in ${Math.round(env.EMAIL_OTP_TTL_SEC / 60)} minutes.`,
    '',
    input.teamName,
  ].join('\n')

  const { data, error } = await resend.emails.send({
    from,
    to: [input.to],
    subject,
    html,
    text,
  })

  if (error) {
    logger.warn({ resendError: error }, 'Resend verification OTP email failed')
    return false
  }

  logger.info({ to: input.to, subject, id: data?.id }, 'Verification OTP email sent')
  return true
}
