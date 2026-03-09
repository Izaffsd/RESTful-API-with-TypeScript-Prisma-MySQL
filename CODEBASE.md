# Monash College Management System — Codebase & API Reference

Backend REST API: **Express 5**, **TypeScript**, **Prisma 7**, **MySQL** (MariaDB adapter). Auth: JWT (access + httpOnly refresh cookie), Zod validation, role-based access (STUDENT, LECTURER, HEAD_LECTURER). File uploads via Multer; email via Resend; rate limiting, Helmet, CORS.

---

## 1. Directory tree

```
RESTful-API-with-TypeScript-Prisma-MySQL/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── server.ts
│   ├── app.ts
│   ├── config/
│   │   ├── db.ts
│   │   ├── env.ts
│   │   ├── multer.ts
│   │   └── resend.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── errorHandler.middleware.ts
│   │   ├── rateLimit.middleware.ts
│   │   ├── requestId.middleware.ts
│   │   └── validateZod.middleware.ts
│   ├── utils/
│   │   ├── AppError.ts
│   │   ├── logger.ts
│   │   ├── pagination.ts
│   │   ├── prismaErrors.ts
│   │   └── response.ts
│   ├── validations/
│   │   ├── authValidation.ts
│   │   ├── courseValidation.ts
│   │   ├── documentValidation.ts
│   │   ├── headLecturerValidation.ts
│   │   ├── lecturerValidation.ts
│   │   ├── paginationSchema.ts
│   │   ├── profileValidation.ts
│   │   └── studentValidation.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── courses.service.ts
│   │   ├── documents.service.ts
│   │   ├── email.service.ts
│   │   ├── headLecturers.service.ts
│   │   ├── lecturers.service.ts
│   │   ├── students.service.ts
│   │   └── token.service.ts
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── courses.controller.ts
│   │   ├── documents.controller.ts
│   │   ├── headLecturers.controller.ts
│   │   ├── lecturers.controller.ts
│   │   ├── me.controller.ts
│   │   ├── students.controller.ts
│   │   └── utility.controller.ts
│   ├── routes/
│   │   ├── index.ts
│   │   ├── auth.routes.ts
│   │   ├── me.routes.ts
│   │   ├── students.routes.ts
│   │   ├── courses.routes.ts
│   │   ├── lecturers.routes.ts
│   │   ├── headLecturers.routes.ts
│   │   └── documents.routes.ts
│   └── jobs/
│       └── tokenCleanup.ts
├── tsconfig.json
├── package.json
└── prisma.config.ts
```

---

## 2. API response format

- **Success**: `statusCode`, `success: true`, `message`, `data` (optional). For paginated lists: `meta` (page, limit, total, totalPages, hasNext, hasPrev) and `links` (self, next, prev, first, last).
- **Error**: `statusCode`, `success: false`, `message`, `errorCode`, `timestamp`, `errors` (array of `{ field, message }` for validation).
- **Error codes used**: `VALIDATION_ERROR_400`, `RESOURCE_NOT_FOUND_404`, `UNAUTHORIZED_401`, `FORBIDDEN_403`, `EMAIL_NOT_VERIFIED_403`, `ACCOUNT_INACTIVE_403`, `INVALID_CREDENTIALS_401`, `DUPLICATE_EMAIL_409`, `ACCOUNT_LOCKED_423`, `INVALID_TOKEN_400`, `RATE_LIMIT_429`, `UPLOAD_LIMIT_FILE_SIZE_400`, `UPLOAD_LIMIT_UNEXPECTED_FILE_400`, `NO_FILE_400`, `INTERNAL_SERVER_ERROR_500`, plus entity-specific (e.g. `STUDENT_NOT_FOUND_404`, `COURSE_NOT_FOUND_404`).

---

## 3. Schema summary

**Prisma enums**: UserType (STUDENT, LECTURER, HEAD_LECTURER), UserStatus (ACTIVE, INACTIVE, SUSPENDED), Gender (Male, Female), Race (Malay, Chinese, Indian, Others), State (Malaysian states), FileCategory (PROFILE_PICTURE, IC, TRANSCRIPT, DOCUMENT, OTHER), EntityType (STUDENT, LECTURER, HEAD_LECTURER).

**Prisma models**: User (auth, profile, role links), Profile (phone, gender, race, DOB, address), Student, Lecturer, HeadLecturer (each link User + optional Course/Documents), Course, Document (entityId, entityType, file fields, category, soft delete), TokenBlacklist.

**Zod schemas**: authValidation (register, login, verifyEmail query, resendVerification, forgotPassword, resetPassword, updateMe, changePassword); profileValidation (updateProfile); studentValidation (studentParams, studentQuery, createStudent, updateStudent); courseValidation (courseParams, createCourse, updateCourse); lecturerValidation (lecturerParams, createLecturer, updateLecturer); headLecturerValidation (headLecturerParams, createHeadLecturer, updateHeadLecturer); documentValidation (documentIdParams, studentDocParams, lecturerDocParams, headLecturerDocParams, uploadCategorySchema); paginationSchema (page, limit, search, sortBy, order).

---

## 4. API endpoints (base path `/api`)

| Method | Path | Auth | Roles | Validation | Description |
|--------|------|------|-------|------------|-------------|
| GET | / | No | - | - | Welcome message |
| GET | /health | No | - | - | Health + DB check |
| GET | /enums | JWT | Any | - | List enums |
| GET | /stats | JWT + verified | LECTURER, HEAD_LECTURER | - | Dashboard stats |
| POST | /auth/register | No (rate-limited) | - | registerSchema (body) | Register (student optional) |
| POST | /auth/login | No (rate-limited) | - | loginSchema (body) | Login, sets refresh cookie |
| POST | /auth/refresh | Cookie | - | - | Refresh access token |
| POST | /auth/logout | JWT | - | - | Logout, blacklist token |
| GET | /auth/verify-email | No | - | verifyEmailQuerySchema (query) | Verify email by token |
| POST | /auth/resend-verification | No (rate-limited) | - | resendVerificationSchema (body) | Resend verification email |
| POST | /auth/forgot-password | No (rate-limited) | - | forgotPasswordSchema (body) | Send reset email |
| POST | /auth/reset-password | No (rate-limited) | - | resetPasswordSchema (body) | Reset password with token |
| GET | /auth/me | JWT | - | - | Current user profile |
| PATCH | /auth/me | JWT | - | updateMeSchema (body) | Update name |
| PATCH | /auth/me/profile | JWT | - | updateProfileSchema (body) | Update profile |
| PATCH | /auth/me/password | JWT | - | changePasswordSchema (body) | Change password |
| GET | /me/student | JWT + verified | STUDENT | - | My student record |
| PATCH | /me/student | JWT + verified | STUDENT | mykadNumber (body) | Update my student (MyKad) |
| GET | /me/course | JWT + verified | STUDENT | - | My course |
| GET | /me/lecturer | JWT + verified | LECTURER | - | My lecturer record |
| PATCH | /me/lecturer | JWT + verified | LECTURER | mykadNumber (body) | Update my lecturer (MyKad) |
| GET | /me/students | JWT + verified | LECTURER | paginationSchema (query) | My course students |
| GET | /me/documents | JWT + verified | Any | - | My documents |
| POST | /me/documents | JWT + verified | Any | file + uploadCategorySchema (body) | Upload my document |
| GET | /students | JWT + verified | LECTURER, HEAD_LECTURER | studentQuerySchema (query) | List students |
| GET | /students/:studentId | JWT + verified | LECTURER, HEAD_LECTURER | studentParamsSchema (params) | Get student |
| POST | /students | JWT + verified | HEAD_LECTURER | createStudentSchema (body) | Create student |
| PATCH | /students/:studentId | JWT + verified | HEAD_LECTURER | params + updateStudentSchema (body) | Update student |
| DELETE | /students/:studentId | JWT + verified | HEAD_LECTURER | studentParamsSchema (params) | Delete student (soft) |
| GET | /courses | JWT + verified | LECTURER, HEAD_LECTURER | paginationSchema (query) | List courses |
| GET | /courses/:courseId | JWT + verified | LECTURER, HEAD_LECTURER | courseParamsSchema (params) | Get course |
| POST | /courses | JWT + verified | HEAD_LECTURER | createCourseSchema (body) | Create course |
| PATCH | /courses/:courseId | JWT + verified | HEAD_LECTURER | params + updateCourseSchema (body) | Update course |
| DELETE | /courses/:courseId | JWT + verified | HEAD_LECTURER | courseParamsSchema (params) | Delete course |
| GET | /lecturers | JWT + verified | HEAD_LECTURER | paginationSchema (query) | List lecturers |
| GET | /lecturers/:lecturerId | JWT + verified | HEAD_LECTURER | lecturerParamsSchema (params) | Get lecturer |
| POST | /lecturers | JWT + verified | HEAD_LECTURER | createLecturerSchema (body) | Create lecturer |
| PATCH | /lecturers/:lecturerId | JWT + verified | HEAD_LECTURER | params + updateLecturerSchema (body) | Update lecturer |
| DELETE | /lecturers/:lecturerId | JWT + verified | HEAD_LECTURER | lecturerParamsSchema (params) | Delete lecturer (soft) |
| GET | /head-lecturers | JWT + verified | HEAD_LECTURER | paginationSchema (query) | List head lecturers |
| GET | /head-lecturers/:headLecturerId | JWT + verified | HEAD_LECTURER | headLecturerParamsSchema (params) | Get head lecturer |
| POST | /head-lecturers | JWT + verified | HEAD_LECTURER | createHeadLecturerSchema (body) | Create head lecturer |
| PATCH | /head-lecturers/:headLecturerId | JWT + verified | HEAD_LECTURER | params + updateHeadLecturerSchema (body) | Update head lecturer |
| DELETE | /head-lecturers/:headLecturerId | JWT + verified | HEAD_LECTURER | headLecturerParamsSchema (params) | Delete head lecturer (soft) |
| POST | /students/:studentId/documents | JWT + verified | HEAD_LECTURER | params + file + uploadCategorySchema (body) | Upload student document |
| GET | /students/:studentId/documents | JWT + verified | LECTURER, HEAD_LECTURER | studentDocParamsSchema (params) | List student documents |
| POST | /lecturers/:lecturerId/documents | JWT + verified | LECTURER, HEAD_LECTURER | params + file + uploadCategorySchema (body) | Upload lecturer document |
| GET | /lecturers/:lecturerId/documents | JWT + verified | LECTURER, HEAD_LECTURER | lecturerDocParamsSchema (params) | List lecturer documents |
| POST | /head-lecturers/:headLecturerId/documents | JWT + verified | HEAD_LECTURER | params + file + uploadCategorySchema (body) | Upload head lecturer document |
| GET | /head-lecturers/:headLecturerId/documents | JWT + verified | HEAD_LECTURER | headLecturerDocParamsSchema (params) | List head lecturer documents |
| DELETE | /documents/:documentId | JWT + verified | HEAD_LECTURER | documentIdParamsSchema (params) | Soft-delete document |

Document uploads use `multipart/form-data` with field `file` and body `category` (IC, TRANSCRIPT, DOCUMENT, OTHER, PROFILE_PICTURE).

---

## 5. Full file code (copy-paste)

### src/server.ts

```typescript
import { env } from './config/env.js'
import app from './app.js'
import prisma, { connectDB } from './config/db.js'
import logger from './utils/logger.js'
import { startTokenCleanup } from './jobs/tokenCleanup.js'

await connectDB()

startTokenCleanup()

const server = app.listen(env.PORT, () => {
  logger.info(`Server is running on port ${env.PORT}`)
})

const shutdown = async (signal: string) => {
  logger.info(`${signal} received — shutting down gracefully`)
  server.close(async () => {
    await prisma.$disconnect()
    logger.info('Database disconnected, server closed')
    process.exit(0)
  })
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
```

### src/app.ts

```typescript
import express from 'express'
import path from 'node:path'
import cors from 'cors'
import morgan from 'morgan'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import routes from './routes/index.js'
import { errorHandler } from './middleware/errorHandler.middleware.js'
import { requestId } from './middleware/requestId.middleware.js'
import { apiLimiter } from './middleware/rateLimit.middleware.js'
import { response } from './utils/response.js'
import { env } from './config/env.js'

const app = express()

app.use(helmet())
app.use(requestId)
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'))
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
}))
app.use(express.json())
app.use(cookieParser())
app.use(apiLimiter)

app.use('/uploads', express.static(path.resolve('uploads')))

app.use('/api', routes)

app.use((_req, res) => {
  response(res, 404, 'Resource not found', null, 'RESOURCE_NOT_FOUND_404')
})

app.use(errorHandler)

export default app
```

