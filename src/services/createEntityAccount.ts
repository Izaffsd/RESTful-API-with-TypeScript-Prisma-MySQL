import prisma from '../config/db.js'
import { supabaseAdmin } from '../config/supabase.js'
import { AppError } from '../utils/AppError.js'
import logger from '../utils/logger.js'
import type { UserType } from '@prisma/client'

interface CreateAccountInput {
  email: string
  password: string
  name: string
  userType: UserType
}

interface CreateAccountResult {
  authUserId: string
}

/**
 * Shared helper: creates a Supabase Auth user and ensures the corresponding
 * Prisma `users` row exists. Used by students/lecturers/headLecturers services
 * to avoid repeating the same 30-line pattern.
 */
export async function createEntityAccount(input: CreateAccountInput): Promise<CreateAccountResult> {
  const label = input.userType.toLowerCase().replace(/_/g, ' ')

  const { data: authData, error } = await supabaseAdmin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { name: input.name },
  })

  if (error) {
    logger.error({ supabaseError: error.message, status: error.status }, `Supabase createUser failed for ${label}`)
    if (error.message?.toLowerCase().includes('already') || error.message?.toLowerCase().includes('registered')) {
      throw new AppError('Email already registered', 409, 'DUPLICATE_EMAIL_409')
    }
    throw new AppError(`Failed to create ${label} account`, 400, 'CREATE_FAILED_400')
  }

  if (!authData.user) {
    throw new AppError(`Failed to create ${label}`, 400, 'CREATE_FAILED_400')
  }

  await prisma.user.upsert({
    where: { userId: authData.user.id },
    create: { userId: authData.user.id, type: input.userType, status: 'ACTIVE', name: input.name },
    update: { type: input.userType, name: input.name },
  })

  return { authUserId: authData.user.id }
}
