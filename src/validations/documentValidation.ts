import { z } from 'zod'

export const documentIdParamsSchema = z.object({
  documentId: z.string().uuid('Invalid document ID format'),
})

export const studentDocParamsSchema = z.object({
  studentId: z.string().uuid('Invalid student ID format'),
})

export const lecturerDocParamsSchema = z.object({
  lecturerId: z.string().uuid('Invalid lecturer ID format'),
})

export const headLecturerDocParamsSchema = z.object({
  headLecturerId: z.string().uuid('Invalid head lecturer ID format'),
})

export const uploadCategorySchema = z.object({
  category: z.enum(['IC', 'TRANSCRIPT', 'DOCUMENT', 'OTHER', 'PROFILE_PICTURE'], {
    message: 'Category must be one of: PROFILE_PICTURE, IC, TRANSCRIPT, DOCUMENT, OTHER',
  }),
})
