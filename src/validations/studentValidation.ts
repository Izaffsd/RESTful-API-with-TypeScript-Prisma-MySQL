import { z } from 'zod';

export function extractStudentNumberPrefix(studentNumber: string): string | null {
  const match = studentNumber.match(/^([A-Z]{2,4})/);
  return match ? match[1] : null;
}

const idParam = z.coerce.number('ID must be a number').int().positive();

const studentNumber = z
  .string()
  .min(1, 'Student number is required')
  .transform((val) => val.toUpperCase().trim())
  .refine((val) => /^[A-Z]{2,4}[0-9]{4,5}$/.test(val), {
    message: 'Invalid student number format (e.g., LAW0504, SE03001)',
  });

const mykadNumber = z
  .string()
  .length(12, 'MyKad number must be exactly 12 digits')
  .regex(/^\d{12}$/, 'MyKad number must contain only digits')
  .refine((val) => {
    const mm = val.substring(2, 4);
    const dd = val.substring(4, 6);
    const month = parseInt(mm, 10);
    const day = parseInt(dd, 10);
    return month >= 1 && month <= 12 && day >= 1 && day <= 31;
  }, { message: 'Invalid MyKad number format (YYMMDDxxxxxx)' });

const email = z
  .string()
  .trim()
  .toLowerCase()
  .refine((val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), { message: 'Invalid email format' });

const studentName = z
  .string()
  .trim()
  .min(1, 'Student name is required')
  .max(100, 'Student name must not exceed 100 characters')
  .regex(
    /^[\p{L}]+(?:[ '-][\p{L}]+)*$/u,{
      message: "Only letters are allowed. You may use single spaces, apostrophes (') or hyphens (-) between words."
  });

export const getStudentByIdSchema = z.object({ studentId: idParam });

export const createStudentSchema = z.object({
  studentName,
  studentNumber,
  email,
  mykadNumber,
  address: z.string().max(255).trim().optional().nullable(),
  gender: z.enum(['Male', 'Female']).optional().nullable(),
});

export const updateStudentSchema = z.object({
  studentName,
  studentNumber,
  email,
  mykadNumber,
  address: z.string().max(255).trim().optional().nullable(),
  gender: z.enum(['Male', 'Female']).optional().nullable(),
});

export const deleteStudentSchema = z.object({ studentId: idParam });
