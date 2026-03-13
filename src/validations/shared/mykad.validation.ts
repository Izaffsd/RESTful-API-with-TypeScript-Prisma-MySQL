import { z } from 'zod'

/**
 * Malaysian MyKad standard: 12 digits, first 6 = YYMMDD (birth date).
 * Validates month 01-12 and day 01-31.
 */
const mykadRefine = (val: string) => {
  const mm = val.substring(2, 4)
  const dd = val.substring(4, 6)
  const month = parseInt(mm, 10)
  const day = parseInt(dd, 10)
  return month >= 1 && month <= 12 && day >= 1 && day <= 31
}

const mykadBase = z
  .string()
  .length(12, 'MyKad must be 12 digits')
  .regex(/^\d{12}$/, 'MyKad number must contain only digits')
  .refine(mykadRefine, {
    message: 'Invalid MyKad number format (YYMMDDxxxxxx)',
  })

/** MyKad required (12 digits, valid YYMMDD). */
export const mykadSchema = mykadBase

/** MyKad optional (when provided, must be valid). */
export const mykadOptionalSchema = mykadBase.optional()

/** MyKad optional or null (for PATCH/update). */
export const mykadOptionalNullableSchema = mykadBase.optional().nullable()
