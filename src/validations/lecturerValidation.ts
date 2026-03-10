import { z } from 'zod'
import { entityIdSchema } from './idValidation.js'
import { mykadOptionalSchema, mykadOptionalNullableSchema } from './mykadValidation.js'

export const lecturerParamsSchema = z.object({
  lecturerId: entityIdSchema('Invalid lecturer ID format'),
})

export const createLecturerSchema = z.object({
  staffNumber: z.string().trim().toUpperCase().min(1, 'Staff number is required'),
  name: z.string().trim().min(1, 'Full name is required').max(100),
  email: z.string().trim().toLowerCase().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  mykadNumber: mykadOptionalSchema,
  courseCode: z.string().trim().toUpperCase().min(1, 'Course code is required'),
})

export const updateLecturerSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  courseCode: z.string().trim().toUpperCase().optional(),
  mykadNumber: mykadOptionalNullableSchema,
})
