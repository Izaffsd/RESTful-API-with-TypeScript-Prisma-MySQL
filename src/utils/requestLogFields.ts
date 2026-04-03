import type { Request } from 'express'

/**
 * Safe, grep-friendly context for logs (no tokens / full email in payload).
 * `userId` / `userType` exist only after `authenticate` has run.
 */
export function requestLogFields(req: Request | undefined): Record<string, string> {
  if (!req) return {}
  const o: Record<string, string> = {}
  if (req.id != null && req.id !== '') o.requestId = String(req.id)
  if (req.user) {
    o.userId = req.user.userId
    o.userType = req.user.type
  }
  return o
}
