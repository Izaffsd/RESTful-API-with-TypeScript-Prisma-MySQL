import { z } from 'zod'
import 'dotenv/config'

const envSchema = z.object({
  PORT: z.coerce.number({ message: 'PORT is required' }),
  NODE_ENV: z.enum(['development', 'production', 'test'], { message: 'NODE_ENV is required' }),
  APP_URL: z.string().min(1, 'APP_URL is required'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DB_HOST: z.string().min(1, 'DB_HOST is required'),
  DB_USER: z.string().min(1, 'DB_USER is required'),
  DB_PASSWORD: z.string({ message: 'DB_PASSWORD is required' }),
  DB_NAME: z.string().min(1, 'DB_NAME is required'),
  JWT_ACCESS_SECRET: z.string().min(1, 'JWT_ACCESS_SECRET is required'),
  JWT_REFRESH_SECRET: z.string().min(1, 'JWT_REFRESH_SECRET is required'),
  JWT_ACCESS_EXPIRES: z.string().min(1, 'JWT_ACCESS_EXPIRES is required'),
  JWT_REFRESH_EXPIRES: z.string().min(1, 'JWT_REFRESH_EXPIRES is required'),
  RESEND_API_KEY: z.string().min(1, 'RESEND_API_KEY is required'),
  FROM_EMAIL: z.string().min(1, 'FROM_EMAIL is required'),
  RESEND_TEST_RECIPIENT: z.string().email().optional(), // In dev, Resend only allows sending to this address; other recipients get URL in logs only
})

const result = envSchema.safeParse(process.env)
if (!result.success) {
  console.error('Invalid environment configuration:', result.error.issues)
  process.exit(1)
}

export const env = result.data
