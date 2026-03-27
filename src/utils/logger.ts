import pino from 'pino'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const logsDir = path.join(__dirname, '..', '..', 'logs')
fs.mkdirSync(logsDir, { recursive: true })

const errorLogPath = path.join(logsDir, 'error.log')
/** Warn+ only — keeps error.log small; info/debug stay on console in dev / stdout in prod */
const warnFileTarget = {
  target: 'pino/file',
  level: 'warn' as const,
  options: { destination: errorLogPath, append: true },
}

const isDev = process.env.NODE_ENV === 'development'
const targets = isDev
  ? [{ target: 'pino-pretty', options: { colorize: true } }, warnFileTarget]
  : [{ target: 'pino/file', options: { destination: 1 } }, warnFileTarget]

const logger = pino({
  level: 'info',
  timestamp: pino.stdTimeFunctions.isoTime,
  transport: { targets },
})

export default logger
