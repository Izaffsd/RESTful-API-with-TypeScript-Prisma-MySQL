import { z } from 'zod';

const idParam = z.coerce.number('ID must be a number').int().positive();

const courseCode = z
  .string()
  .min(1, 'Course code is required')
  .transform((code) => code.toUpperCase().trim())
  .refine((code) => /^[A-Z]{2,4}$/.test(code), {
    message: 'Invalid course code format (2-4 uppercase letters, e.g., SE, LAW)',
  });

const courseName = z
  .string()
  .min(1, 'Course name is required')
  .max(100, 'Course name must not exceed 100 characters')
  .trim();

export const getCourseByCodeSchema = z.object({ courseCode });

export const createCourseSchema = z.object({ courseCode, courseName });

export const updateCourseSchema = z.object({ courseCode, courseName });

export const deleteCourseSchema = z.object({ courseId: idParam });
