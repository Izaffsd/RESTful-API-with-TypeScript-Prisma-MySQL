export type ErrorDetail = { field: string; message: string }

export class AppError extends Error {
  statusCode: number
  errorCode: string
  details?: ErrorDetail[]
  /** Optional JSON payload for clients (e.g. consent dialogs). */
  data?: unknown

  constructor(
    message: string,
    statusCode = 500,
    errorCode = 'INTERNAL_SERVER_ERROR_500',
    details?: ErrorDetail[],
    data?: unknown,
  ) {
    super(message)
    this.statusCode = statusCode
    this.errorCode = errorCode
    this.details = details
    this.data = data
    Object.setPrototypeOf(this, AppError.prototype)
  }
}
