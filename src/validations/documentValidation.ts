import { z } from 'zod'
import { entityIdSchema } from './idValidation.js'

export const documentIdParamsSchema = z.object({
  documentId: entityIdSchema('Invalid document ID format'),
})

export const studentDocParamsSchema = z.object({
  studentId: entityIdSchema('Invalid student ID format'),
})

export const lecturerDocParamsSchema = z.object({
  lecturerId: entityIdSchema('Invalid lecturer ID format'),
})

export const headLecturerDocParamsSchema = z.object({
  headLecturerId: entityIdSchema('Invalid head lecturer ID format'),
})

export const uploadCategorySchema = z.object({
  category: z.enum(['IC', 'TRANSCRIPT', 'DOCUMENT', 'OTHER', 'PROFILE_PICTURE'], {
    message: 'Category must be one of: PROFILE_PICTURE, IC, TRANSCRIPT, DOCUMENT, OTHER',
  }),
})
