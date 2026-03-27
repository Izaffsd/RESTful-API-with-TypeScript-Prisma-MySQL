import type { UserType } from '@prisma/client'

export type TokenPayload = {
  userId: string
  email: string
  name: string | null
  type: UserType
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
  isEmailVerified: boolean
}

declare global {
  namespace Express {
    interface Request {
      /** Set by requestId.middleware; reused by pino-http for log correlation */
      id?: string
      user?: TokenPayload
    }
  }
}
