import { resend } from '../../config/resend.js'
import { env } from '../../config/env.js'
import logger from '../logger.js'

type PasswordResetEmailInput = {
  to: string
  recipientName: string | null
  resetUrl: string
  teamName: string
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function sendPasswordResetLinkEmail(input: PasswordResetEmailInput): Promise<boolean> {
  const from = env.FROM_EMAIL?.trim()
  if (!resend || !from) {
    logger.debug('Skipping password reset email: RESEND_API_KEY or FROM_EMAIL not set')
    return false
  }

  const firstName = (input.recipientName ?? '').trim().split(/\s+/)[0] || 'there'
  const subject = 'Reset your password'

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111;max-width:560px;margin:0 auto;padding:24px;">
  <p>Hi ${escapeHtml(firstName)},</p>
  <p>We received a request to reset your password. Click the button below to choose a new one.</p>
  <p>
    <a href="${escapeHtml(input.resetUrl)}"
       style="display:inline-block;padding:10px 20px;background:#111827;color:#fff;
              text-decoration:none;border-radius:6px;font-weight:500;">
      Reset password
    </a>
  </p>
  <p style="font-size:14px;color:#6b7280;">This link expires in ${Math.round(env.PASSWORD_RESET_TTL_SEC / 60)} minutes. If you did not request a reset, you can ignore this email.</p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
  <p style="font-size:13px;color:#6b7280;">${escapeHtml(input.teamName)}</p>
</body>
</html>`

  const text = [
    `Hi ${firstName},`,
    '',
    'Reset your password using this link:',
    input.resetUrl,
    '',
    `Link expires in ${Math.round(env.PASSWORD_RESET_TTL_SEC / 60)} minutes.`,
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
    logger.warn({ resendError: error }, 'Resend password reset email failed')
    return false
  }

  logger.info({ to: input.to, subject, id: data?.id }, 'Password reset email sent')
  return true
}
