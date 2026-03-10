import { z } from 'zod'

/**
 * Malaysian phone: single consistent format +60XXXXXXXXX (E.164-style)
 * for display, SMS, and searching. Accepts input with spaces/dashes, 0 or +60 prefix.
 */
function digitsOnly(val: string): string {
  return val.replace(/\D/g, '')
}

function getNationalDigits(digits: string): string | null {
  if (digits.startsWith('60')) {
    const nsn = digits.slice(2)
    return nsn.length >= 9 && nsn.length <= 10 ? nsn : null
  }
  if (digits.startsWith('0')) return digits.slice(1)
  return digits
}

function isValidMalaysianNsm(nsn: string): boolean {
  if (nsn.length < 9 || nsn.length > 10) return false
  // Mobile: 1X + 7 or 8 digits (01X-XXXXXXX without leading 0)
  if (nsn.startsWith('1')) return nsn.length === 9 || nsn.length === 10
  // Landline: 3-9 (03-09) or 82-89 (East Malaysia)
  if (nsn[0] === '2' || nsn[0] === '3' || nsn[0] === '4' || nsn[0] === '5' || nsn[0] === '6' || nsn[0] === '7' || nsn[0] === '9') return nsn.length === 9 || nsn.length === 10
  if (nsn.startsWith('82') || nsn.startsWith('83') || nsn.startsWith('84') || nsn.startsWith('85') || nsn.startsWith('86') || nsn.startsWith('87') || nsn.startsWith('88') || nsn.startsWith('89')) return nsn.length === 9
  return false
}

/** Normalize to +60XXXXXXXXX (9–10 digits after +60). Returns null if empty or invalid. */
export function normalizeToE164(value: string | undefined | null): string | null {
  if (value === undefined || value === null) return null
  const trimmed = value.trim()
  if (trimmed === '') return null
  const digits = digitsOnly(trimmed)
  if (digits.length < 9) return null
  const nsn = getNationalDigits(digits)
  if (!nsn || !isValidMalaysianNsm(nsn)) return null
  return '+60' + nsn
}

const E164_MAX_LEN = 14 // +60 + 10 digits

const phoneRefine = (val: string | undefined | null) => {
  if (val === undefined || val === null) return true
  const trimmed = val.trim()
  if (trimmed === '') return true
  return normalizeToE164(trimmed) !== null
}

const phoneMessage = 'Invalid Malaysian phone (e.g. 018-9192276 or +60 18 919 2276)'

/** Optional; when provided, validates and transforms to +60XXXXXXXXX for storage. */
export const phoneOptionalNullableSchema = z
  .string()
  .max(E164_MAX_LEN, 'Phone number too long')
  .optional()
  .nullable()
  .refine((val) => phoneRefine(val), { message: phoneMessage })
  .transform((val) => (val == null || val.trim() === '' ? null : normalizeToE164(val)))

/** Required; validates and transforms to +60XXXXXXXXX. */
export const phoneSchema = z
  .string()
  .min(1, 'Phone number is required')
  .max(E164_MAX_LEN, 'Phone number too long')
  .refine((val) => val.trim() !== '' && normalizeToE164(val.trim()) !== null, { message: phoneMessage })
  .transform((val) => normalizeToE164(val.trim())!)