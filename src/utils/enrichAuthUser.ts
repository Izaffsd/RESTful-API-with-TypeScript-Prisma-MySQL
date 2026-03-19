import prisma from '../config/db.js'
import { supabaseAdmin } from '../config/supabase.js'

// Fetch additional user info (name & email) from Supabase Auth and merge it into your existing data.

type ItemWithUser = { user: { userId: string; status: string }; [k: string]: unknown }

export async function enrichWithAuthUser<T extends ItemWithUser>(item: T): Promise<T & { user: T['user'] & { name: string | null; email: string } }> {
  const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(item.user.userId)
  const dbUser = await prisma.user.findUnique({
    where: { userId: item.user.userId },
    select: { name: true },
  })
  return {
    ...item,
    user: {
      ...item.user,
      name: dbUser?.name ?? null,
      email: authUser?.email ?? '',
    },
  }
}

export async function enrichWithAuthUsers<T extends ItemWithUser>(items: T[]): Promise<(T & { user: T['user'] & { name: string | null; email: string } })[]> {
  return Promise.all(items.map(enrichWithAuthUser))
}
