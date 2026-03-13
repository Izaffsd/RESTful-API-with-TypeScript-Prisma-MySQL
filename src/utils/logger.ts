import pino from 'pino'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const logsDir = path.join(__dirname, '..', '..', 'logs')
fs.mkdirSync(logsDir, { recursive: true })

const isDev = process.env.NODE_ENV === 'development'

const logger = pino({
  level: 'info',
  transport: isDev
    ? {
        targets: [
          { target: 'pino-pretty', options: { colorize: true } },
          { target: 'pino/file', level: 'warn', options: { destination: path.join(logsDir, 'error.log'), append: true } },
        ],
      }
    : {
        targets: [
          { target: 'pino/file', options: { destination: 1 } },
          { target: 'pino/file', level: 'warn', options: { destination: path.join(logsDir, 'error.log'), append: true } },
        ],
      },
})

export default logger
