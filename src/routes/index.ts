import { Router } from 'express'
import prisma from '../config/db.js';
import studentsRoutes from './students.routes.js'
import coursesRoutes from './courses.routes.js'
import { response } from '../utils/response.js'
import logger from '../utils/logger.js'

const router = Router()

router.get('/', (_req, res) => {
  res.status(200).json({
    message: 'SUCCESS - Welcome to the Monash API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  })
})

router.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return response(res, 200, 'Health check OK', {
      database: 'connected',
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    logger.error({ message: 'Health check failed', err });
    return response(res, 500, 'Health check failed', null, 'HEALTH_CHECK_FAILED_500')
  }
})

// // Only in development: trigger 500 to test error handler (passes to errorHandler middleware)
if (process.env.NODE_ENV === 'development') {
  router.get('/test-error', (_req, _res, next) => {
    next(new Error('Test internal server error'))
  })
}

router.use(studentsRoutes)
router.use(coursesRoutes)

export default router
