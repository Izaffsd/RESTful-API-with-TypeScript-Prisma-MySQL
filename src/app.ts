import express, { Application } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { pinoHttp } from 'pino-http'
import cookieParser from 'cookie-parser'
import routes from './routes/index.js'
import { errorHandler } from './middleware/errorHandler.middleware.js'
import { requestId } from './middleware/requestId.middleware.js'
import { apiRateLimit } from './middleware/rateLimit.middleware.js'
import { response } from './utils/response.js'
import { env } from './config/env.js'
import logger from './utils/logger.js'
import { requestLogFields } from './utils/requestLogFields.js'

const app: Application = express()

const corsOrigins = env.FRONTEND_URL
  ? env.FRONTEND_URL.split(',').map((o) => o.trim()).filter(Boolean)
  : ['http://localhost:3000', 'http://localhost:5173']

app.use(requestId)
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(pinoHttp({
  logger,
  // Reduce log spam: only log when it's an error (>= 400) or an exception.
  // Normal 2xx/3xx requests will be silent.
  customLogLevel(_req, res, err) {
    const synthetic =
      err && typeof err.message === 'string' && err.message.startsWith('failed with status code')
    if (err && !synthetic) {
      return 'error'
    }
    if (res.statusCode >= 500) {
      return 'error'
    }
    if (res.statusCode >= 400) {
      return 'warn'
    }
    return 'silent'
  },
  customProps(req, res) {
    const code = res.statusCode
    const base =
      code >= 500
        ? { kind: 'http_access' as const, severity: 'error' as const }
        : code >= 400
          ? { kind: 'http_access' as const, severity: 'warning' as const }
          : {}
    return { ...base, ...requestLogFields(req) }
  },
  // pino-http treats every 5xx as "failed" and attaches a synthetic Error (no throw in your code).
  customErrorMessage(_req, res, err) {
    const synthetic = typeof err?.message === 'string' && err.message.startsWith('failed with status code')
    if (synthetic) {
      const sev = res.statusCode >= 500 ? 'ERROR' : 'WARNING'
      return `[${sev}] request completed with HTTP ${res.statusCode}`
    }
    return 'request errored'
  },
  customErrorObject(_req, res, err, loggableObject) {
    const synthetic = typeof err?.message === 'string' && err.message.startsWith('failed with status code')
    if (synthetic) {
      const { err: _omit, ...rest } = loggableObject as Record<string, unknown> & { err?: unknown }
      return { ...rest, httpStatus: res.statusCode }
    }
    return loggableObject
  },
}))
app.use(cors({
  origin: corsOrigins.length > 0 ? corsOrigins : true,
  credentials: true,
}))
app.use(express.json())
app.use(cookieParser())

app.use('/api/v1', apiRateLimit)
app.use('/api/v1', routes)

app.use(express.static('public'))

app.use((_req, res) => {
  response(res, 404, 'Resource not found', null, 'RESOURCE_NOT_FOUND_404')
})

app.use(errorHandler)

export default app
