import { z } from 'zod'

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one digit')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Full name is required').max(100),
  email: z.string().trim().toLowerCase().email('Invalid email format'),
  password,
  confirmPassword: z.string(),
  studentNumber: z.string().trim().toUpperCase().optional(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
})

export const resendVerificationSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email format'),
})

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email format'),
})

export const verifyEmailSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email format'),
  code: z.string().trim().regex(/^\d{6}$/, 'Code must be 6 digits'),
})

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(1, 'Reset token is required'),
  newPassword: password,
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

/** After browser OAuth, send Supabase refresh_token once so the API can set httpOnly refresh cookie (same as email login). */
export const oauthSessionSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
  /** `login` = Google from login/register; `link` = Profile → Connect Google; `password` = after signInWithPassword (must not trigger Scenario 5 block). */
  oauthFlow: z.enum(['login', 'link', 'password']).optional(),
  /** After GOOGLE_LINK_CONSENT_409 on login Google; user confirmed linking Google to an existing verified manual account. */
  googleLinkConsent: z.boolean().optional(),
})

export const loginHintSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email format'),
})

export const updateMeSchema = z.object({
  name: z.string().trim().min(1, 'Full name is required').max(100),
})

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().optional(),
    newPassword: password,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine(
    (d) => {
      const cur = d.currentPassword?.trim()
      if (!cur) return true
      return d.newPassword !== cur
    },
    {
      message: 'New password must be different from your current password',
      path: ['newPassword'],
    },
  )
  .superRefine((data, ctx) => {
    const cur = data.currentPassword?.trim()
    if (!cur) return
    const parsed = password.safeParse(cur)
    if (parsed.success) return
    for (const issue of parsed.error.issues) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: issue.message,
        path: ['currentPassword'],
      })
    }
  })
