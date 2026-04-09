import { Router } from 'express'
import * as lecturersController from '../controllers/lecturers.controller.js'
import { validateZod } from '../middleware/validateZod.middleware.js'
import { authenticate, authorize, requireVerifiedEmail } from '../middleware/auth.middleware.js'
import { paginationSchema } from '../validations/shared/paginationSchema.js'
import { lecturerParamsSchema, createLecturerSchema, updateLecturerSchema } from '../validations/lecturerValidation.js'

const router: Router = Router()

router.use(authenticate, requireVerifiedEmail, authorize('HEAD_LECTURER'))

router.get('/', validateZod(paginationSchema, 'query'), lecturersController.getAllLecturers)
router.get('/:lecturerId', validateZod(lecturerParamsSchema, 'params'), lecturersController.getLecturerById)
router.post('/', validateZod(createLecturerSchema, 'body'), lecturersController.createLecturer)
router.patch('/:lecturerId', validateZod(lecturerParamsSchema, 'params'), validateZod(updateLecturerSchema, 'body'), lecturersController.updateLecturer)
router.delete('/:lecturerId', validateZod(lecturerParamsSchema, 'params'), lecturersController.deleteLecturer)

export default router
