import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError.js';
import { response } from '../utils/response.js';
import logger from '../utils/logger.js';

export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction): void => {
  const isAppError = err instanceof AppError;
  const statusCode = isAppError ? err.statusCode : 500;
  const errorCode = isAppError ? err.errorCode : 'INTERNAL_SERVER_ERROR_500';
  const message = isAppError ? err.message : 'Internal Server Error';

  logger.error({
    message,
    errorCode,
    statusCode,
    stack: err.stack,
    method: req.method,
    path: req.originalUrl,
    params: req.params,
    query: req.query,
    body: req.body,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    timestamp: new Date().toISOString(),
  });

  response(res, statusCode, message, null, errorCode);
};
