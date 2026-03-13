import { Router } from 'express'
import * as headLecturersController from '../controllers/headLecturers.controller.js'
import { validateZod } from '../middleware/validateZod.middleware.js'
import { authenticate, authorize, requireVerifiedEmail } from '../middleware/auth.middleware.js'
import { paginationSchema } from '../validations/shared/paginationSchema.js'
import { headLecturerParamsSchema, createHeadLecturerSchema, updateHeadLecturerSchema } from '../validations/headLecturerValidation.js'

const router = Router()

router.use(authenticate, requireVerifiedEmail, authorize('HEAD_LECTURER'))

router.get('/', validateZod(paginationSchema, 'query'), headLecturersController.getAllHeadLecturers)
router.get('/:headLecturerId', validateZod(headLecturerParamsSchema, 'params'), headLecturersController.getHeadLecturerById)
router.post('/', validateZod(createHeadLecturerSchema, 'body'), headLecturersController.createHeadLecturer)
router.patch('/:headLecturerId', validateZod(headLecturerParamsSchema, 'params'), validateZod(updateHeadLecturerSchema, 'body'), headLecturersController.updateHeadLecturer)
router.delete('/:headLecturerId', validateZod(headLecturerParamsSchema, 'params'), headLecturersController.deleteHeadLecturer)

export default router