### src/config/db.ts

```typescript
import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { env } from './env.js'
import logger from '../utils/logger.js'

const adapter = new PrismaMariaDb({
  host: env.DB_HOST,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
})
const prisma = new PrismaClient({ adapter })

export const connectDB = async (): Promise<void> => {
  try {
    await prisma.$connect()
    await prisma.$queryRaw`SELECT 1`
    logger.info('MySQL database connected successfully')
  } catch (err) {
    logger.error({ message: 'MySQL connection error', err })
    process.exit(1)
  }
}

export default prisma
```

### src/config/env.ts

```typescript
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
})

const result = envSchema.safeParse(process.env)
if (!result.success) {
  console.error('Invalid environment configuration:', result.error.issues)
  process.exit(1)
}

export const env = result.data
```

### src/config/multer.ts

```typescript
import multer from 'multer'
import path from 'node:path'
import fs from 'node:fs'
import crypto from 'node:crypto'
import { AppError } from '../utils/AppError.js'

const UPLOAD_DIR = path.resolve('uploads')

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
const ALLOWED_DOCUMENT_TYPES = [...ALLOWED_IMAGE_TYPES, 'application/pdf'] as const

const getDateDir = () => {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return path.join(UPLOAD_DIR, String(y), m, d)
}

const generateFilename = (_req: Express.Request, file: Express.Multer.File, cb: (err: Error | null, filename: string) => void) => {
  const ext = path.extname(file.originalname).toLowerCase()
  cb(null, `${crypto.randomUUID()}${ext}`)
}

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    const dir = getDateDir()
    fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename: generateFilename,
})

export const uploadDocument = multer({
  storage,
  fileFilter(_req, file, cb) {
    if (!(ALLOWED_DOCUMENT_TYPES as readonly string[]).includes(file.mimetype)) {
      return cb(new AppError('Only JPEG, PNG, WebP images and PDF files are allowed', 400, 'INVALID_FILE_TYPE_400'))
    }
    cb(null, true)
  },
  limits: { fileSize: 10 * 1024 * 1024 },
})

export const uploadProfile = multer({
  storage,
  fileFilter(_req, file, cb) {
    if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.mimetype)) {
      return cb(new AppError('Profile picture must be an image (JPEG, PNG, WebP)', 400, 'INVALID_FILE_TYPE_400'))
    }
    cb(null, true)
  },
  limits: { fileSize: 5 * 1024 * 1024 },
})

export const toRelativePath = (absolutePath: string): string => {
  return path.relative(path.resolve(), absolutePath).replace(/\\/g, '/')
}
```

### src/config/resend.ts

```typescript
import { Resend } from 'resend'
import { env } from './env.js'

export const resend = new Resend(env.RESEND_API_KEY)
```

### src/middleware/auth.middleware.ts

```typescript
import type { Request, Response, NextFunction } from 'express'
import { AppError } from '../utils/AppError.js'
import * as tokenService from '../services/token.service.js'
import type { UserType } from '@prisma/client'

export const authenticate = async (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED_401')
  }

  const token = header.slice(7)

  const blacklisted = await tokenService.isTokenBlacklisted(token)
  if (blacklisted) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED_401')
  }

  try {
    const payload = tokenService.verifyAccessToken(token)
    req.user = payload
    next()
  } catch {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED_401')
  }
}

export const authorize = (...roles: UserType[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED_401')
    }
    if (!roles.includes(req.user.type as UserType)) {
      throw new AppError('You do not have permission to perform this action', 403, 'FORBIDDEN_403')
    }
    next()
  }
}

export const requireVerifiedEmail = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user?.isEmailVerified) {
    throw new AppError('Please verify your email first', 403, 'EMAIL_NOT_VERIFIED_403')
  }
  next()
}
```

### src/middleware/errorHandler.middleware.ts

```typescript
import type { Request, Response, NextFunction } from 'express'
import multer from 'multer'
import { AppError } from '../utils/AppError.js'
import { response } from '../utils/response.js'
import logger from '../utils/logger.js'

export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction): void => {
  if (err instanceof multer.MulterError) {
    const messages: Record<string, string> = {
      LIMIT_FILE_SIZE: 'File size exceeds the allowed limit',
      LIMIT_FILE_COUNT: 'Too many files uploaded',
      LIMIT_UNEXPECTED_FILE: 'Unexpected file field name',
    }
    const message = messages[err.code] ?? `Upload error: ${err.message}`
    response(res, 400, message, null, `UPLOAD_${err.code}_400`)
    return
  }

  const isAppError = err instanceof AppError
  const statusCode = isAppError ? err.statusCode : 500
  const errorCode = isAppError ? err.errorCode : 'INTERNAL_SERVER_ERROR_500'
  const message = isAppError ? err.message : 'Internal Server Error'
  const errors = isAppError && err.details ? err.details : []

  if (statusCode >= 500) {
    logger.error({
      message,
      errorCode,
      statusCode,
      stack: err.stack,
      method: req.method,
      path: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    })
  }

  response(res, statusCode, message, null, errorCode, errors)
}
```

### src/middleware/rateLimit.middleware.ts

```typescript
import rateLimit from 'express-rate-limit'

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    statusCode: 429,
    success: false,
    message: 'Too many requests, please try again later',
    errorCode: 'RATE_LIMIT_429',
    timestamp: new Date().toISOString(),
    errors: [],
  },
})

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    statusCode: 429,
    success: false,
    message: 'Too many requests, please try again later',
    errorCode: 'RATE_LIMIT_429',
    timestamp: new Date().toISOString(),
    errors: [],
  },
})
```

### src/middleware/requestId.middleware.ts

```typescript
import type { Request, Response, NextFunction } from 'express'
import crypto from 'node:crypto'

export const requestId = (_req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('x-request-id', crypto.randomUUID())
  next()
}
```

### src/middleware/validateZod.middleware.ts

```typescript
import type { Request, Response, NextFunction } from 'express'
import type { z } from 'zod'
import { response } from '../utils/response.js'

declare global {
  namespace Express {
    interface Request {
      validated: {
        body?: unknown
        params?: unknown
        query?: unknown
      }
      user?: {
        userId: string
        email: string
        name: string
        type: 'STUDENT' | 'LECTURER' | 'HEAD_LECTURER'
        status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
        isEmailVerified: boolean
      }
    }
  }
}

export const validateZod = <T extends z.ZodType>(
  schema: T,
  source: 'body' | 'params' | 'query' = 'body',
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source])

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: String(issue.path[0] ?? 'field'),
        message: issue.message,
      }))
      response(res, 400, 'Validation failed', null, 'VALIDATION_ERROR_400', errors)
      return
    }

    req.validated ??= {}
    req.validated[source] = result.data
    next()
  }
}
```

### src/utils/AppError.ts

```typescript
export type ErrorDetail = { field: string; message: string }

export class AppError extends Error {
  statusCode: number
  errorCode: string
  details?: ErrorDetail[]

  constructor(
    message: string,
    statusCode = 500,
    errorCode = 'INTERNAL_SERVER_ERROR_500',
    details?: ErrorDetail[],
  ) {
    super(message)
    this.statusCode = statusCode
    this.errorCode = errorCode
    this.details = details
    Object.setPrototypeOf(this, AppError.prototype)
  }
}
```

### src/utils/logger.ts

```typescript
import winston from 'winston'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const logsDir = path.join(__dirname, '..', '..', 'logs')

fs.mkdirSync(logsDir, { recursive: true })

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error'
    }),
  ],
})

if (process.env.NODE_ENV === 'development') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    })
  )
}

export default logger
```

### src/utils/pagination.ts

```typescript
import type { Request } from 'express'

export const buildPagination = (req: Request, page: number, limit: number, total: number) => {
  const totalPages = Math.ceil(total / limit) || 1
  const hasNext = page < totalPages
  const hasPrev = page > 1
  const basePath = `${req.baseUrl}${req.path}`
  const buildUrl = (p: number) => `${basePath}?page=${p}&limit=${limit}`

  return {
    meta: { page, limit, total, totalPages, hasNext, hasPrev },
    links: {
      self: buildUrl(page),
      next: hasNext ? buildUrl(page + 1) : null,
      prev: hasPrev ? buildUrl(page - 1) : null,
      first: buildUrl(1),
      last: buildUrl(totalPages),
    },
  }
}
```

### src/utils/prismaErrors.ts

```typescript
import { Prisma } from '@prisma/client'
import { AppError } from './AppError.js'

export const handlePrismaError = (err: unknown, context: string): never => {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError)) throw err

  switch (err.code) {
    case 'P2002':
      throw new AppError(`${context} already exists`, 409, `DUPLICATE_${context.toUpperCase()}_409`)
    case 'P2003':
      throw new AppError(`${context} is referenced by other records`, 409, `${context.toUpperCase()}_REFERENCED_409`)
    case 'P2025':
      throw new AppError(`${context} does not exist`, 404, `${context.toUpperCase()}_NOT_FOUND_404`)
    default:
      throw err
  }
}
```

### src/utils/response.ts

```typescript
import type { Response } from 'express'
import type { ErrorDetail } from './AppError.js'

type PaginationMeta = {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

type PaginationLinks = {
  self: string
  next: string | null
  prev: string | null
  first: string
  last: string
}

export const response = (
  res: Response,
  statusCode: number,
  message: string,
  data: unknown = null,
  errorCode: string | null = null,
  errors: ErrorDetail[] = [],
  meta?: PaginationMeta,
  links?: PaginationLinks,
): Response => {
  const success = statusCode < 400
  const resBody: Record<string, unknown> = { statusCode, success, message }

  if (success && data !== null && data !== undefined) {
    resBody.data = data
  }

  if (meta) resBody.meta = meta
  if (links) resBody.links = links

  if (!success && errorCode) {
    resBody.errorCode = errorCode
    resBody.timestamp = new Date().toISOString()
    resBody.errors = errors
  }

  return res.status(statusCode).json(resBody)
}
```

### src/validations/authValidation.ts

```typescript
import { z } from 'zod'

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one digit')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
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

export const verifyEmailQuerySchema = z.object({
  token: z.string().min(1, 'Token is required'),
})

export const resendVerificationSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email format'),
})

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email format'),
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password,
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

export const updateMeSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: password,
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})
```

### src/validations/courseValidation.ts

```typescript
import { z } from 'zod'

export const courseParamsSchema = z.object({
  courseId: z.string().uuid('Invalid course ID format'),
})

export const createCourseSchema = z.object({
  courseCode: z.string().trim().toUpperCase().min(1, 'Course code is required').max(10),
  courseName: z.string().trim().min(1, 'Course name is required').max(100),
  description: z.string().trim().optional().nullable(),
})

export const updateCourseSchema = z.object({
  courseCode: z.string().trim().toUpperCase().max(10).optional(),
  courseName: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().optional().nullable(),
  isActive: z.boolean().optional(),
})
```

### src/validations/documentValidation.ts

```typescript
import { z } from 'zod'

export const documentIdParamsSchema = z.object({
  documentId: z.string().uuid('Invalid document ID format'),
})

export const studentDocParamsSchema = z.object({
  studentId: z.string().uuid('Invalid student ID format'),
})

export const lecturerDocParamsSchema = z.object({
  lecturerId: z.string().uuid('Invalid lecturer ID format'),
})

export const headLecturerDocParamsSchema = z.object({
  headLecturerId: z.string().uuid('Invalid head lecturer ID format'),
})

export const uploadCategorySchema = z.object({
  category: z.enum(['IC', 'TRANSCRIPT', 'DOCUMENT', 'OTHER', 'PROFILE_PICTURE'], {
    message: 'Category must be one of: PROFILE_PICTURE, IC, TRANSCRIPT, DOCUMENT, OTHER',
  }),
})
```

### src/validations/headLecturerValidation.ts

