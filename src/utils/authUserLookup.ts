import type { User } from '@supabase/supabase-js'
import { supabaseAdmin } from '../config/supabase.js'
import logger from './logger.js'

const PER_PAGE = 500
const MAX_PAGES = 40

/**
 * Find an auth user by email (case-insensitive). Paginates admin listUsers — fine for small/medium projects.
 */
export async function findAuthUserByEmail(email: string): Promise<User | null> {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return null

  let page = 1
  try {
    while (page <= MAX_PAGES) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: PER_PAGE })
      if (error) {
        logger.warn({ message: error.message, page }, 'findAuthUserByEmail listUsers failed')
        return null
      }
      const users = data?.users ?? []
      const hit = users.find((u) => (u.email ?? '').toLowerCase() === normalized)
      if (hit) return hit
      if (users.length < PER_PAGE) return null
      const next = data?.nextPage
      page = typeof next === 'number' && next > page ? next : page + 1
    }
  } catch (e) {
    logger.warn({ err: e }, 'findAuthUserByEmail threw')
  }
  return null
}
