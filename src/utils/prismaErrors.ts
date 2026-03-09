import { Prisma } from '@prisma/client'
import { AppError } from './AppError.js'

export const handlePrismaError = (err: unknown, context: string): never => {
  // handlePrismaError(err, 'Student')  - always throws, never reaches end of function
  if (!(err instanceof Prisma.PrismaClientKnownRequestError)) throw err
// NOT a Prisma error, throw it back up and let something else deal with it

  switch (err.code) {
    case 'P2002':
      throw new AppError(`${context} already exists`, 409, `DUPLICATE_${context.toUpperCase()}_409`)
    case 'P2003':
      throw new AppError(`${context} is referenced by other records`, 409, `${context.toUpperCase()}_REFERENCED_409`)
    case 'P2025':
      throw new AppError(`${context} does not exist`, 404, `${context.toUpperCase()}_NOT_FOUND_404`)
    default:
      throw err
  }
}