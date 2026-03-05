import { Router } from 'express'
import * as studentsController from '../controllers/students.controller.js'
import { validateZod } from '../middleware/validateZod.middleware.js'
import {
  getStudentByIdSchema,
  createStudentSchema,
  updateStudentSchema,
  deleteStudentSchema,
} from '../validations/studentValidation.js'

const router = Router()

// GET routes
router.get('/students', studentsController.getAllStudents)
router.get('/students/:studentId', validateZod(getStudentByIdSchema, 'params'), studentsController.getStudentById)

// POST routes
router.post('/students', validateZod(createStudentSchema, 'body'), studentsController.createStudent)

// PUT routes
router.put('/students/:studentId', validateZod(getStudentByIdSchema, 'params'),validateZod(updateStudentSchema, 'body'), studentsController.updateStudent)

// DELETE routes
router.delete('/students/:studentId', validateZod(deleteStudentSchema, 'params'), studentsController.deleteStudent)

export default router
