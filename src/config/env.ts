import { z } from 'zod'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import 'dotenv/config'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const logsDir = path.join(__dirname, '..', '..', 'logs')

const envSchema = z.object({
  PORT: z.coerce.number({ message: 'PORT is required' }),
  NODE_ENV: z.enum(['development', 'production', 'test'], { message: 'NODE_ENV is required' }),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DB_HOST: z.string().min(1, 'DB_HOST is required'),
  DB_USER: z.string().min(1, 'DB_USER is required'),
  DB_PASSWORD: z.string({ message: 'DB_PASSWORD is required' }),
  DB_NAME: z.string().min(1, 'DB_NAME is required'),
})

const result = envSchema.safeParse(process.env)
if (!result.success) {
  console.error('Invalid environment configuration')
  console.error(result.error.issues)

  const logEntry = JSON.stringify({
    level: 'error',
    message: 'Invalid environment variables',
    issues: result.error.issues,
    timestamp: new Date().toISOString(),
  }) + '\n'

  fs.mkdirSync(logsDir, { recursive: true })
  fs.appendFileSync(path.join(logsDir, 'error.log'), logEntry)

  process.exit(1)
}

export const env = result.data