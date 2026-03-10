import { Router } from 'express'
import * as documentsController from '../controllers/documents.controller.js'
import { validateZod } from '../middleware/validateZod.middleware.js'
import { authenticate, authorize, requireVerifiedEmail } from '../middleware/auth.middleware.js'
import { uploadDocument } from '../config/multer.js'
import {
  documentIdParamsSchema, studentDocParamsSchema,
  lecturerDocParamsSchema, headLecturerDocParamsSchema, uploadCategorySchema,
} from '../validations/documentValidation.js'

const router = Router()

router.use(authenticate, requireVerifiedEmail)

router.post(
  '/students/:studentId/documents',
  authorize('HEAD_LECTURER'),
  validateZod(studentDocParamsSchema, 'params'),
  uploadDocument.single('file'),
  validateZod(uploadCategorySchema, 'body'),
  documentsController.uploadStudentDocument,
)
router.get(
  '/students/:studentId/documents',
  authorize('LECTURER', 'HEAD_LECTURER'),
  validateZod(studentDocParamsSchema, 'params'),
  documentsController.getStudentDocuments,
)

router.post(
  '/lecturers/:lecturerId/documents',
  authorize('LECTURER', 'HEAD_LECTURER'),
  validateZod(lecturerDocParamsSchema, 'params'),
  uploadDocument.single('file'),
  validateZod(uploadCategorySchema, 'body'),
  documentsController.uploadLecturerDocument,
)
router.get(
  '/lecturers/:lecturerId/documents',
  authorize('LECTURER', 'HEAD_LECTURER'),
  validateZod(lecturerDocParamsSchema, 'params'),
  documentsController.getLecturerDocuments,
)

router.post(
  '/head-lecturers/:headLecturerId/documents',
  authorize('HEAD_LECTURER'),
  validateZod(headLecturerDocParamsSchema, 'params'),
  uploadDocument.single('file'),
  validateZod(uploadCategorySchema, 'body'),
  documentsController.uploadHeadLecturerDocument,
)
router.get(
  '/head-lecturers/:headLecturerId/documents',
  authorize('HEAD_LECTURER'),
  validateZod(headLecturerDocParamsSchema, 'params'),
  documentsController.getHeadLecturerDocuments,
)

router.delete(
  '/documents/:documentId',
  authorize('HEAD_LECTURER'),
  validateZod(documentIdParamsSchema, 'params'),
  documentsController.deleteDocument,
)

export default router
