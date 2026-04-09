import prisma from '../config/db.js'
import { supabaseAdmin } from '../config/supabase.js'

type ItemWithUser = { user: { userId: string; status: string }; [k: string]: unknown }
type Enriched<T extends ItemWithUser> = T & { user: T['user'] & { name: string | null; email: string } }

export async function enrichWithAuthUser<T extends ItemWithUser>(item: T): Promise<Enriched<T>> {
  const [authResult, dbUser] = await Promise.all([
    supabaseAdmin.auth.admin.getUserById(item.user.userId),
    prisma.user.findUnique({ where: { userId: item.user.userId }, select: { name: true } }),
  ])
  return {
    ...item,
    user: {
      ...item.user,
      name: dbUser?.name ?? null,
      email: authResult.data?.user?.email ?? '',
    },
  }
}

export async function enrichWithAuthUsers<T extends ItemWithUser>(items: T[]): Promise<Enriched<T>[]> {
  if (items.length === 0) return []

  const userIds = items.map((i) => i.user.userId)

  const [dbUsers, authUsers] = await Promise.all([
    prisma.user.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, name: true },
    }),
    Promise.all(
      userIds.map((id) => supabaseAdmin.auth.admin.getUserById(id).then((r) => ({ userId: id, email: r.data?.user?.email ?? '' }))),
    ),
  ])

  const nameMap = new Map(dbUsers.map((u) => [u.userId, u.name]))
  const emailMap = new Map(authUsers.map((u) => [u.userId, u.email]))

  return items.map((item) => ({
    ...item,
    user: {
      ...item.user,
      name: nameMap.get(item.user.userId) ?? null,
      email: emailMap.get(item.user.userId) ?? '',
    },
  }))
}
