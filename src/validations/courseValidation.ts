import { z } from 'zod'
import { entityIdSchema } from './shared/id.validation.js'

export const courseParamsSchema = z.object({
  courseId: entityIdSchema('Invalid course ID format'),
})

export const createCourseSchema = z.object({
  courseCode: z.string().trim().toUpperCase().min(1, 'Course code is required').max(10),
  courseName: z.string().trim().min(1, 'Course name is required').max(100),
  description: z.string().trim().optional().nullable(),
})

export const updateCourseSchema = z.object({
  courseCode: z.string().trim().toUpperCase().max(10).optional(),
  courseName: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().optional().nullable(),
  isActive: z.boolean().optional(),
})