```typescript
import { z } from 'zod'

export const headLecturerParamsSchema = z.object({
  headLecturerId: z.string().uuid('Invalid head lecturer ID format'),
})

export const createHeadLecturerSchema = z.object({
  staffNumber: z.string().trim().toUpperCase().min(1, 'Staff number is required'),
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().trim().toLowerCase().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  mykadNumber: z.string().length(12).regex(/^\d{12}$/).optional(),
})

export const updateHeadLecturerSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  mykadNumber: z.string().length(12).regex(/^\d{12}$/).optional().nullable(),
})
```

### src/validations/lecturerValidation.ts

```typescript
import { z } from 'zod'

export const lecturerParamsSchema = z.object({
  lecturerId: z.string().uuid('Invalid lecturer ID format'),
})

export const createLecturerSchema = z.object({
  staffNumber: z.string().trim().toUpperCase().min(1, 'Staff number is required'),
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().trim().toLowerCase().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  mykadNumber: z.string().length(12).regex(/^\d{12}$/).optional(),
  courseCode: z.string().trim().toUpperCase().min(1, 'Course code is required'),
})

export const updateLecturerSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  courseCode: z.string().trim().toUpperCase().optional(),
  mykadNumber: z.string().length(12).regex(/^\d{12}$/).optional().nullable(),
})
```

### src/validations/paginationSchema.ts

```typescript
import { z } from 'zod'

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
  sortBy: z.string().trim().optional(),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
})

export type PaginationQuery = z.infer<typeof paginationSchema>
```

### src/validations/profileValidation.ts

```typescript
import { z } from 'zod'

export const updateProfileSchema = z.object({
  phoneNumber: z.string().max(15).optional().nullable(),
  gender: z.enum(['Male', 'Female']).optional().nullable(),
  race: z.enum(['Malay', 'Chinese', 'Indian', 'Others']).optional().nullable(),
  dateOfBirth: z.string().date('Invalid date format (YYYY-MM-DD)').optional().nullable(),
  streetOne: z.string().max(255).optional().nullable(),
  streetTwo: z.string().max(255).optional().nullable(),
  postcode: z.string().max(5).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.enum([
    'Johor', 'Kedah', 'Kelantan', 'Melaka', 'NegeriSembilan', 'Pahang',
    'Perak', 'Perlis', 'PulauPinang', 'Sabah', 'Sarawak', 'Selangor',
    'Terengganu', 'KualaLumpur', 'Labuan', 'Putrajaya',
  ]).optional().nullable(),
})
```

### src/validations/studentValidation.ts

```typescript
import { z } from 'zod'

export const studentParamsSchema = z.object({
  studentId: z.string().uuid('Invalid student ID format'),
})

export const studentQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
  gender: z.enum(['Male', 'Female']).optional(),
  courseCode: z.string().trim().toUpperCase().optional(),
  sortBy: z.enum(['createdAt', 'studentNumber', 'name']).optional().default('createdAt'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
})

export const createStudentSchema = z.object({
  studentNumber: z.string().trim().toUpperCase().min(1, 'Student number is required'),
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().trim().toLowerCase().email('Invalid email format'),
  mykadNumber: z.string().length(12, 'MyKad must be 12 digits').regex(/^\d{12}$/).optional(),
  courseCode: z.string().trim().toUpperCase().min(1, 'Course code is required'),
})

export const updateStudentSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  courseCode: z.string().trim().toUpperCase().optional(),
  mykadNumber: z.string().length(12).regex(/^\d{12}$/).optional().nullable(),
})
```

### src/services/token.service.ts

```typescript
import jwt from 'jsonwebtoken'
import type { Response } from 'express'
import { env } from '../config/env.js'
import prisma from '../config/db.js'

export type TokenPayload = {
  userId: string
  email: string
  name: string
  type: 'STUDENT' | 'LECTURER' | 'HEAD_LECTURER'
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
  isEmailVerified: boolean
}

export const signAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRES as jwt.SignOptions['expiresIn'] })
}

export const signRefreshToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES as jwt.SignOptions['expiresIn'] })
}

export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenPayload
}

export const verifyRefreshToken = (token: string): TokenPayload => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as TokenPayload
}

export const blacklistToken = async (token: string, expiresAt: Date) => {
  return prisma.tokenBlacklist.create({ data: { token, expiresAt } })
}

export const isTokenBlacklisted = async (token: string): Promise<boolean> => {
  const entry = await prisma.tokenBlacklist.findUnique({ where: { token } })
  return !!entry
}

export const setRefreshCookie = (res: Response, token: string) => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  })
}

export const clearRefreshCookie = (res: Response) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  })
}

export const buildTokenPayload = (user: {
  userId: string
  email: string
  name: string
  type: 'STUDENT' | 'LECTURER' | 'HEAD_LECTURER'
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
  isEmailVerified: boolean
}): TokenPayload => ({
  userId: user.userId,
  email: user.email,
  name: user.name,
  type: user.type,
  status: user.status,
  isEmailVerified: user.isEmailVerified,
})
```

### src/services/auth.service.ts

```typescript
import bcrypt from 'bcrypt'
import crypto from 'node:crypto'
import prisma from '../config/db.js'
import { AppError } from '../utils/AppError.js'
import * as tokenService from './token.service.js'
import * as emailService from './email.service.js'
import type { UserType, Gender, Race, State } from '@prisma/client'

const SALT_ROUNDS = 12
const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_MINUTES = 15
const VERIFY_TOKEN_HOURS = 24
const RESET_TOKEN_HOURS = 1

const userInclude = {
  profile: true,
  student: { include: { course: true } },
  lecturer: { include: { course: true } },
  headLecturer: true,
} as const

const userSelect = {
  userId: true,
  email: true,
  name: true,
  type: true,
  status: true,
  isEmailVerified: true,
  emailVerifiedAt: true,
  lastLoginAt: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
  ...userInclude,
} as const

function formatUserResponse(user: Record<string, unknown>) {
  const profile = user.profile as Record<string, unknown> | null
  let formattedProfile = null
  if (profile) {
    formattedProfile = {
      profileId: profile.profileId,
      phoneNumber: profile.phoneNumber,
      gender: profile.gender,
      race: profile.race,
      dateOfBirth: profile.dateOfBirth,
      address: {
        streetOne: profile.streetOne,
        streetTwo: profile.streetTwo,
        postcode: profile.postcode,
        city: profile.city,
        state: profile.state,
      },
    }
  }
  return {
    userId: user.userId,
    email: user.email,
    name: user.name,
    type: user.type,
    status: user.status,
    isEmailVerified: user.isEmailVerified,
    emailVerifiedAt: user.emailVerifiedAt,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    profile: formattedProfile,
    student: user.student ?? null,
    lecturer: user.lecturer ?? null,
    headLecturer: user.headLecturer ?? null,
  }
}

export const register = async (data: {
  name: string
  email: string
  password: string
  studentNumber?: string
}) => {
  const existing = await prisma.user.findUnique({ where: { email: data.email } })
  if (existing) {
    throw new AppError('Email already registered', 409, 'DUPLICATE_EMAIL_409')
  }

  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS)
  const emailVerifyToken = crypto.randomUUID()
  const emailVerifyExpiry = new Date(Date.now() + VERIFY_TOKEN_HOURS * 60 * 60 * 1000)

  let type: UserType = 'STUDENT'
  if (data.studentNumber) {
    type = 'STUDENT'
  }

  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        email: data.email,
        passwordHash,
        name: data.name,
        type,
        emailVerifyToken,
        emailVerifyExpiry,
      },
    })

    if (type === 'STUDENT' && data.studentNumber) {
      const prefix = data.studentNumber.match(/^([A-Z]{2,4})/)?.[1]
      if (!prefix) {
        throw new AppError('Invalid student number format', 400, 'INVALID_STUDENT_NUMBER_400')
      }
      const course = await tx.course.findUnique({ where: { courseCode: prefix } })
      if (!course) {
        throw new AppError('Course not found for student number prefix', 404, 'COURSE_NOT_FOUND_404')
      }
      await tx.student.create({
        data: {
          studentNumber: data.studentNumber,
          courseId: course.courseId,
          userId: newUser.userId,
        },
      })
    }

    return newUser
  })

  await emailService.sendVerificationEmail(user.email, user.name, emailVerifyToken)

  return { email: user.email, name: user.name }
}

export const login = async (data: { email: string; password: string }) => {
  const user = await prisma.user.findUnique({
    where: { email: data.email },
    select: { ...userSelect, passwordHash: true, failedLoginAttempts: true, lockedUntil: true },
  })

  if (!user || user.deletedAt) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS_401')
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new AppError(
      `Account locked due to too many failed attempts. Try again in ${LOCKOUT_MINUTES} minutes.`,
      423,
      'ACCOUNT_LOCKED_423',
    )
  }

  const valid = await bcrypt.compare(data.password, user.passwordHash)
  if (!valid) {
    const attempts = user.failedLoginAttempts + 1
    const updateData: Record<string, unknown> = { failedLoginAttempts: attempts }
    if (attempts >= MAX_FAILED_ATTEMPTS) {
      updateData.lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
    }
    await prisma.user.update({ where: { userId: user.userId }, data: updateData })
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS_401')
  }

  if (!user.isEmailVerified) {
    throw new AppError('Please verify your email first', 403, 'EMAIL_NOT_VERIFIED_403')
  }

  if (user.status !== 'ACTIVE') {
    throw new AppError('Account is not active', 403, 'ACCOUNT_INACTIVE_403')
  }

  const payload = tokenService.buildTokenPayload(user)
  const accessToken = tokenService.signAccessToken(payload)
  const refreshToken = tokenService.signRefreshToken(payload)

  await prisma.user.update({
    where: { userId: user.userId },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
      refreshToken,
      refreshTokenExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  })

  const { passwordHash: _ph, failedLoginAttempts: _fa, lockedUntil: _lu, ...safeUser } = user
  return { accessToken, refreshToken, user: formatUserResponse(safeUser as Record<string, unknown>) }
}

export const refreshTokens = async (oldRefreshToken: string) => {
  let payload: tokenService.TokenPayload
  try {
    payload = tokenService.verifyRefreshToken(oldRefreshToken)
  } catch {
    throw new AppError('Invalid refresh token', 401, 'UNAUTHORIZED_401')
  }

  const user = await prisma.user.findUnique({ where: { userId: payload.userId } })
  if (!user || user.refreshToken !== oldRefreshToken) {
    throw new AppError('Invalid refresh token', 401, 'UNAUTHORIZED_401')
  }

  const newPayload = tokenService.buildTokenPayload(user)
  const accessToken = tokenService.signAccessToken(newPayload)

  return { accessToken }
}

export const logout = async (userId: string, accessToken: string) => {
  try {
    const decoded = tokenService.verifyAccessToken(accessToken)
    const exp = (decoded as unknown as { exp: number }).exp
    await tokenService.blacklistToken(accessToken, new Date(exp * 1000))
  } catch {
    // token already invalid — still clear refresh
  }

  await prisma.user.update({
    where: { userId },
    data: { refreshToken: null, refreshTokenExpiry: null },
  })
}

export const verifyEmail = async (token: string) => {
  const user = await prisma.user.findUnique({ where: { emailVerifyToken: token } })
  if (!user || !user.emailVerifyExpiry || user.emailVerifyExpiry < new Date()) {
    throw new AppError('Invalid or expired verification token', 400, 'INVALID_TOKEN_400')
  }

  const updated = await prisma.user.update({
    where: { userId: user.userId },
    data: {
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
      emailVerifyToken: null,
      emailVerifyExpiry: null,
    },
    select: userSelect,
  })

  await emailService.sendWelcomeEmail(updated.email, updated.name)

  const payload = tokenService.buildTokenPayload(updated)
  const accessToken = tokenService.signAccessToken(payload)
  const refreshToken = tokenService.signRefreshToken(payload)

  await prisma.user.update({
    where: { userId: updated.userId },
    data: { refreshToken, refreshTokenExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  })

  return { accessToken, refreshToken, user: formatUserResponse(updated as unknown as Record<string, unknown>) }
}

export const resendVerification = async (email: string) => {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || user.isEmailVerified) return

  const emailVerifyToken = crypto.randomUUID()
  const emailVerifyExpiry = new Date(Date.now() + VERIFY_TOKEN_HOURS * 60 * 60 * 1000)

  await prisma.user.update({
    where: { userId: user.userId },
    data: { emailVerifyToken, emailVerifyExpiry },
  })

  await emailService.sendVerificationEmail(user.email, user.name, emailVerifyToken)
}

export const forgotPassword = async (email: string) => {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return

  const passwordResetToken = crypto.randomUUID()
  const passwordResetExpiry = new Date(Date.now() + RESET_TOKEN_HOURS * 60 * 60 * 1000)

  await prisma.user.update({
    where: { userId: user.userId },
    data: { passwordResetToken, passwordResetExpiry },
  })

  await emailService.sendPasswordResetEmail(user.email, user.name, passwordResetToken)
}

export const resetPassword = async (token: string, newPassword: string) => {
  const user = await prisma.user.findUnique({ where: { passwordResetToken: token } })
  if (!user || !user.passwordResetExpiry || user.passwordResetExpiry < new Date()) {
    throw new AppError('Invalid or expired reset token', 400, 'INVALID_TOKEN_400')
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS)
  await prisma.user.update({
    where: { userId: user.userId },
    data: {
      passwordHash,
      passwordResetToken: null,
      passwordResetExpiry: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  })
}

export const getMe = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { userId }, select: userSelect })
  if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND_404')
  return formatUserResponse(user as unknown as Record<string, unknown>)
}

export const updateMe = async (userId: string, data: { name: string }) => {
  const user = await prisma.user.update({
    where: { userId },
    data: { name: data.name },
    select: userSelect,
  })
  return formatUserResponse(user as unknown as Record<string, unknown>)
}

export const updateProfile = async (userId: string, data: {
  phoneNumber?: string | null
  gender?: Gender | null
  race?: Race | null
  dateOfBirth?: string | null
  streetOne?: string | null
  streetTwo?: string | null
  postcode?: string | null
  city?: string | null
  state?: State | null
}) => {
  const profileData = {
    ...data,
    dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : data.dateOfBirth,
  }

  await prisma.profile.upsert({
    where: { userId },
    create: { userId, ...profileData },
    update: profileData,
  })

  const user = await prisma.user.findUnique({ where: { userId }, select: userSelect })
  return formatUserResponse(user as unknown as Record<string, unknown>)
}

export const changePassword = async (userId: string, currentPassword: string, newPassword: string) => {
  const user = await prisma.user.findUnique({ where: { userId }, select: { passwordHash: true } })
  if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND_404')

  const valid = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!valid) {
    throw new AppError('Current password is incorrect', 401, 'INVALID_CREDENTIALS_401')
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS)
  await prisma.user.update({ where: { userId }, data: { passwordHash } })
}
```

