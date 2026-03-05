import type { Response } from 'express';

export const response = (
  res: Response,
  statusCode: number,
  message = '',
  data: unknown = null,
  errorCode: string | null = null ): Response => {

  const success = statusCode < 400;
  const resBody: Record<string, unknown> = { statusCode, success, message };
  
  if (success && data !== null && data !== undefined) {
    resBody.data = data;
  }
  if (!success && errorCode) {
    resBody.errorCode = errorCode;
    resBody.timestamp = new Date().toISOString();
    resBody.errors = [];
  }
  return res.status(statusCode).json(resBody);
};