import { Router } from 'express'
import * as meController from '../controllers/me.controller.js'
import { validateZod } from '../middleware/validateZod.middleware.js'
import { authenticate, authorize, requireVerifiedEmail } from '../middleware/auth.middleware.js'
import { paginationSchema } from '../validations/shared/paginationSchema.js'
import { upload } from '../config/upload.js'
import { documentIdParamsSchema, uploadCategorySchema } from '../validations/documentValidation.js'
import { z } from 'zod'
import { mykadSchema } from '../validations/shared/mykad.validation.js'

const mykadUpdateSchema = z.object({
  mykadNumber: mykadSchema,
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
router.post(
  '/documents',
  upload.single('file'),
  validateZod(uploadCategorySchema, 'body'),
  meController.uploadMyDocument,
)
router.delete(
  '/documents/:documentId',
  validateZod(documentIdParamsSchema, 'params'),
  meController.deleteMyDocument,
)

export default router