### src/services/courses.service.ts

```typescript
import prisma from '../config/db.js'
import { AppError } from '../utils/AppError.js'
import { handlePrismaError } from '../utils/prismaErrors.js'

export const getAll = async (page: number, limit: number) => {
  const skip = (page - 1) * limit
  const [items, total] = await Promise.all([
    prisma.course.findMany({
      orderBy: { courseCode: 'asc' },
      skip,
      take: limit,
      include: { _count: { select: { students: true, lecturers: true } } },
    }),
    prisma.course.count(),
  ])

  const data = items.map((c) => ({
    ...c,
    totalStudents: c._count.students,
    totalLecturers: c._count.lecturers,
    _count: undefined,
  }))

  return { items: data, total }
}

export const getById = async (courseId: string) => {
  const course = await prisma.course.findUnique({
    where: { courseId },
    include: {
      _count: { select: { students: true, lecturers: true } },
      lecturers: {
        include: { user: { select: { userId: true, name: true, email: true } } },
      },
    },
  })
  if (!course) throw new AppError('Course not found', 404, 'COURSE_NOT_FOUND_404')

  return {
    ...course,
    totalStudents: course._count.students,
    totalLecturers: course._count.lecturers,
    _count: undefined,
    lecturers: course.lecturers.map((l) => ({
      lecturerId: l.lecturerId,
      staffNumber: l.staffNumber,
      name: l.user.name,
      email: l.user.email,
    })),
  }
}

export const create = async (data: { courseCode: string; courseName: string; description?: string | null }) => {
  try {
    return await prisma.course.create({ data })
  } catch (err) {
    return handlePrismaError(err, 'Course')
  }
}

export const update = async (courseId: string, data: {
  courseCode?: string
  courseName?: string
  description?: string | null
  isActive?: boolean
}) => {
  await getById(courseId)
  try {
    return await prisma.course.update({ where: { courseId }, data })
  } catch (err) {
    return handlePrismaError(err, 'Course')
  }
}

export const remove = async (courseId: string) => {
  await getById(courseId)
  try {
    return await prisma.course.delete({ where: { courseId } })
  } catch (err) {
    return handlePrismaError(err, 'Course')
  }
}
```

### src/services/documents.service.ts

```typescript
import type { Request } from 'express'
import prisma from '../config/db.js'
import { AppError } from '../utils/AppError.js'
import { toRelativePath } from '../config/multer.js'
import type { EntityType, FileCategory } from '@prisma/client'
import fs from 'node:fs/promises'
import path from 'node:path'

const buildFileUrl = (req: Request, relativePath: string) =>
  `${req.protocol}://${req.get('host')}/${relativePath}`

export const createDocument = async (
  req: Request,
  file: Express.Multer.File,
  opts: {
    entityId: string
    entityType: EntityType | string
    category: FileCategory | string
    relationField: string
    relationId: string
  },
) => {
  const relativePath = toRelativePath(file.path)
  const fileUrl = buildFileUrl(req, relativePath)

  return prisma.document.create({
    data: {
      entityId: opts.entityId,
      entityType: opts.entityType as EntityType,
      fileName: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      fileSize: BigInt(file.size),
      filePath: relativePath,
      fileUrl,
      category: opts.category as FileCategory,
      [opts.relationField]: opts.relationId,
    },
  })
}

export const getDocumentsByEntity = async (entityId: string, entityType: EntityType | string) => {
  return prisma.document.findMany({
    where: { entityId, entityType: entityType as EntityType, deletedAt: null },
    orderBy: { createdAt: 'desc' },
  })
}

export const getDocumentById = async (documentId: string) => {
  const doc = await prisma.document.findUnique({ where: { documentId } })
  if (!doc || doc.deletedAt) {
    throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND_404')
  }
  return doc
}

export const softDeleteDocument = async (documentId: string) => {
  return prisma.document.update({
    where: { documentId },
    data: { deletedAt: new Date() },
  })
}

export const deleteFileFromDisk = async (filePath: string) => {
  try {
    await fs.unlink(path.resolve(filePath))
  } catch {
    // file already removed
  }
}
```

### src/services/email.service.ts

```typescript
import { resend } from '../config/resend.js'
import { env } from '../config/env.js'
import logger from '../utils/logger.js'

const BRAND_COLOR = '#003087'

const baseTemplate = (title: string, body: string) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f4f4f4">
<div style="max-width:600px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1)">
  <div style="background:${BRAND_COLOR};padding:24px;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:22px">Monash College</h1>
  </div>
  <div style="padding:32px">
    <h2 style="color:#333;margin:0 0 16px">${title}</h2>
    ${body}
  </div>
  <div style="background:#f9f9f9;padding:16px;text-align:center;font-size:12px;color:#999">
    &copy; ${new Date().getFullYear()} Monash College Management System
  </div>
</div>
</body>
</html>`

const actionButton = (url: string, label: string) =>
  `<div style="text-align:center;margin:24px 0"><a href="${url}" style="display:inline-block;padding:12px 32px;background:${BRAND_COLOR};color:#fff;text-decoration:none;border-radius:6px;font-weight:bold">${label}</a></div>`

export const sendVerificationEmail = async (email: string, name: string, token: string) => {
  const url = `${env.APP_URL}/api/auth/verify-email?token=${token}`

  if (env.NODE_ENV === 'development') {
    logger.info(`[DEV] Verification URL for ${email}: ${url}`)
  }

  await resend.emails.send({
    from: env.FROM_EMAIL,
    to: email,
    subject: 'Verify your email — Monash College',
    html: baseTemplate('Verify Your Email', `
      <p style="color:#555;line-height:1.6">Hi ${name},</p>
      <p style="color:#555;line-height:1.6">Welcome to Monash College Management System. Please verify your email address to activate your account.</p>
      ${actionButton(url, 'Verify Email')}
      <p style="color:#999;font-size:13px">This link expires in 24 hours. If you didn't create this account, please ignore this email.</p>
    `),
  })
}

export const sendPasswordResetEmail = async (email: string, name: string, token: string) => {
  const url = `${env.APP_URL}/api/auth/reset-password?token=${token}`

  if (env.NODE_ENV === 'development') {
    logger.info(`[DEV] Password reset URL for ${email}: ${url}`)
  }

  await resend.emails.send({
    from: env.FROM_EMAIL,
    to: email,
    subject: 'Reset your password — Monash College',
    html: baseTemplate('Reset Your Password', `
      <p style="color:#555;line-height:1.6">Hi ${name},</p>
      <p style="color:#555;line-height:1.6">We received a request to reset your password. Click the button below to set a new password.</p>
      ${actionButton(url, 'Reset Password')}
      <p style="color:#999;font-size:13px">This link expires in 1 hour. If you didn't request this, please ignore this email.</p>
    `),
  })
}

export const sendWelcomeEmail = async (email: string, name: string) => {
  await resend.emails.send({
    from: env.FROM_EMAIL,
    to: email,
    subject: 'Welcome to Monash College!',
    html: baseTemplate('Welcome!', `
      <p style="color:#555;line-height:1.6">Hi ${name},</p>
      <p style="color:#555;line-height:1.6">Your email has been verified and your account is now active. You can now log in and start using the system.</p>
      ${actionButton(`${env.APP_URL}`, 'Go to Dashboard')}
    `),
  })
}
```

### src/services/headLecturers.service.ts

```typescript
import bcrypt from 'bcrypt'
import prisma from '../config/db.js'
import { AppError } from '../utils/AppError.js'
import { handlePrismaError } from '../utils/prismaErrors.js'

const headLecturerInclude = {
  user: { select: { userId: true, name: true, email: true, status: true } },
} as const

export const getAll = async (page: number, limit: number) => {
  const skip = (page - 1) * limit
  const where = { user: { deletedAt: null } }
  const [items, total] = await Promise.all([
    prisma.headLecturer.findMany({ where, include: headLecturerInclude, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.headLecturer.count({ where }),
  ])
  return { items, total }
}

export const getById = async (headLecturerId: string) => {
  const hl = await prisma.headLecturer.findUnique({
    where: { headLecturerId },
    include: { ...headLecturerInclude, documents: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } } },
  })
  if (!hl) throw new AppError('Head lecturer not found', 404, 'HEAD_LECTURER_NOT_FOUND_404')
  return hl
}

export const create = async (data: {
  staffNumber: string
  name: string
  email: string
  password: string
  mykadNumber?: string
}) => {
  const passwordHash = await bcrypt.hash(data.password, 12)

  try {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          passwordHash,
          name: data.name,
          type: 'HEAD_LECTURER',
          isEmailVerified: true,
          emailVerifiedAt: new Date(),
        },
      })
      return await tx.headLecturer.create({
        data: {
          staffNumber: data.staffNumber,
          mykadNumber: data.mykadNumber ?? null,
          userId: user.userId,
        },
        include: headLecturerInclude,
      })
    })
  } catch (err) {
    return handlePrismaError(err, 'Head Lecturer')
  }
}

export const update = async (headLecturerId: string, data: {
  name?: string
  mykadNumber?: string | null
}) => {
  const hl = await getById(headLecturerId)

  const updateData: Record<string, unknown> = {}
  if (data.mykadNumber !== undefined) updateData.mykadNumber = data.mykadNumber

  try {
    if (data.name) {
      await prisma.user.update({ where: { userId: hl.user.userId }, data: { name: data.name } })
    }
    return await prisma.headLecturer.update({ where: { headLecturerId }, data: updateData, include: headLecturerInclude })
  } catch (err) {
    return handlePrismaError(err, 'Head Lecturer')
  }
}

export const remove = async (headLecturerId: string) => {
  const hl = await getById(headLecturerId)
  try {
    await prisma.user.update({ where: { userId: hl.user.userId }, data: { deletedAt: new Date() } })
  } catch (err) {
    return handlePrismaError(err, 'Head Lecturer')
  }
}
```

