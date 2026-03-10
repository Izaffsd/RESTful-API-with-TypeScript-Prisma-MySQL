import type { Response } from 'express'
import type { ErrorDetail } from './AppError.js'

type PaginationMeta = {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

type PaginationLinks = {
  self: string
  next: string | null
  prev: string | null
  first: string
  last: string
}

export const response = (
  res: Response,
  statusCode: number,
  message: string,
  data: unknown = null,
  errorCode: string | null = null,
  errors: ErrorDetail[] = [],
  meta?: PaginationMeta,
  links?: PaginationLinks,
): Response => {
  const success = statusCode < 400
  const resBody: Record<string, unknown> = { statusCode, success, message }

  if (success && data !== null && data !== undefined) {
    resBody.data = data
  }

  if (meta) resBody.meta = meta
  if (links) resBody.links = links

  if (!success && errorCode) {
    resBody.errorCode = errorCode
    resBody.timestamp = new Date().toISOString()
    resBody.errors = errors
  }

  return res.status(statusCode).json(resBody)
}
