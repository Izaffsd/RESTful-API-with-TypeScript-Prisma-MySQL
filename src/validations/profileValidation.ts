import { z } from 'zod'
import { phoneOptionalNullableSchema } from './phoneValidation.js'

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
})