### src/services/lecturers.service.ts

```typescript
import bcrypt from 'bcrypt'
import prisma from '../config/db.js'
import { AppError } from '../utils/AppError.js'
import { handlePrismaError } from '../utils/prismaErrors.js'

const lecturerInclude = {
  user: { select: { userId: true, name: true, email: true, status: true } },
  course: { select: { courseId: true, courseCode: true, courseName: true } },
} as const

export const getAll = async (page: number, limit: number) => {
  const skip = (page - 1) * limit
  const where = { user: { deletedAt: null } }
  const [items, total] = await Promise.all([
    prisma.lecturer.findMany({ where, include: lecturerInclude, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.lecturer.count({ where }),
  ])
  return { items, total }
}

export const getById = async (lecturerId: string) => {
  const lecturer = await prisma.lecturer.findUnique({
    where: { lecturerId },
    include: { ...lecturerInclude, documents: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } } },
  })
  if (!lecturer) throw new AppError('Lecturer not found', 404, 'LECTURER_NOT_FOUND_404')
  return lecturer
}

export const create = async (data: {
  staffNumber: string
  name: string
  email: string
  password: string
  mykadNumber?: string
  courseCode: string
}) => {
  const course = await prisma.course.findUnique({ where: { courseCode: data.courseCode } })
  if (!course) throw new AppError('Course not found', 404, 'COURSE_NOT_FOUND_404')

  const passwordHash = await bcrypt.hash(data.password, 12)

  try {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          passwordHash,
          name: data.name,
          type: 'LECTURER',
          isEmailVerified: true,
          emailVerifiedAt: new Date(),
        },
      })
      return await tx.lecturer.create({
        data: {
          staffNumber: data.staffNumber,
          mykadNumber: data.mykadNumber ?? null,
          courseId: course.courseId,
          userId: user.userId,
        },
        include: lecturerInclude,
      })
    })
  } catch (err) {
    return handlePrismaError(err, 'Lecturer')
  }
}

export const update = async (lecturerId: string, data: {
  name?: string
  courseCode?: string
  mykadNumber?: string | null
}) => {
  const lecturer = await getById(lecturerId)

  const updateData: Record<string, unknown> = {}
  if (data.mykadNumber !== undefined) updateData.mykadNumber = data.mykadNumber
  if (data.courseCode) {
    const course = await prisma.course.findUnique({ where: { courseCode: data.courseCode } })
    if (!course) throw new AppError('Course not found', 404, 'COURSE_NOT_FOUND_404')
    updateData.courseId = course.courseId
  }

  try {
    if (data.name) {
      await prisma.user.update({ where: { userId: lecturer.user.userId }, data: { name: data.name } })
    }
    return await prisma.lecturer.update({ where: { lecturerId }, data: updateData, include: lecturerInclude })
  } catch (err) {
    return handlePrismaError(err, 'Lecturer')
  }
}

export const remove = async (lecturerId: string) => {
  const lecturer = await getById(lecturerId)
  try {
    await prisma.user.update({ where: { userId: lecturer.user.userId }, data: { deletedAt: new Date() } })
  } catch (err) {
    return handlePrismaError(err, 'Lecturer')
  }
}
```

### src/services/students.service.ts

```typescript
import bcrypt from 'bcrypt'
import prisma from '../config/db.js'
import { AppError } from '../utils/AppError.js'
import { handlePrismaError } from '../utils/prismaErrors.js'

const studentInclude = {
  user: { select: { userId: true, name: true, email: true, status: true } },
  course: { select: { courseId: true, courseCode: true, courseName: true } },
} as const

export const getAll = async (page: number, limit: number, filters: {
  search?: string
  gender?: string
  courseCode?: string
  sortBy?: string
  order?: 'asc' | 'desc'
}) => {
  const where: Record<string, unknown> = { user: { deletedAt: null } }
  if (filters.search) {
    where.OR = [
      { studentNumber: { contains: filters.search } },
      { user: { name: { contains: filters.search } } },
      { user: { email: { contains: filters.search } } },
    ]
  }
  if (filters.gender) {
    where.user = { ...where.user as object, profile: { gender: filters.gender } }
  }
  if (filters.courseCode) {
    where.course = { courseCode: filters.courseCode }
  }

  const orderBy = filters.sortBy === 'name'
    ? { user: { name: filters.order ?? 'desc' } }
    : { [filters.sortBy ?? 'createdAt']: filters.order ?? 'desc' }

  const skip = (page - 1) * limit
  const [items, total] = await Promise.all([
    prisma.student.findMany({ where, include: studentInclude, orderBy, skip, take: limit }),
    prisma.student.count({ where }),
  ])
  return { items, total }
}

export const getById = async (studentId: string) => {
  const student = await prisma.student.findUnique({
    where: { studentId },
    include: { ...studentInclude, documents: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } } },
  })
  if (!student) throw new AppError('Student not found', 404, 'STUDENT_NOT_FOUND_404')
  return student
}

export const create = async (data: {
  studentNumber: string
  name: string
  email: string
  mykadNumber?: string
  courseCode: string
}) => {
  const course = await prisma.course.findUnique({ where: { courseCode: data.courseCode } })
  if (!course) throw new AppError('Course not found', 404, 'COURSE_NOT_FOUND_404')

  const defaultPassword = `Monash@${data.studentNumber}`
  const passwordHash = await bcrypt.hash(defaultPassword, 12)

  try {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          passwordHash,
          name: data.name,
          type: 'STUDENT',
          isEmailVerified: true,
          emailVerifiedAt: new Date(),
        },
      })
      const student = await tx.student.create({
        data: {
          studentNumber: data.studentNumber,
          mykadNumber: data.mykadNumber ?? null,
          courseId: course.courseId,
          userId: user.userId,
        },
        include: studentInclude,
      })
      return student
    })
  } catch (err) {
    return handlePrismaError(err, 'Student')
  }
}

export const update = async (studentId: string, data: {
  name?: string
  courseCode?: string
  mykadNumber?: string | null
}) => {
  const student = await getById(studentId)

  const updateData: Record<string, unknown> = {}
  if (data.mykadNumber !== undefined) updateData.mykadNumber = data.mykadNumber
  if (data.courseCode) {
    const course = await prisma.course.findUnique({ where: { courseCode: data.courseCode } })
    if (!course) throw new AppError('Course not found', 404, 'COURSE_NOT_FOUND_404')
    updateData.courseId = course.courseId
  }

  try {
    if (data.name) {
      await prisma.user.update({ where: { userId: student.user.userId }, data: { name: data.name } })
    }
    return await prisma.student.update({
      where: { studentId },
      data: updateData,
      include: studentInclude,
    })
  } catch (err) {
    return handlePrismaError(err, 'Student')
  }
}

export const remove = async (studentId: string) => {
  const student = await getById(studentId)
  try {
    await prisma.user.update({ where: { userId: student.user.userId }, data: { deletedAt: new Date() } })
  } catch (err) {
    return handlePrismaError(err, 'Student')
  }
}
```

### src/controllers/auth.controller.ts

```typescript
import type { Request, Response } from 'express'
import { response } from '../utils/response.js'
import * as authService from '../services/auth.service.js'
import * as tokenService from '../services/token.service.js'

export const register = async (req: Request, res: Response): Promise<void> => {
  const data = req.validated.body as { name: string; email: string; password: string; studentNumber?: string }
  const result = await authService.register(data)
  response(res, 201, 'Registration successful. Please check your email to verify your account.', result)
}

export const login = async (req: Request, res: Response): Promise<void> => {
  const data = req.validated.body as { email: string; password: string }
  const result = await authService.login(data)
  tokenService.setRefreshCookie(res, result.refreshToken)
  response(res, 200, 'Login successful', { accessToken: result.accessToken, user: result.user })
}

export const refresh = async (req: Request, res: Response): Promise<void> => {
  const refreshToken = req.cookies?.refreshToken
  if (!refreshToken) {
    response(res, 401, 'No refresh token', null, 'UNAUTHORIZED_401')
    return
  }
  const result = await authService.refreshTokens(refreshToken)
  response(res, 200, 'Token refreshed successfully', result)
}

export const logout = async (req: Request, res: Response): Promise<void> => {
  const token = req.headers.authorization?.slice(7) ?? ''
  await authService.logout(req.user!.userId, token)
  tokenService.clearRefreshCookie(res)
  response(res, 200, 'Logged out successfully')
}

export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  const { token } = req.validated.query as { token: string }
  const result = await authService.verifyEmail(token)
  tokenService.setRefreshCookie(res, result.refreshToken)
  response(res, 200, 'Email verified successfully', { accessToken: result.accessToken, user: result.user })
}

export const resendVerification = async (req: Request, res: Response): Promise<void> => {
  const { email } = req.validated.body as { email: string }
  await authService.resendVerification(email)
  response(res, 200, 'Verification email resent. Please check your inbox.')
}

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  const { email } = req.validated.body as { email: string }
  await authService.forgotPassword(email)
  response(res, 200, 'If this email is registered, a reset link has been sent.')
}

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  const { token, password } = req.validated.body as { token: string; password: string }
  await authService.resetPassword(token, password)
  response(res, 200, 'Password reset successful. Please login.')
}

export const getMe = async (req: Request, res: Response): Promise<void> => {
  const user = await authService.getMe(req.user!.userId)
  response(res, 200, 'Profile retrieved successfully', user)
}

export const updateMe = async (req: Request, res: Response): Promise<void> => {
  const data = req.validated.body as { name: string }
  const user = await authService.updateMe(req.user!.userId, data)
  response(res, 200, 'Profile updated successfully', user)
}

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  const data = req.validated.body as Record<string, unknown>
  const user = await authService.updateProfile(req.user!.userId, data as Parameters<typeof authService.updateProfile>[1])
  response(res, 200, 'Profile updated successfully', user)
}

export const changePassword = async (req: Request, res: Response): Promise<void> => {
  const { currentPassword, newPassword } = req.validated.body as { currentPassword: string; newPassword: string }
  await authService.changePassword(req.user!.userId, currentPassword, newPassword)
  response(res, 200, 'Password changed successfully')
}
```

### src/controllers/courses.controller.ts

```typescript
import type { Request, Response } from 'express'
import { response } from '../utils/response.js'
import { buildPagination } from '../utils/pagination.js'
import * as coursesService from '../services/courses.service.js'
import type { PaginationQuery } from '../validations/paginationSchema.js'

export const getAllCourses = async (req: Request, res: Response): Promise<void> => {
  const { page, limit } = req.validated.query as PaginationQuery
  const { items, total } = await coursesService.getAll(page, limit)
  const { meta, links } = buildPagination(req, page, limit, total)
  response(res, 200, 'Courses retrieved successfully', items, null, [], meta, links)
}

export const getCourseById = async (req: Request, res: Response): Promise<void> => {
  const { courseId } = req.validated.params as { courseId: string }
  const course = await coursesService.getById(courseId)
  response(res, 200, 'Course retrieved successfully', course)
}

export const createCourse = async (req: Request, res: Response): Promise<void> => {
  const data = req.validated.body as Parameters<typeof coursesService.create>[0]
  const course = await coursesService.create(data)
  response(res, 201, 'Course created successfully', course)
}

export const updateCourse = async (req: Request, res: Response): Promise<void> => {
  const { courseId } = req.validated.params as { courseId: string }
  const data = req.validated.body as Parameters<typeof coursesService.update>[1]
  const course = await coursesService.update(courseId, data)
  response(res, 200, 'Course updated successfully', course)
}

export const deleteCourse = async (req: Request, res: Response): Promise<void> => {
  const { courseId } = req.validated.params as { courseId: string }
  await coursesService.remove(courseId)
  res.status(204).end()
}
```

### src/controllers/documents.controller.ts

