import { supabaseAdmin } from '../config/supabase.js'

type ItemWithUser = { user: { userId: string; status: string }; [k: string]: unknown }

export async function enrichWithAuthUser<T extends ItemWithUser>(item: T): Promise<T & { user: T['user'] & { name: string | null; email: string } }> {
  const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(item.user.userId)
  return {
    ...item,
    user: {
      ...item.user,
      name: (authUser?.user_metadata?.name as string) ?? null,
      email: authUser?.email ?? '',
    },
  }
}

export async function enrichWithAuthUsers<T extends ItemWithUser>(items: T[]): Promise<(T & { user: T['user'] & { name: string | null; email: string } })[]> {
  return Promise.all(items.map(enrichWithAuthUser))
}
