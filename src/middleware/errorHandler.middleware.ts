import type { Request, Response, NextFunction } from 'express'
import multer from 'multer'
import { AppError } from '../utils/AppError.js'
import { response } from '../utils/response.js'
import logger from '../utils/logger.js'
import { requestLogFields } from '../utils/requestLogFields.js'

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction): void => {
  void next
  if (err instanceof multer.MulterError) {
    const messages: Record<string, string> = {
      LIMIT_FILE_SIZE: 'File size exceeds the allowed limit',
      LIMIT_FILE_COUNT: 'Too many files uploaded',
      LIMIT_UNEXPECTED_FILE: 'Unexpected file field name',
    }
    const message = messages[err.code] ?? `Upload error: ${err.message}`
    response(res, 400, message, null, `UPLOAD_${err.code}_400`)
    return
  }

  const isAppError = err instanceof AppError
  const statusCode = isAppError ? err.statusCode : 500
  const errorCode = isAppError ? err.errorCode : 'INTERNAL_SERVER_ERROR_500'
  const message = isAppError ? err.message : 'Internal Server Error'
  const errors = isAppError && err.details ? err.details : []

  const logPayload = {
    type: 'api_error_response' as const,
    severity: 'error' as const,
    message,
    errorCode,
    statusCode,
    stack: err.stack,
    method: req.method,
    path: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    ...requestLogFields(req),
  }

  // 4xx: response() already logs message, success, errorCode, statusCode to error.log.
  if (statusCode >= 500) {
    logger.error(logPayload)
  }

  const errorPayload = isAppError && err.data !== undefined && err.data !== null ? err.data : null
  response(res, statusCode, message, errorPayload, errorCode, errors)
}
