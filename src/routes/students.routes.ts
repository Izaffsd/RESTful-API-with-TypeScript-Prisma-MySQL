import { Router } from 'express'
import * as studentsController from '../controllers/students.controller.js'
import { validateZod } from '../middleware/validateZod.middleware.js'
import { authenticate, authorize, requireVerifiedEmail } from '../middleware/auth.middleware.js'
import { studentParamsSchema, studentQuerySchema, createStudentSchema, updateStudentSchema } from '../validations/studentValidation.js'

const router = Router()

router.use(authenticate, requireVerifiedEmail)

router.get('/', authorize('LECTURER', 'HEAD_LECTURER'), validateZod(studentQuerySchema, 'query'), studentsController.getAllStudents)
router.get('/:studentId', authorize('LECTURER', 'HEAD_LECTURER'), validateZod(studentParamsSchema, 'params'), studentsController.getStudentById)
router.post('/', authorize('HEAD_LECTURER'), validateZod(createStudentSchema, 'body'), studentsController.createStudent)
router.patch('/:studentId', authorize('HEAD_LECTURER'), validateZod(studentParamsSchema, 'params'), validateZod(updateStudentSchema, 'body'), studentsController.updateStudent)
router.delete('/:studentId', authorize('HEAD_LECTURER'), validateZod(studentParamsSchema, 'params'), studentsController.deleteStudent)

export default router
