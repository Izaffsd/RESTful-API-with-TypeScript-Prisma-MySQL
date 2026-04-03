import { z } from 'zod'
import 'dotenv/config'

const envSchema = z.object({
  PORT: z.coerce.number({ message: 'PORT is required' }),
  NODE_ENV: z.enum(['development', 'production', 'test'], { message: 'NODE_ENV is required' }),
  APP_URL: z.string().min(1, 'APP_URL is required'),
  FRONTEND_URL: z.string().min(1).optional().default('http://localhost:3000'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DIRECT_URL: z.string().min(1, 'DIRECT_URL is required'),
  SUPABASE_URL: z.string().min(1, 'SUPABASE_URL is required'),
  SUPABASE_ANON_KEY: z.string().min(1, 'SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_KEY: z.string().min(1, 'SUPABASE_SERVICE_KEY is required'),
  /** Optional — security alert when password changes (https://resend.com) */
  RESEND_API_KEY: z.string().optional().default(''),
  FROM_EMAIL: z.string().optional().default(''),
  SUPPORT_EMAIL: z.string().optional().default(''),
  /** Shown in password-change emails (e.g. "Kuala Lumpur, MY") when set */
  SECURITY_EMAIL_LOCATION_HINT: z.string().optional().default(''),
  UPSTASH_REDIS_REST_URL: z.string().min(1, 'UPSTASH_REDIS_REST_URL is required'),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1, 'UPSTASH_REDIS_REST_TOKEN is required'),
  RATE_LIMIT_AUTH_MAX: z.coerce.number().int().positive().default(10),
  RATE_LIMIT_AUTH_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
  RATE_LIMIT_LOGIN_HINT_MAX: z.coerce.number().int().positive().default(20),
  RATE_LIMIT_LOGIN_HINT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
  RATE_LIMIT_API_MAX: z.coerce.number().int().positive().default(300),
  RATE_LIMIT_API_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
  /** HMAC-style pepper for email verification OTP hashes (falls back to SUPABASE_SERVICE_KEY if empty). */
  EMAIL_OTP_PEPPER: z.string().optional().default(''),
  EMAIL_OTP_TTL_SEC: z.coerce.number().int().positive().default(900),
  PASSWORD_RESET_TTL_SEC: z.coerce.number().int().positive().default(3600),
  REDIS_REFRESH_FP_TTL_SEC: z.coerce.number().int().positive().default(2_592_000),
  /** Cache window for Supabase signed URLs (keep below storage signed URL TTL). */
  REDIS_SIGNED_URL_CACHE_TTL_SEC: z.coerce.number().int().positive().default(3000),
  /** When JWT has no exp claim, blacklist TTL for revoked access tokens. */
  REDIS_ACCESS_BLACKLIST_FALLBACK_TTL_SEC: z.coerce.number().int().positive().default(900),
  /**
   * Expose Swagger UI at GET /api/v1/docs (and /api/v1/docs/).
   * Default: off in production, on otherwise. Set API_DOCS_ENABLED=false to disable locally.
   */
  API_DOCS_ENABLED: z.preprocess(
    (v) => {
      if (v === undefined || v === '') {
        return process.env.NODE_ENV === 'production' ? false : true
      }
      if (v === 'false' || v === '0') return false
      return true
    },
    z.boolean(),
  ),
})

const result = envSchema.safeParse(process.env)
if (!result.success) {
  console.error('Invalid environment configuration:', result.error.issues)
  process.exit(1)
}

export const env = result.data
