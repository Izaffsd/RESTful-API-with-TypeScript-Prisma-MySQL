import express from 'express'
import path from 'node:path'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import routes from './routes/index.js'
import { errorHandler } from './middleware/errorHandler.middleware.js'
import { requestId } from './middleware/requestId.middleware.js'
import { apiLimiter } from './middleware/rateLimit.middleware.js'
import { response } from './utils/response.js'
import { env } from './config/env.js'

const app = express()

const corsOrigins = env.FRONTEND_URL
  ? env.FRONTEND_URL.split(',').map((o) => o.trim()).filter(Boolean)
  : ['http://localhost:3000', 'http://localhost:5173']

app.use(requestId)
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'))
app.use(cors({
  origin: corsOrigins.length > 0 ? corsOrigins : true,
  credentials: true,
}))
app.use(express.json())
app.use(cookieParser())
app.use(apiLimiter)

app.use('/uploads', express.static(path.resolve('uploads')))

app.use('/api', routes)

app.use(express.static('public'))

app.use((_req, res) => {
  response(res, 404, 'Resource not found', null, 'RESOURCE_NOT_FOUND_404')
})

app.use(errorHandler)

export default app
