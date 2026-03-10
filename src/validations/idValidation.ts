import { z } from 'zod'

/**
 * Accepts standard UUIDs and UUIDs with optional single-letter prefix (e.g. l1111111-..., s1111111-...).
 * Matches: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx or [a-z]xxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 */
const entityIdRegex = /^([0-9a-f]{8}|[a-z][0-9a-f]{7})-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const entityIdSchema = (message: string) =>
  z.string().regex(entityIdRegex, message)
