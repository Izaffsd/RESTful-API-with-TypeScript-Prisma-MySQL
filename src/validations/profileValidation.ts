import { z } from 'zod'
import { phoneOptionalNullableSchema } from './shared/phone.validation.js'
import { mykadOptionalNullableSchema } from './shared/mykad.validation.js'

export const updateProfileSchema = z.object({
  phoneNumber: phoneOptionalNullableSchema,
  gender: z.enum(['Male', 'Female']).optional().nullable(),
  race: z.enum(['Malay', 'Chinese', 'Indian', 'Others']).optional().nullable(),
  dateOfBirth: z.string().date('Invalid date format (YYYY-MM-DD)').optional().nullable(),
  streetOne: z.string().max(255).optional().nullable(),
  streetTwo: z.string().max(255).optional().nullable(),
  postcode: z.string().max(5).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.enum([
    'Johor', 'Kedah', 'Kelantan', 'Melaka', 'NegeriSembilan', 'Pahang',
    'Perak', 'Perlis', 'PulauPinang', 'Sabah', 'Sarawak', 'Selangor',
    'Terengganu', 'KualaLumpur', 'Labuan', 'Putrajaya',
  ]).optional().nullable(),
  // Student-only: create/update student record (format: prefix + 4-5 digits, e.g. LAW0504, SE03001; course auto-detected from prefix)
  studentNumber: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() ? v : undefined),
    z.string()
      .min(1, 'Student number is required')
      .transform((val) => val.toUpperCase().trim())
      .refine((val) => /^[A-Z]{2,4}[0-9]{4,5}$/.test(val), {
        message: 'Invalid student number format (e.g., LAW0504, SE03001)',
      })
      .optional(),
  ),
  mykadNumber: z.preprocess(
    (v) => (v === '' || v === undefined ? undefined : v),
    mykadOptionalNullableSchema
  ),
})