```typescript
import type { Request, Response } from 'express'
import { response } from '../utils/response.js'
import { AppError } from '../utils/AppError.js'
import * as documentsService from '../services/documents.service.js'

const requireFile = (req: Request) => {
  if (!req.file) throw new AppError('No file uploaded', 400, 'NO_FILE_400')
  return req.file
}

export const uploadStudentDocument = async (req: Request, res: Response): Promise<void> => {
  const { studentId } = req.validated.params as { studentId: string }
  const file = requireFile(req)
  const { category } = req.validated.body as { category: string }

  const doc = await documentsService.createDocument(req, file, {
    entityId: studentId,
    entityType: 'STUDENT',
    category,
    relationField: 'studentId',
    relationId: studentId,
  })
  response(res, 201, 'Document uploaded successfully', doc)
}

export const getStudentDocuments = async (req: Request, res: Response): Promise<void> => {
  const { studentId } = req.validated.params as { studentId: string }
  const docs = await documentsService.getDocumentsByEntity(studentId, 'STUDENT')
  response(res, 200, 'Documents retrieved successfully', docs)
}

export const uploadLecturerDocument = async (req: Request, res: Response): Promise<void> => {
  const { lecturerId } = req.validated.params as { lecturerId: string }
  const file = requireFile(req)
  const { category } = req.validated.body as { category: string }

  const doc = await documentsService.createDocument(req, file, {
    entityId: lecturerId,
    entityType: 'LECTURER',
    category,
    relationField: 'lecturerId',
    relationId: lecturerId,
  })
  response(res, 201, 'Document uploaded successfully', doc)
}

export const getLecturerDocuments = async (req: Request, res: Response): Promise<void> => {
  const { lecturerId } = req.validated.params as { lecturerId: string }
  const docs = await documentsService.getDocumentsByEntity(lecturerId, 'LECTURER')
  response(res, 200, 'Documents retrieved successfully', docs)
}

export const uploadHeadLecturerDocument = async (req: Request, res: Response): Promise<void> => {
  const { headLecturerId } = req.validated.params as { headLecturerId: string }
  const file = requireFile(req)
  const { category } = req.validated.body as { category: string }

  const doc = await documentsService.createDocument(req, file, {
    entityId: headLecturerId,
    entityType: 'HEAD_LECTURER',
    category,
    relationField: 'headLecturerId',
    relationId: headLecturerId,
  })
  response(res, 201, 'Document uploaded successfully', doc)
}

export const getHeadLecturerDocuments = async (req: Request, res: Response): Promise<void> => {
  const { headLecturerId } = req.validated.params as { headLecturerId: string }
  const docs = await documentsService.getDocumentsByEntity(headLecturerId, 'HEAD_LECTURER')
  response(res, 200, 'Documents retrieved successfully', docs)
}

export const deleteDocument = async (req: Request, res: Response): Promise<void> => {
  const { documentId } = req.validated.params as { documentId: string }
  const doc = await documentsService.getDocumentById(documentId)
  await documentsService.deleteFileFromDisk(doc.filePath)
  await documentsService.softDeleteDocument(documentId)
  res.status(204).end()
}
```

### src/controllers/headLecturers.controller.ts

```typescript
import type { Request, Response } from 'express'
import { response } from '../utils/response.js'
import { buildPagination } from '../utils/pagination.js'
import * as headLecturersService from '../services/headLecturers.service.js'
import type { PaginationQuery } from '../validations/paginationSchema.js'

export const getAllHeadLecturers = async (req: Request, res: Response): Promise<void> => {
  const { page, limit } = req.validated.query as PaginationQuery
  const { items, total } = await headLecturersService.getAll(page, limit)
  const { meta, links } = buildPagination(req, page, limit, total)
  response(res, 200, 'Head lecturers retrieved successfully', items, null, [], meta, links)
}

export const getHeadLecturerById = async (req: Request, res: Response): Promise<void> => {
  const { headLecturerId } = req.validated.params as { headLecturerId: string }
  const hl = await headLecturersService.getById(headLecturerId)
  response(res, 200, 'Head lecturer retrieved successfully', hl)
}

export const createHeadLecturer = async (req: Request, res: Response): Promise<void> => {
  const data = req.validated.body as Parameters<typeof headLecturersService.create>[0]
  const hl = await headLecturersService.create(data)
  response(res, 201, 'Head lecturer created successfully', hl)
}

export const updateHeadLecturer = async (req: Request, res: Response): Promise<void> => {
  const { headLecturerId } = req.validated.params as { headLecturerId: string }
  const data = req.validated.body as Parameters<typeof headLecturersService.update>[1]
  const hl = await headLecturersService.update(headLecturerId, data)
  response(res, 200, 'Head lecturer updated successfully', hl)
}

export const deleteHeadLecturer = async (req: Request, res: Response): Promise<void> => {
  const { headLecturerId } = req.validated.params as { headLecturerId: string }
  await headLecturersService.remove(headLecturerId)
  res.status(204).end()
}
```

### src/controllers/lecturers.controller.ts

```typescript
import type { Request, Response } from 'express'
import { response } from '../utils/response.js'
import { buildPagination } from '../utils/pagination.js'
import * as lecturersService from '../services/lecturers.service.js'
import type { PaginationQuery } from '../validations/paginationSchema.js'

export const getAllLecturers = async (req: Request, res: Response): Promise<void> => {
  const { page, limit } = req.validated.query as PaginationQuery
  const { items, total } = await lecturersService.getAll(page, limit)
  const { meta, links } = buildPagination(req, page, limit, total)
  response(res, 200, 'Lecturers retrieved successfully', items, null, [], meta, links)
}

export const getLecturerById = async (req: Request, res: Response): Promise<void> => {
  const { lecturerId } = req.validated.params as { lecturerId: string }
  const lecturer = await lecturersService.getById(lecturerId)
  response(res, 200, 'Lecturer retrieved successfully', lecturer)
}

export const createLecturer = async (req: Request, res: Response): Promise<void> => {
  const data = req.validated.body as Parameters<typeof lecturersService.create>[0]
  const lecturer = await lecturersService.create(data)
  response(res, 201, 'Lecturer created successfully', lecturer)
}

export const updateLecturer = async (req: Request, res: Response): Promise<void> => {
  const { lecturerId } = req.validated.params as { lecturerId: string }
  const data = req.validated.body as Parameters<typeof lecturersService.update>[1]
  const lecturer = await lecturersService.update(lecturerId, data)
  response(res, 200, 'Lecturer updated successfully', lecturer)
}

export const deleteLecturer = async (req: Request, res: Response): Promise<void> => {
  const { lecturerId } = req.validated.params as { lecturerId: string }
  await lecturersService.remove(lecturerId)
  res.status(204).end()
}
```

### src/controllers/me.controller.ts

```typescript
import type { Request, Response } from 'express'
import { response } from '../utils/response.js'
import { buildPagination } from '../utils/pagination.js'
import prisma from '../config/db.js'
import { AppError } from '../utils/AppError.js'
import * as documentsService from '../services/documents.service.js'
import type { PaginationQuery } from '../validations/paginationSchema.js'

const getEntityRecord = async (userId: string, type: string) => {
  if (type === 'STUDENT') {
    const r = await prisma.student.findUnique({ where: { userId } })
    return r ? { entityId: r.studentId, model: 'student' } : null
  }
  if (type === 'LECTURER') {
    const r = await prisma.lecturer.findUnique({ where: { userId } })
    return r ? { entityId: r.lecturerId, model: 'lecturer' } : null
  }
  const r = await prisma.headLecturer.findUnique({ where: { userId } })
  return r ? { entityId: r.headLecturerId, model: 'headLecturer' } : null
}

export const getMyStudent = async (req: Request, res: Response): Promise<void> => {
  const student = await prisma.student.findUnique({
    where: { userId: req.user!.userId },
    include: { course: true },
  })
  if (!student) throw new AppError('Student record not found', 404, 'STUDENT_NOT_FOUND_404')
  response(res, 200, 'Student data retrieved successfully', student)
}

export const updateMyStudent = async (req: Request, res: Response): Promise<void> => {
  const student = await prisma.student.findUnique({ where: { userId: req.user!.userId } })
  if (!student) throw new AppError('Student record not found', 404, 'STUDENT_NOT_FOUND_404')

  const data = req.validated.body as { mykadNumber?: string | null }
  const updated = await prisma.student.update({
    where: { studentId: student.studentId },
    data: { mykadNumber: data.mykadNumber },
    include: { course: true },
  })
  response(res, 200, 'Student data updated successfully', updated)
}

export const getMyCourse = async (req: Request, res: Response): Promise<void> => {
  const student = await prisma.student.findUnique({
    where: { userId: req.user!.userId },
    include: { course: true },
  })
  if (!student) throw new AppError('Student record not found', 404, 'STUDENT_NOT_FOUND_404')
  response(res, 200, 'Course retrieved successfully', student.course)
}

export const getMyLecturer = async (req: Request, res: Response): Promise<void> => {
  const lecturer = await prisma.lecturer.findUnique({
    where: { userId: req.user!.userId },
    include: { course: true },
  })
  if (!lecturer) throw new AppError('Lecturer record not found', 404, 'LECTURER_NOT_FOUND_404')
  response(res, 200, 'Lecturer data retrieved successfully', lecturer)
}

export const updateMyLecturer = async (req: Request, res: Response): Promise<void> => {
  const lecturer = await prisma.lecturer.findUnique({ where: { userId: req.user!.userId } })
  if (!lecturer) throw new AppError('Lecturer record not found', 404, 'LECTURER_NOT_FOUND_404')

  const data = req.validated.body as { mykadNumber?: string | null }
  const updated = await prisma.lecturer.update({
    where: { lecturerId: lecturer.lecturerId },
    data: { mykadNumber: data.mykadNumber },
    include: { course: true },
  })
  response(res, 200, 'Lecturer data updated successfully', updated)
}

export const getMyStudents = async (req: Request, res: Response): Promise<void> => {
  const lecturer = await prisma.lecturer.findUnique({ where: { userId: req.user!.userId } })
  if (!lecturer) throw new AppError('Lecturer record not found', 404, 'LECTURER_NOT_FOUND_404')

  const { page, limit } = req.validated.query as PaginationQuery
  const skip = (page - 1) * limit
  const where = { courseId: lecturer.courseId, user: { deletedAt: null } }

  const [items, total] = await Promise.all([
    prisma.student.findMany({
      where,
      include: { user: { select: { userId: true, name: true, email: true, status: true } } },
      skip,
      take: limit,
    }),
    prisma.student.count({ where }),
  ])
  const { meta, links } = buildPagination(req, page, limit, total)
  response(res, 200, 'Students retrieved successfully', items, null, [], meta, links)
}

export const getMyDocuments = async (req: Request, res: Response): Promise<void> => {
  const entity = await getEntityRecord(req.user!.userId, req.user!.type)
  if (!entity) throw new AppError('Record not found', 404, 'RECORD_NOT_FOUND_404')

  const docs = await documentsService.getDocumentsByEntity(entity.entityId, req.user!.type)
  response(res, 200, 'Documents retrieved successfully', docs)
}

export const uploadMyDocument = async (req: Request, res: Response): Promise<void> => {
  if (!req.file) throw new AppError('No file uploaded', 400, 'NO_FILE_400')

  const entity = await getEntityRecord(req.user!.userId, req.user!.type)
  if (!entity) throw new AppError('Record not found', 404, 'RECORD_NOT_FOUND_404')

  const { category } = req.validated.body as { category: string }

  const doc = await documentsService.createDocument(req, req.file, {
    entityId: entity.entityId,
    entityType: req.user!.type,
    category,
    relationField: `${entity.model}Id`,
    relationId: entity.entityId,
  })

  response(res, 201, 'Document uploaded successfully', doc)
}
```

### src/controllers/students.controller.ts

```typescript
import type { Request, Response } from 'express'
import { response } from '../utils/response.js'
import { buildPagination } from '../utils/pagination.js'
import * as studentsService from '../services/students.service.js'

export const getAllStudents = async (req: Request, res: Response): Promise<void> => {
  const { page, limit, ...filters } = req.validated.query as Record<string, unknown>
  const { items, total } = await studentsService.getAll(page as number, limit as number, filters)
  const { meta, links } = buildPagination(req, page as number, limit as number, total)
  response(res, 200, 'Students retrieved successfully', items, null, [], meta, links)
}

export const getStudentById = async (req: Request, res: Response): Promise<void> => {
  const { studentId } = req.validated.params as { studentId: string }
  const student = await studentsService.getById(studentId)
  response(res, 200, 'Student retrieved successfully', student)
}

export const createStudent = async (req: Request, res: Response): Promise<void> => {
  const data = req.validated.body as Parameters<typeof studentsService.create>[0]
  const student = await studentsService.create(data)
  response(res, 201, 'Student created successfully', student)
}

export const updateStudent = async (req: Request, res: Response): Promise<void> => {
  const { studentId } = req.validated.params as { studentId: string }
  const data = req.validated.body as Parameters<typeof studentsService.update>[1]
  const student = await studentsService.update(studentId, data)
  response(res, 200, 'Student updated successfully', student)
}

export const deleteStudent = async (req: Request, res: Response): Promise<void> => {
  const { studentId } = req.validated.params as { studentId: string }
  await studentsService.remove(studentId)
  res.status(204).end()
}
```

