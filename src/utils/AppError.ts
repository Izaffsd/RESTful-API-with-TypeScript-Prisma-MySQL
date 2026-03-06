export type ErrorDetail = { field: string };

export class AppError extends Error {
  statusCode: number;
  errorCode: string;
  details?: ErrorDetail[];

  constructor(
    message: string,
    statusCode = 500,
    errorCode = 'INTERNAL_SERVER_ERROR_500',
    details?: ErrorDetail[]
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
