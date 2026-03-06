import { z } from 'zod'
import fs from 'node:fs'
import 'dotenv/config'

const envSchema = z.object({
  PORT: z.coerce.number({ message: 'PORT is required' }),
  NODE_ENV: z.enum(['development', 'production', 'test'], { message: 'NODE_ENV is required' }),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DB_HOST: z.string().min(1, 'DB_HOST is required'),
  DB_USER: z.string().min(1, 'DB_USER is required'),
  DB_PASSWORD: z.string({ message: 'DB_PASSWORD is required' }),
  DB_NAME: z.string().min(1, 'DB_NAME is required'),
})

const logError = (message: string, data: unknown) => {
  const entry = JSON.stringify({ level: 'error', message, data, timestamp: new Date().toISOString() }) + '\n'
  fs.mkdirSync('logs', { recursive: true })
  fs.appendFileSync('logs/error.log', entry)
}

const result = envSchema.safeParse(process.env)
if (!result.success) {
  console.error('Invalid environment configuration')
  console.error(result.error.issues)
  logError('Invalid environment variables', result.error.issues)
  process.exit(1)
}

export const env = result.data