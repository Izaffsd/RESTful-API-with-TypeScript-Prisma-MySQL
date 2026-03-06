import type { Response } from 'express';
import type { ErrorDetail } from './AppError.js';

export const response = (
  res: Response,
  statusCode: number,
  message = '',
  data: unknown = null, // unknown allows null
  errorCode: string | null = null, // string alone doesn't allow null
  errors: ErrorDetail[] = [] ): Response => {

  const success = statusCode < 400;
  // Built-in type key(string) -> value(anything)
  const resBody: Record<string, unknown> = { statusCode, success, message };
  
  if (success && data !== null && data !== undefined) {
    resBody.data = data;
  }
  if (!success && errorCode) {
    resBody.errorCode = errorCode;
    resBody.timestamp = new Date().toISOString();
    resBody.errors = errors;
  }
  return res.status(statusCode).json(resBody);
};