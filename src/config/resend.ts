import { Resend } from 'resend'
import { env } from './env.js'

const apiKey = env.RESEND_API_KEY?.trim()

/** Singleton Resend client; `null` when `RESEND_API_KEY` is unset. */
export const resend: Resend | null = apiKey ? new Resend(apiKey) : null
// avoid crash when no value or null
