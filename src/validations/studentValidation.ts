import { z } from 'zod'
import { entityIdSchema } from './shared/id.validation.js'
import { mykadOptionalSchema, mykadOptionalNullableSchema } from './shared/mykad.validation.js'

export const studentParamsSchema = z.object({
  studentId: entityIdSchema('Invalid student ID format'),
})

export const studentQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
  gender: z.enum(['Male', 'Female']).optional(),
  courseCode: z.string().trim().toUpperCase().optional(),
  sortBy: z.enum(['createdAt', 'studentNumber', 'name']).optional().default('createdAt'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
})

export const createStudentSchema = z.object({
  studentNumber: z.string().trim().toUpperCase().min(1, 'Student number is required'),
  name: z.string().trim().min(1, 'Full name is required').max(100),
  email: z.string().trim().toLowerCase().email('Invalid email format'),
  mykadNumber: mykadOptionalSchema,
  courseCode: z.string().trim().toUpperCase().min(1, 'Course code is required'),
})

export const updateStudentSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  courseCode: z.string().trim().toUpperCase().optional(),
  mykadNumber: mykadOptionalNullableSchema,
})
