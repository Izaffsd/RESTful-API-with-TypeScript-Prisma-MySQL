import type { Request, Response } from 'express'
import type { ErrorDetail } from './AppError.js'
import logger from './logger.js'
import { requestLogFields } from './requestLogFields.js'

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

  if (data !== null && data !== undefined) {
    resBody.data = data
  }

  if (meta) resBody.meta = meta
  if (links) resBody.links = links

  if (!success && errorCode) {
    resBody.errorCode = errorCode
    resBody.timestamp = new Date().toISOString()
    resBody.errors = errors
  }

  // Structured line in error.log (warn file target): same shape as JSON body for 4xx client errors.
  // 5xx is logged in errorHandler with stack — skip here to avoid duplicate lines.
  if (!success && statusCode < 500) {
    const req = res.req as Request | undefined
    logger.warn({
      type: 'api_error_response',
      severity: 'warning' as const,
      message,
      success,
      errorCode: errorCode ?? undefined,
      statusCode,
      ...(errors.length > 0 ? { errors } : {}),
      ...requestLogFields(req),
    })
  }

  return res.status(statusCode).json(resBody)
}
