import prisma from '../config/db.js'
import type { UserType } from '@prisma/client'

interface BootstrappedUser {
  type: UserType
  status: string
  deletedAt: Date | null
  name: string | null
}

/**
 * Ensures a Prisma `users` row exists for the given Supabase Auth user.
 * Called once per request during authentication. Keeps the middleware
 * free of direct Prisma calls per architectural rules.
 */
export async function ensureDbUser(
  userId: string,
  nameFromAuth: string | null,
): Promise<BootstrappedUser> {
  let dbUser = await prisma.user.findUnique({
    where: { userId },
    select: { type: true, status: true, deletedAt: true, name: true },
  })

  if (!dbUser) {
    dbUser = await prisma.user.upsert({
      where: { userId },
      create: { userId, type: 'STUDENT', status: 'ACTIVE', name: nameFromAuth },
      update: {},
      select: { type: true, status: true, deletedAt: true, name: true },
    })
  }

  if (!dbUser.name && nameFromAuth) {
    await prisma.user.update({
      where: { userId },
      data: { name: nameFromAuth },
    })
  }

  return dbUser
}