### src/controllers/utility.controller.ts

```typescript
import type { Request, Response } from 'express'
import { response } from '../utils/response.js'
import prisma from '../config/db.js'

export const getEnums = async (_req: Request, res: Response): Promise<void> => {
  response(res, 200, 'Enums retrieved successfully', {
    genders: ['Male', 'Female'],
    races: ['Malay', 'Chinese', 'Indian', 'Others'],
    states: [
      'Johor', 'Kedah', 'Kelantan', 'Melaka', 'NegeriSembilan', 'Pahang',
      'Perak', 'Perlis', 'PulauPinang', 'Sabah', 'Sarawak', 'Selangor',
      'Terengganu', 'KualaLumpur', 'Labuan', 'Putrajaya',
    ],
    fileCategories: ['PROFILE_PICTURE', 'IC', 'TRANSCRIPT', 'DOCUMENT', 'OTHER'],
    userStatuses: ['ACTIVE', 'INACTIVE', 'SUSPENDED'],
    userTypes: ['STUDENT', 'LECTURER', 'HEAD_LECTURER'],
  })
}

export const getStats = async (_req: Request, res: Response): Promise<void> => {
  const [totalStudents, totalLecturers, totalHeadLecturers, totalCourses, activeUsers] = await Promise.all([
    prisma.student.count({ where: { user: { deletedAt: null } } }),
    prisma.lecturer.count({ where: { user: { deletedAt: null } } }),
    prisma.headLecturer.count({ where: { user: { deletedAt: null } } }),
    prisma.course.count(),
    prisma.user.count({ where: { status: 'ACTIVE', deletedAt: null } }),
  ])

  const studentsByCourse = await prisma.course.findMany({
    select: {
      courseCode: true,
      courseName: true,
      _count: { select: { students: true } },
    },
    orderBy: { courseCode: 'asc' },
  })

  const recentRegistrations = await prisma.user.findMany({
    where: { deletedAt: null },
    select: { userId: true, name: true, type: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 5,
  })

  response(res, 200, 'Stats retrieved successfully', {
    totalStudents,
    totalLecturers,
    totalHeadLecturers,
    totalCourses,
    activeUsers,
    studentsByCourse: studentsByCourse.map((c) => ({
      courseCode: c.courseCode,
      courseName: c.courseName,
      total: c._count.students,
    })),
    recentRegistrations,
  })
}
```

### src/routes/index.ts

```typescript
import { Router } from 'express'
import prisma from '../config/db.js'
import logger from '../utils/logger.js'
import { authenticate, authorize, requireVerifiedEmail } from '../middleware/auth.middleware.js'
import { getEnums, getStats } from '../controllers/utility.controller.js'

import authRoutes from './auth.routes.js'
import meRoutes from './me.routes.js'
import studentsRoutes from './students.routes.js'
import coursesRoutes from './courses.routes.js'
import lecturersRoutes from './lecturers.routes.js'
import headLecturersRoutes from './headLecturers.routes.js'
import documentsRoutes from './documents.routes.js'

const router = Router()

router.get('/', (_req, res) => {
  res.status(200).json({
    message: 'SUCCESS - Welcome to Monash API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  })
})

router.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.status(200).json({ status: 'Ok', database: 'connected', timestamp: new Date().toISOString() })
  } catch (err) {
    logger.error({ message: 'Health check failed', err })
    res.status(500).json({ status: 'ERROR', database: 'disconnected', timestamp: new Date().toISOString() })
  }
})

router.get('/enums', authenticate, getEnums)
router.get('/stats', authenticate, requireVerifiedEmail, authorize('LECTURER', 'HEAD_LECTURER'), getStats)

router.use('/auth', authRoutes)
router.use('/me', meRoutes)
router.use('/students', studentsRoutes)
router.use('/courses', coursesRoutes)
router.use('/lecturers', lecturersRoutes)
router.use('/head-lecturers', headLecturersRoutes)
router.use('/', documentsRoutes)

if (process.env.NODE_ENV === 'development') {
  router.get('/test-error', (_req, _res, next) => {
    next(new Error('Test internal server error'))
  })
}

export default router
```

### src/routes/auth.routes.ts

```typescript
import { Router } from 'express'
import * as authController from '../controllers/auth.controller.js'
import { validateZod } from '../middleware/validateZod.middleware.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { authLimiter } from '../middleware/rateLimit.middleware.js'
import {
  registerSchema, loginSchema, verifyEmailQuerySchema,
  resendVerificationSchema, forgotPasswordSchema, resetPasswordSchema,
  updateMeSchema, changePasswordSchema,
} from '../validations/authValidation.js'
import { updateProfileSchema } from '../validations/profileValidation.js'

const router = Router()

router.post('/register', authLimiter, validateZod(registerSchema, 'body'), authController.register)
router.post('/login', authLimiter, validateZod(loginSchema, 'body'), authController.login)
router.post('/refresh', authController.refresh)
router.post('/logout', authenticate, authController.logout)

router.get('/verify-email', validateZod(verifyEmailQuerySchema, 'query'), authController.verifyEmail)
router.post('/resend-verification', authLimiter, validateZod(resendVerificationSchema, 'body'), authController.resendVerification)
router.post('/forgot-password', authLimiter, validateZod(forgotPasswordSchema, 'body'), authController.forgotPassword)
router.post('/reset-password', authLimiter, validateZod(resetPasswordSchema, 'body'), authController.resetPassword)

router.get('/me', authenticate, authController.getMe)
router.patch('/me', authenticate, validateZod(updateMeSchema, 'body'), authController.updateMe)
router.patch('/me/profile', authenticate, validateZod(updateProfileSchema, 'body'), authController.updateProfile)
router.patch('/me/password', authenticate, validateZod(changePasswordSchema, 'body'), authController.changePassword)

export default router
```

### src/routes/me.routes.ts

```typescript
import { Router } from 'express'
import * as meController from '../controllers/me.controller.js'
import { validateZod } from '../middleware/validateZod.middleware.js'
import { authenticate, authorize, requireVerifiedEmail } from '../middleware/auth.middleware.js'
import { paginationSchema } from '../validations/paginationSchema.js'
import { uploadDocument } from '../config/multer.js'
import { z } from 'zod'

const mykadUpdateSchema = z.object({
  mykadNumber: z.string().length(12).regex(/^\d{12}$/).optional().nullable(),
})

const uploadCategorySchema = z.object({
  category: z.enum(['PROFILE_PICTURE', 'IC', 'TRANSCRIPT', 'DOCUMENT', 'OTHER']),
})

const router = Router()

router.use(authenticate, requireVerifiedEmail)

router.get('/student', authorize('STUDENT'), meController.getMyStudent)
router.patch('/student', authorize('STUDENT'), validateZod(mykadUpdateSchema, 'body'), meController.updateMyStudent)
router.get('/course', authorize('STUDENT'), meController.getMyCourse)

router.get('/lecturer', authorize('LECTURER'), meController.getMyLecturer)
router.patch('/lecturer', authorize('LECTURER'), validateZod(mykadUpdateSchema, 'body'), meController.updateMyLecturer)
router.get('/students', authorize('LECTURER'), validateZod(paginationSchema, 'query'), meController.getMyStudents)

router.get('/documents', meController.getMyDocuments)
router.post('/documents', uploadDocument.single('file'), validateZod(uploadCategorySchema, 'body'), meController.uploadMyDocument)

export default router
```

### src/routes/students.routes.ts

```typescript
import { Router } from 'express'
import * as studentsController from '../controllers/students.controller.js'
import { validateZod } from '../middleware/validateZod.middleware.js'
import { authenticate, authorize, requireVerifiedEmail } from '../middleware/auth.middleware.js'
import { studentParamsSchema, studentQuerySchema, createStudentSchema, updateStudentSchema } from '../validations/studentValidation.js'

const router = Router()

router.use(authenticate, requireVerifiedEmail)

router.get('/', authorize('LECTURER', 'HEAD_LECTURER'), validateZod(studentQuerySchema, 'query'), studentsController.getAllStudents)
router.get('/:studentId', authorize('LECTURER', 'HEAD_LECTURER'), validateZod(studentParamsSchema, 'params'), studentsController.getStudentById)
router.post('/', authorize('HEAD_LECTURER'), validateZod(createStudentSchema, 'body'), studentsController.createStudent)
router.patch('/:studentId', authorize('HEAD_LECTURER'), validateZod(studentParamsSchema, 'params'), validateZod(updateStudentSchema, 'body'), studentsController.updateStudent)
router.delete('/:studentId', authorize('HEAD_LECTURER'), validateZod(studentParamsSchema, 'params'), studentsController.deleteStudent)

export default router
```

### src/routes/courses.routes.ts

```typescript
import { Router } from 'express'
import * as coursesController from '../controllers/courses.controller.js'
import { validateZod } from '../middleware/validateZod.middleware.js'
import { authenticate, authorize, requireVerifiedEmail } from '../middleware/auth.middleware.js'
import { paginationSchema } from '../validations/paginationSchema.js'
import { courseParamsSchema, createCourseSchema, updateCourseSchema } from '../validations/courseValidation.js'

const router = Router()

router.use(authenticate, requireVerifiedEmail)

router.get('/', authorize('LECTURER', 'HEAD_LECTURER'), validateZod(paginationSchema, 'query'), coursesController.getAllCourses)
router.get('/:courseId', authorize('LECTURER', 'HEAD_LECTURER'), validateZod(courseParamsSchema, 'params'), coursesController.getCourseById)
router.post('/', authorize('HEAD_LECTURER'), validateZod(createCourseSchema, 'body'), coursesController.createCourse)
router.patch('/:courseId', authorize('HEAD_LECTURER'), validateZod(courseParamsSchema, 'params'), validateZod(updateCourseSchema, 'body'), coursesController.updateCourse)
router.delete('/:courseId', authorize('HEAD_LECTURER'), validateZod(courseParamsSchema, 'params'), coursesController.deleteCourse)

export default router
```

### src/routes/lecturers.routes.ts

```typescript
import { Router } from 'express'
import * as lecturersController from '../controllers/lecturers.controller.js'
import { validateZod } from '../middleware/validateZod.middleware.js'
import { authenticate, authorize, requireVerifiedEmail } from '../middleware/auth.middleware.js'
import { paginationSchema } from '../validations/paginationSchema.js'
import { lecturerParamsSchema, createLecturerSchema, updateLecturerSchema } from '../validations/lecturerValidation.js'

const router = Router()

router.use(authenticate, requireVerifiedEmail)

router.get('/', authorize('HEAD_LECTURER'), validateZod(paginationSchema, 'query'), lecturersController.getAllLecturers)
router.get('/:lecturerId', authorize('HEAD_LECTURER'), validateZod(lecturerParamsSchema, 'params'), lecturersController.getLecturerById)
router.post('/', authorize('HEAD_LECTURER'), validateZod(createLecturerSchema, 'body'), lecturersController.createLecturer)
router.patch('/:lecturerId', authorize('HEAD_LECTURER'), validateZod(lecturerParamsSchema, 'params'), validateZod(updateLecturerSchema, 'body'), lecturersController.updateLecturer)
router.delete('/:lecturerId', authorize('HEAD_LECTURER'), validateZod(lecturerParamsSchema, 'params'), lecturersController.deleteLecturer)

export default router
```

### src/routes/headLecturers.routes.ts

