import { resend } from '../../config/resend.js'
import { env } from '../../config/env.js'
import logger from '../logger.js'

type PasswordChangeEmailInput = {
  to: string
  recipientName: string | null
  wasExistingPassword: boolean
  when: Date
  deviceLabel: string
  locationHint: string
  resetUrl: string
  supportEmail: string
  teamName: string
}

function formatWhen(d: Date) {
  const timeZone = 'Asia/Kuala_Lumpur'
  return {
    dateLine: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone }),
    timeLine: d.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone }),
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export type PasswordChangeEmailSendResult = {
  sent: boolean
  /** Why the alert email was not delivered (for API/UI when `sent` is false). */
  failureReason?: string
}

export async function sendPasswordChangeSecurityEmail(
  input: PasswordChangeEmailInput,
): Promise<PasswordChangeEmailSendResult> {
  const from = env.FROM_EMAIL?.trim()
  if (!resend || !from) {
    logger.debug('Skipping password-change email: RESEND_API_KEY or FROM_EMAIL not set')
    return {
      sent: false,
      failureReason: 'Security email is not configured on the server (missing RESEND_API_KEY or FROM_EMAIL).',
    }
  }

  const firstName = (input.recipientName ?? '').trim().split(/\s+/)[0] || 'there'
  const action = input.wasExistingPassword ? 'changed' : 'added to your account'
  const subject = input.wasExistingPassword
    ? 'Your password was changed'
    : 'A password was added to your account'
  const { dateLine, timeLine } = formatWhen(input.when)

  const locationRow = input.locationHint
    ? `<tr>
        <td style="padding:4px 12px 4px 0;color:#555;">Location:</td>
        <td>${escapeHtml(input.locationHint)}</td>
       </tr>`
    : ''

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111;max-width:560px;margin:0 auto;padding:24px;">

  <p>Hi ${escapeHtml(firstName)},</p>
  <p>Your account password was recently <strong>${action}</strong>.</p>

  <table style="margin:16px 0;font-size:14px;border-collapse:collapse;">
    <tr>
      <td style="padding:4px 12px 4px 0;color:#555;">Date:</td>
      <td>${escapeHtml(dateLine)}</td>
    </tr>
    <tr>
      <td style="padding:4px 12px 4px 0;color:#555;">Time:</td>
      <td>${escapeHtml(timeLine)} (Malaysia time)</td>
    </tr>
    <tr>
      <td style="padding:4px 12px 4px 0;color:#555;">Device:</td>
      <td>${escapeHtml(input.deviceLabel)}</td>
    </tr>
    ${locationRow}
  </table>

  <p>If this was you, no action is needed.</p>
  <p>If this was <strong>not</strong> you, secure your account immediately:</p>

  <p>
    <a href="${escapeHtml(input.resetUrl)}"
       style="display:inline-block;padding:10px 20px;background:#111827;color:#fff;
              text-decoration:none;border-radius:6px;font-weight:500;">
      Reset my password
    </a>
  </p>

  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />

  <p style="font-size:13px;color:#6b7280;">
    ${escapeHtml(input.teamName)}<br />
    Need help? Contact
    <a href="mailto:${escapeHtml(input.supportEmail)}">${escapeHtml(input.supportEmail)}</a>
  </p>

</body>
</html>`

  const text = [
    `Hi ${firstName},`,
    '',
    `Your account password was recently ${action}.`,
    '',
    `Date:   ${dateLine}`,
    `Time:   ${timeLine} (Malaysia time)`,
    `Device: ${input.deviceLabel}`,
    ...(input.locationHint ? [`Location: ${input.locationHint}`] : []),
    '',
    'If this was you, no action is needed.',
    '',
    'If this was NOT you, reset your password immediately:',
    input.resetUrl,
    '',
    `${input.teamName} — ${input.supportEmail}`,
  ].join('\n')

  const { data, error } = await resend.emails.send({
    from,
    to: [input.to],
    subject,
    html,
    text,
  })

  if (error) {
    logger.warn({ resendError: error }, 'Resend password-change email failed')
    const msg =
      typeof error === 'object' && error !== null && 'message' in error && typeof (error as { message: unknown }).message === 'string'
        ? (error as { message: string }).message
        : 'The security alert email could not be sent.'
    return { sent: false, failureReason: msg }
  }

  logger.info({ to: input.to, subject, id: data?.id }, 'Password change security email sent')
  return { sent: true }
}
