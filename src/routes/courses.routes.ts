import { Router } from 'express'
import * as coursesController from '../controllers/courses.controller.js'
import { validateZod } from '../middleware/validateZod.middleware.js'
import {
  getCourseByCodeSchema,
  createCourseSchema,
  updateCourseSchema,
  deleteCourseSchema,
} from '../validations/courseValidation.js'

const router = Router()

// GET routes
router.get('/courses', coursesController.getAllCourses)
router.get('/courses/:courseCode', validateZod(getCourseByCodeSchema, 'params'), coursesController.getCourseByCode)

// POST routes
router.post('/courses', validateZod(createCourseSchema, 'body'), coursesController.createCourse)

// PUT routes
router.put('/courses/:courseCode', validateZod(getCourseByCodeSchema, 'params'),validateZod(updateCourseSchema, 'body'), coursesController.updateCourse)

// DELETE routes
router.delete('/courses/:courseId', validateZod(deleteCourseSchema, 'params'), coursesController.deleteCourse)

export default router