```typescript
import { Router } from 'express'
import * as headLecturersController from '../controllers/headLecturers.controller.js'
import { validateZod } from '../middleware/validateZod.middleware.js'
import { authenticate, authorize, requireVerifiedEmail } from '../middleware/auth.middleware.js'
import { paginationSchema } from '../validations/paginationSchema.js'
import { headLecturerParamsSchema, createHeadLecturerSchema, updateHeadLecturerSchema } from '../validations/headLecturerValidation.js'

const router = Router()

router.use(authenticate, requireVerifiedEmail, authorize('HEAD_LECTURER'))

router.get('/', validateZod(paginationSchema, 'query'), headLecturersController.getAllHeadLecturers)
router.get('/:headLecturerId', validateZod(headLecturerParamsSchema, 'params'), headLecturersController.getHeadLecturerById)
router.post('/', validateZod(createHeadLecturerSchema, 'body'), headLecturersController.createHeadLecturer)
router.patch('/:headLecturerId', validateZod(headLecturerParamsSchema, 'params'), validateZod(updateHeadLecturerSchema, 'body'), headLecturersController.updateHeadLecturer)
router.delete('/:headLecturerId', validateZod(headLecturerParamsSchema, 'params'), headLecturersController.deleteHeadLecturer)

export default router
```

### src/routes/documents.routes.ts

```typescript
import { Router } from 'express'
import * as documentsController from '../controllers/documents.controller.js'
import { validateZod } from '../middleware/validateZod.middleware.js'
import { authenticate, authorize, requireVerifiedEmail } from '../middleware/auth.middleware.js'
import { uploadDocument } from '../config/multer.js'
import {
  documentIdParamsSchema, studentDocParamsSchema,
  lecturerDocParamsSchema, headLecturerDocParamsSchema, uploadCategorySchema,
} from '../validations/documentValidation.js'

const router = Router()

router.use(authenticate, requireVerifiedEmail)

router.post(
  '/students/:studentId/documents',
  authorize('HEAD_LECTURER'),
  validateZod(studentDocParamsSchema, 'params'),
  uploadDocument.single('file'),
  validateZod(uploadCategorySchema, 'body'),
  documentsController.uploadStudentDocument,
)
router.get(
  '/students/:studentId/documents',
  authorize('LECTURER', 'HEAD_LECTURER'),
  validateZod(studentDocParamsSchema, 'params'),
  documentsController.getStudentDocuments,
)

router.post(
  '/lecturers/:lecturerId/documents',
  authorize('LECTURER', 'HEAD_LECTURER'),
  validateZod(lecturerDocParamsSchema, 'params'),
  uploadDocument.single('file'),
  validateZod(uploadCategorySchema, 'body'),
  documentsController.uploadLecturerDocument,
)
router.get(
  '/lecturers/:lecturerId/documents',
  authorize('LECTURER', 'HEAD_LECTURER'),
  validateZod(lecturerDocParamsSchema, 'params'),
  documentsController.getLecturerDocuments,
)

router.post(
  '/head-lecturers/:headLecturerId/documents',
  authorize('HEAD_LECTURER'),
  validateZod(headLecturerDocParamsSchema, 'params'),
  uploadDocument.single('file'),
  validateZod(uploadCategorySchema, 'body'),
  documentsController.uploadHeadLecturerDocument,
)
router.get(
  '/head-lecturers/:headLecturerId/documents',
  authorize('HEAD_LECTURER'),
  validateZod(headLecturerDocParamsSchema, 'params'),
  documentsController.getHeadLecturerDocuments,
)

router.delete(
  '/documents/:documentId',
  authorize('HEAD_LECTURER'),
  validateZod(documentIdParamsSchema, 'params'),
  documentsController.deleteDocument,
)

export default router
```

### src/jobs/tokenCleanup.ts

```typescript
import cron from 'node-cron'
import prisma from '../config/db.js'
import logger from '../utils/logger.js'

export const startTokenCleanup = () => {
  cron.schedule('0 3 * * *', async () => {
    try {
      const result = await prisma.tokenBlacklist.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      })
      if (result.count > 0) {
        logger.info(`Token cleanup: removed ${result.count} expired blacklisted tokens`)
      }
    } catch (err) {
      logger.error({ message: 'Token cleanup failed', err })
    }
  })
  logger.info('Token cleanup cron job scheduled (daily at 03:00)')
}
```

### prisma/schema.prisma

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
}

// ==================== ENUMS ====================

enum UserType {
  STUDENT
  LECTURER
  HEAD_LECTURER
}

enum UserStatus {
  ACTIVE
  INACTIVE
  SUSPENDED
}

enum Gender {
  Male
  Female
}

enum Race {
  Malay
  Chinese
  Indian
  Others
}

enum State {
  Johor
  Kedah
  Kelantan
  Melaka
  NegeriSembilan
  Pahang
  Perak
  Perlis
  PulauPinang
  Sabah
  Sarawak
  Selangor
  Terengganu
  KualaLumpur
  Labuan
  Putrajaya
}

enum FileCategory {
  PROFILE_PICTURE
  IC
  TRANSCRIPT
  DOCUMENT
  OTHER
}

enum EntityType {
  STUDENT
  LECTURER
  HEAD_LECTURER
}

// ==================== MODELS ====================

model User {
  userId              String     @id @default(uuid()) @map("user_id")
  email               String     @unique @db.VarChar(255)
  passwordHash        String     @map("password_hash") @db.VarChar(255)
  name                String     @db.VarChar(100)
  type                UserType   @default(STUDENT)
  status              UserStatus @default(ACTIVE)

  isEmailVerified     Boolean    @default(false) @map("is_email_verified")
  emailVerifiedAt     DateTime?  @map("email_verified_at")
  emailVerifyToken    String?     @unique @map("email_verify_token") @db.VarChar(255)
  emailVerifyExpiry   DateTime?  @map("email_verify_expiry")

  passwordResetToken  String?    @unique @map("password_reset_token") @db.VarChar(255)
  passwordResetExpiry DateTime?  @map("password_reset_expiry")

  refreshToken        String?    @unique @map("refresh_token") @db.VarChar(500)
  refreshTokenExpiry  DateTime?  @map("refresh_token_expiry")

  failedLoginAttempts Int        @default(0) @map("failed_login_attempts")
  lockedUntil         DateTime?  @map("locked_until")
  lastLoginAt         DateTime?  @map("last_login_at")

  deletedAt           DateTime?  @map("deleted_at")

  createdAt           DateTime   @default(now()) @map("created_at")
  updatedAt           DateTime   @updatedAt @map("updated_at")

  profile             Profile?
  student             Student?
  lecturer            Lecturer?
  headLecturer        HeadLecturer?

  @@map("users")
}

model Profile {
  profileId   String    @id @default(uuid()) @map("profile_id")
  userId      String    @unique @map("user_id")
  phoneNumber String?   @map("phone_number") @db.VarChar(15)
  gender      Gender?
  race        Race?
  dateOfBirth DateTime? @map("date_of_birth")
  streetOne   String?   @map("street_one") @db.VarChar(255)
  streetTwo   String?   @map("street_two") @db.VarChar(255)
  postcode    String?   @db.VarChar(5)
  city        String?   @db.VarChar(100)
  state       State?
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  user        User      @relation(fields: [userId], references: [userId], onDelete: Cascade)

  @@map("profiles")
}

model Student {
  studentId     String     @id @default(uuid()) @map("student_id")
  studentNumber String     @unique @map("student_number") @db.VarChar(10)
  mykadNumber   String?    @unique @map("mykad_number") @db.VarChar(12)
  courseId       String     @map("course_id")
  userId        String     @unique @map("user_id")
  createdAt     DateTime   @default(now()) @map("created_at")
  updatedAt     DateTime   @updatedAt @map("updated_at")

  user          User       @relation(fields: [userId], references: [userId], onDelete: Cascade)
  course        Course     @relation(fields: [courseId], references: [courseId])
  documents     Document[]

  @@map("students")
}

model Lecturer {
  lecturerId  String     @id @default(uuid()) @map("lecturer_id")
  staffNumber String     @unique @map("staff_number") @db.VarChar(10)
  mykadNumber String?    @unique @map("mykad_number") @db.VarChar(12)
  courseId     String     @map("course_id")
  userId      String     @unique @map("user_id")
  createdAt   DateTime   @default(now()) @map("created_at")
  updatedAt   DateTime   @updatedAt @map("updated_at")

  user        User       @relation(fields: [userId], references: [userId], onDelete: Cascade)
  course      Course     @relation(fields: [courseId], references: [courseId])
  documents   Document[]

  @@map("lecturers")
}

model HeadLecturer {
  headLecturerId String     @id @default(uuid()) @map("head_lecturer_id")
  staffNumber    String     @unique @map("staff_number") @db.VarChar(10)
  mykadNumber    String?    @unique @map("mykad_number") @db.VarChar(12)
  userId         String     @unique @map("user_id")
  createdAt      DateTime   @default(now()) @map("created_at")
  updatedAt      DateTime   @updatedAt @map("updated_at")

  user           User       @relation(fields: [userId], references: [userId], onDelete: Cascade)
  documents      Document[]

  @@map("head_lecturers")
}

model Course {
  courseId     String     @id @default(uuid()) @map("course_id")
  courseCode   String     @unique @map("course_code") @db.VarChar(10)
  courseName   String     @map("course_name") @db.VarChar(100)
  description  String?    @db.Text
  isActive     Boolean    @default(true) @map("is_active")
  createdAt    DateTime   @default(now()) @map("created_at")
  updatedAt    DateTime   @updatedAt @map("updated_at")

  students     Student[]
  lecturers    Lecturer[]

  @@map("courses")
}

model Document {
  documentId     String        @id @default(uuid()) @map("document_id")
  entityId       String        @map("entity_id") @db.VarChar(191)
  entityType     EntityType    @map("entity_type")
  fileName       String        @map("file_name") @db.VarChar(255)
  originalName   String        @map("original_name") @db.VarChar(255)
  mimeType       String        @map("mime_type") @db.VarChar(100)
  fileSize       BigInt        @map("file_size")
  filePath       String        @map("file_path") @db.VarChar(500)
  fileUrl        String        @map("file_url") @db.VarChar(500)
  category       FileCategory
  studentId      String?       @map("student_id")
  lecturerId     String?       @map("lecturer_id")
  headLecturerId String?       @map("head_lecturer_id")
  createdAt      DateTime      @default(now()) @map("created_at")
  updatedAt      DateTime      @updatedAt @map("updated_at")
  deletedAt      DateTime?     @map("deleted_at")

  student        Student?      @relation(fields: [studentId], references: [studentId])
  lecturer       Lecturer?     @relation(fields: [lecturerId], references: [lecturerId])
  headLecturer   HeadLecturer? @relation(fields: [headLecturerId], references: [headLecturerId])

  @@index([entityId, entityType])
  @@map("documents")
}

model TokenBlacklist {
  id        String   @id @default(uuid())
  token     String   @unique @db.VarChar(500)
  expiresAt DateTime @map("expires_at")
  createdAt DateTime @default(now()) @map("created_at")

  @@map("token_blacklist")
}
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "sourceMap": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### package.json

```json
{
  "name": "api-monash",
  "version": "1.0.0",
  "description": "Monash College Management System - Backend API (TypeScript + Prisma 7)",
  "type": "module",
  "main": "dist/server.js",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio"
  },
  "dependencies": {
    "@prisma/adapter-mariadb": "^7.4.2",
    "@prisma/client": "^7.4.1",
    "bcrypt": "^6.0.0",
    "cookie-parser": "^1.4.7",
    "cors": "^2.8.6",
    "dotenv": "^17.3.1",
    "express": "^5.2.1",
    "express-rate-limit": "^8.3.0",
    "helmet": "^8.1.0",
    "jsonwebtoken": "^9.0.3",
    "mariadb": "^3.5.1",
    "morgan": "^1.10.1",
    "multer": "^2.1.1",
    "node-cron": "^4.2.1",
    "resend": "^6.9.3",
    "winston": "^3.19.0",
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "@types/bcrypt": "^6.0.0",
    "@types/cookie-parser": "^1.4.10",
    "@types/cors": "^2.8.19",
    "@types/express": "^5.0.6",
    "@types/jsonwebtoken": "^9.0.10",
    "@types/morgan": "^1.9.10",
    "@types/multer": "^2.1.0",
    "@types/node": "^25.3.1",
    "@types/node-cron": "^3.0.11",
    "prisma": "^7.4.1",
    "tsx": "^4.21.0",
    "typescript": "^5.9.3"
  }
}
```

### prisma.config.ts

```typescript
// This file was generated by Prisma, and assumes you have installed the following:
// npm install --save-dev prisma dotenv
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
```
