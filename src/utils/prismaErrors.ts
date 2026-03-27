import { Prisma } from '@prisma/client'
import { AppError } from './AppError.js'

export const handlePrismaError = (err: unknown, context: string): never => {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError)) throw err
  const prismaErr = err as InstanceType<typeof Prisma.PrismaClientKnownRequestError>

  switch (prismaErr.code) {
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