import { Router } from 'express'
import * as coursesController from '../controllers/courses.controller.js'
import { validateZod } from '../middleware/validateZod.middleware.js'
import { authenticate, authorize, requireVerifiedEmail } from '../middleware/auth.middleware.js'
import { paginationSchema } from '../validations/shared/paginationSchema.js'
import { courseParamsSchema, createCourseSchema, updateCourseSchema } from '../validations/courseValidation.js'

const router = Router()

router.use(authenticate, requireVerifiedEmail)

router.get('/list', coursesController.getCoursesForSelect)
router.get('/', authorize('LECTURER', 'HEAD_LECTURER'), validateZod(paginationSchema, 'query'), coursesController.getAllCourses)
router.get('/:courseId', authorize('LECTURER', 'HEAD_LECTURER'), validateZod(courseParamsSchema, 'params'), coursesController.getCourseById)
router.post('/', authorize('HEAD_LECTURER'), validateZod(createCourseSchema, 'body'), coursesController.createCourse)
router.patch('/:courseId', authorize('HEAD_LECTURER'), validateZod(courseParamsSchema, 'params'), validateZod(updateCourseSchema, 'body'), coursesController.updateCourse)
router.delete('/:courseId', authorize('HEAD_LECTURER'), validateZod(courseParamsSchema, 'params'), coursesController.deleteCourse)

export default router
