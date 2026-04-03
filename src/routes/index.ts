import { Router } from 'express'
import swaggerUi from 'swagger-ui-express'
import prisma from '../config/db.js'
import { env } from '../config/env.js'
import logger from '../utils/logger.js'
import { authenticate, authorize, requireVerifiedEmail } from '../middleware/auth.middleware.js'
import { getEnums, getStats } from '../controllers/utility.controller.js'
import { openApiSpec } from '../docs/openapiSpec.js'

import authRoutes from './auth.routes.js'
import meRoutes from './me.routes.js'
import studentsRoutes from './students.routes.js'
import coursesRoutes from './courses.routes.js'
import lecturersRoutes from './lecturers.routes.js'
import headLecturersRoutes from './headLecturers.routes.js'
import documentsRoutes from './documents.routes.js'

const router: Router = Router()

if (env.API_DOCS_ENABLED) {
  router.use(
    '/docs',
    swaggerUi.serve,
    swaggerUi.setup(openApiSpec as unknown as Record<string, unknown>, { customSiteTitle: 'Monash API docs' }),
  )
}

router.get('/', (_req, res) => {
  res.status(200).json({
    message: 'SUCCESS - Welcome to Monash API',
    version: '1.0.1',
    apiVersion: 'v1',
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
