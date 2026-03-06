import { Router } from 'express'
import * as coursesController from '../controllers/courses.controller.js'
import { validateZod } from '../middleware/validateZod.middleware.js'
import { paginationSchema } from '../validations/paginationSchema.js'
import {
  getCourseByCodeSchema,
  createCourseSchema,
  updateCourseSchema,
  deleteCourseSchema,
} from '../validations/courseValidation.js'

const router = Router()

router.get('/courses', validateZod(paginationSchema, 'query'), coursesController.getAllCourses)
router.get('/courses/:courseCode', validateZod(getCourseByCodeSchema, 'params'), coursesController.getCourseByCode)

router.post('/courses', validateZod(createCourseSchema, 'body'), coursesController.createCourse)

router.put('/courses/:courseCode', validateZod(getCourseByCodeSchema, 'params'), validateZod(updateCourseSchema, 'body'), coursesController.updateCourse)

router.delete('/courses/:courseId', validateZod(deleteCourseSchema, 'params'), coursesController.deleteCourse)

export default router
