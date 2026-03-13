import { Router } from 'express'
import * as lecturersController from '../controllers/lecturers.controller.js'
import { validateZod } from '../middleware/validateZod.middleware.js'
import { authenticate, authorize, requireVerifiedEmail } from '../middleware/auth.middleware.js'
import { paginationSchema } from '../validations/shared/paginationSchema.js'
import { lecturerParamsSchema, createLecturerSchema, updateLecturerSchema } from '../validations/lecturerValidation.js'

const router = Router()

router.use(authenticate, requireVerifiedEmail)

router.get('/', authorize('HEAD_LECTURER'), validateZod(paginationSchema, 'query'), lecturersController.getAllLecturers)
router.get('/:lecturerId', authorize('HEAD_LECTURER'), validateZod(lecturerParamsSchema, 'params'), lecturersController.getLecturerById)
router.post('/', authorize('HEAD_LECTURER'), validateZod(createLecturerSchema, 'body'), lecturersController.createLecturer)
router.patch('/:lecturerId', authorize('HEAD_LECTURER'), validateZod(lecturerParamsSchema, 'params'), validateZod(updateLecturerSchema, 'body'), lecturersController.updateLecturer)
router.delete('/:lecturerId', authorize('HEAD_LECTURER'), validateZod(lecturerParamsSchema, 'params'), lecturersController.deleteLecturer)

export default router
