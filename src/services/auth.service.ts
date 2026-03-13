import prisma from '../config/db.js'
import { supabase, supabaseAdmin } from '../config/supabase.js'
import { AppError } from '../utils/AppError.js'
import { env } from '../config/env.js'
import logger from '../utils/logger.js'
import type { UserType, Gender, Race, State } from '@prisma/client'
import { mykadSchema } from '../validations/shared/mykad.validation.js'

const userInclude = {
  profile: true,
  student: { include: { course: true } },
  lecturer: { include: { course: true } },
  headLecturer: true,
} as const

export type AuthUser = {
  userId: string
  email: string
  name: string | null
  type: UserType
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
  isEmailVerified: boolean
  emailVerifiedAt: Date | null
  lastLoginAt: Date | null
  createdAt: Date
  updatedAt: Date
  profile: unknown
  student: unknown
  lecturer: unknown
  headLecturer: unknown
}

function formatUserResponse(user: AuthUser) {
  const profile = user.profile as Record<string, unknown> | null
  let formattedProfile = null
  if (profile) {
    formattedProfile = {
      profileId: profile.profileId,
      phoneNumber: profile.phoneNumber,
      gender: profile.gender,
      race: profile.race,
      dateOfBirth: profile.dateOfBirth,
      state: profile.state,
      address: {
        streetOne: profile.streetOne,
        streetTwo: profile.streetTwo,
        postcode: profile.postcode,
        city: profile.city,
        state: profile.state,
      },
    }
  }
  return {
    userId: user.userId,
    email: user.email,
    name: user.name,
    type: user.type,
    status: user.status,
    isEmailVerified: user.isEmailVerified,
    emailVerifiedAt: user.emailVerifiedAt,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    profile: formattedProfile,
    student: user.student ?? null,
    lecturer: user.lecturer ?? null,
    headLecturer: user.headLecturer ?? null,
  }
}

export const register = async (data: {
  name: string
  email: string
  password: string
  studentNumber?: string
}) => {
  if (data.studentNumber) {
    const existingStudent = await prisma.student.findUnique({
      where: { studentNumber: data.studentNumber },
    })
    if (existingStudent) {
      throw new AppError('Student number already registered', 409, 'DUPLICATE_STUDENT_NUMBER_409')
    }
  }

  const { data: authData, error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: { data: { name: data.name } },
  })

  if (error) {
    logger.error({ supabaseError: error.message, code: error.status }, 'Supabase signUp failed')
    if (error.message?.toLowerCase().includes('already registered')) {
      throw new AppError('Email already registered', 409, 'DUPLICATE_EMAIL_409')
    }
    throw new AppError(error.message ?? 'Registration failed', 400, 'REGISTRATION_FAILED_400')
  }

  if (!authData.user) {
    throw new AppError('Registration failed', 400, 'REGISTRATION_FAILED_400')
  }

  if (data.studentNumber) {
    const prefix = data.studentNumber.match(/^([A-Z]{2,4})/)?.[1]
    if (!prefix) {
      throw new AppError('Invalid student number format', 400, 'INVALID_STUDENT_NUMBER_400')
    }
    const course = await prisma.course.findUnique({ where: { courseCode: prefix } })
    if (!course) {
      throw new AppError('Course not found for student number prefix', 404, 'COURSE_NOT_FOUND_404')
    }
    await prisma.student.create({
      data: {
        studentNumber: data.studentNumber,
        courseId: course.courseId,
        userId: authData.user.id,
      },
    })
  }

  return { email: data.email, name: data.name }
}

export const login = async (data: { email: string; password: string }) => {
  const { data: sessionData, error } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  })

  if (error) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS_401')
  }

  if (!sessionData.session || !sessionData.user) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS_401')
  }

  const dbUser = await prisma.user.findUnique({
    where: { userId: sessionData.user.id },
    include: userInclude,
  })

  if (!dbUser || dbUser.deletedAt) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS_401')
  }

  if (dbUser.status !== 'ACTIVE') {
    throw new AppError('Account is not active', 403, 'ACCOUNT_INACTIVE_403')
  }

  if (!sessionData.user.email_confirmed_at) {
    throw new AppError('Please verify your email first', 403, 'EMAIL_NOT_VERIFIED_403')
  }

  const authUser: AuthUser = {
    userId: dbUser.userId,
    email: sessionData.user.email ?? '',
    name: (sessionData.user.user_metadata?.name as string) ?? null,
    type: dbUser.type,
    status: dbUser.status,
    isEmailVerified: !!sessionData.user.email_confirmed_at,
    emailVerifiedAt: null,
    lastLoginAt: null,
    createdAt: dbUser.createdAt,
    updatedAt: dbUser.updatedAt,
    profile: dbUser.profile,
    student: dbUser.student,
    lecturer: dbUser.lecturer,
    headLecturer: dbUser.headLecturer,
  }

  return {
    accessToken: sessionData.session.access_token,
    refreshToken: sessionData.session.refresh_token ?? '',
    user: formatUserResponse(authUser),
  }
}

export const refreshTokens = async (oldRefreshToken: string) => {
  const { data, error } = await supabase.auth.refreshSession({ refresh_token: oldRefreshToken })

  if (error || !data.session) {
    throw new AppError('Invalid refresh token', 401, 'UNAUTHORIZED_401')
  }

  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token ?? oldRefreshToken,
  }
}

export const logout = async (_userId: string, accessToken: string) => {
  try {
    await supabaseAdmin.auth.admin.signOut(accessToken)
  } catch {
    // Token may already be invalid
  }
}

export const resendVerification = async (email: string) => {
  const { error } = await supabase.auth.resend({ type: 'signup', email })
  if (error) {
    // Don't reveal if email exists; Supabase may not have this user
    return
  }
}

export const forgotPassword = async (email: string) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${env.FRONTEND_URL}/reset-password`,
  })
  if (error) {
    return
  }
}

export const getMe = async (userId: string) => {
  const dbUser = await prisma.user.findUnique({
    where: { userId },
    include: userInclude,
  })
  if (!dbUser) throw new AppError('User not found', 404, 'USER_NOT_FOUND_404')

  const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(userId)
  const email = authUser?.email ?? ''
  const name = (authUser?.user_metadata?.name as string) ?? null
  const isEmailVerified = !!authUser?.email_confirmed_at

  const authUserFormatted: AuthUser = {
    userId: dbUser.userId,
    email,
    name,
    type: dbUser.type,
    status: dbUser.status,
    isEmailVerified,
    emailVerifiedAt: null,
    lastLoginAt: null,
    createdAt: dbUser.createdAt,
    updatedAt: dbUser.updatedAt,
    profile: dbUser.profile,
    student: dbUser.student,
    lecturer: dbUser.lecturer,
    headLecturer: dbUser.headLecturer,
  }
  return formatUserResponse(authUserFormatted)
}

export const updateMe = async (userId: string, data: { name: string }) => {
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    user_metadata: { name: data.name },
  })
  if (error) {
    throw new AppError(error.message ?? 'Update failed', 400, 'UPDATE_FAILED_400')
  }
  return getMe(userId)
}

export const updateProfile = async (userId: string, userType: UserType, data: {
  phoneNumber?: string | null
  gender?: Gender | null
  race?: Race | null
  dateOfBirth?: string | null
  streetOne?: string | null
  streetTwo?: string | null
  postcode?: string | null
  city?: string | null
  state?: State | null
  studentNumber?: string
  mykadNumber?: string | null
}) => {
  const { studentNumber, mykadNumber, ...profileFields } = data

  // MyKad is required for students with a student record (data persists in DB, not browser memory)
  if (userType === 'STUDENT') {
    const student = await prisma.student.findUnique({ where: { userId } })
    if (student) {
      const digits = (mykadNumber ?? '').toString().trim().replace(/\D/g, '')
      if (!digits || digits.length === 0) {
        throw new AppError('MyKad number is required', 400, 'MYKAD_REQUIRED_400', [
          { field: 'mykadNumber', message: 'MyKad number is required (12 digits, format: YYMMDDxxxxxx)' },
        ])
      }
      const parsed = mykadSchema.safeParse(digits)
      if (!parsed.success) {
        const msg = parsed.error.errors[0]?.message ?? 'Invalid MyKad number format (YYMMDDxxxxxx)'
        throw new AppError(msg, 400, 'INVALID_MYKAD_400', [{ field: 'mykadNumber', message: msg }])
      }
    }
  }
  const profileData = {
    ...profileFields,
    dateOfBirth: profileFields.dateOfBirth ? new Date(profileFields.dateOfBirth) : profileFields.dateOfBirth,
  }

  await prisma.profile.upsert({
    where: { userId },
    create: { userId, ...profileData },
    update: profileData,
  })

  if (userType === 'STUDENT' && studentNumber) {
    if (!/^[A-Z]{2,4}[0-9]{4,5}$/.test(studentNumber)) {
      throw new AppError('Invalid student number format (e.g., LAW0504, SE03001)', 400, 'INVALID_STUDENT_NUMBER_400')
    }
    const prefix = studentNumber.match(/^([A-Z]{2,4})/)?.[1]
    if (!prefix) {
      throw new AppError('Invalid student number format (e.g. MC12345)', 400, 'INVALID_STUDENT_NUMBER_400')
    }
    const course = await prisma.course.findUnique({ where: { courseCode: prefix } })
    if (!course) {
      throw new AppError('Course not found for student number prefix', 404, 'COURSE_NOT_FOUND_404')
    }

    let student = await prisma.student.findUnique({ where: { userId } })
    if (!student) {
      const existing = await prisma.student.findUnique({ where: { studentNumber } })
      if (existing) {
        throw new AppError('Student number already registered', 409, 'DUPLICATE_STUDENT_NUMBER_409')
      }
      await prisma.student.create({
        data: { studentNumber, courseId: course.courseId, userId, mykadNumber: mykadNumber ?? null },
      })
    } else {
      const existing = await prisma.student.findUnique({ where: { studentNumber } })
      if (existing && existing.studentId !== student.studentId) {
        throw new AppError('Student number already registered', 409, 'DUPLICATE_STUDENT_NUMBER_409')
      }
      await prisma.student.update({
        where: { studentId: student.studentId },
        data: {
          studentNumber,
          courseId: course.courseId,
          ...(mykadNumber !== undefined && { mykadNumber: mykadNumber ?? null }),
        },
      })
    }
  }

  if (userType === 'STUDENT') {
    const student = await prisma.student.findUnique({ where: { userId } })
    if (student && mykadNumber !== undefined) {
      if (mykadNumber) {
        const existing = await prisma.student.findFirst({
          where: { mykadNumber, studentId: { not: student.studentId } },
        })
        if (existing) {
          throw new AppError('MyKad number already registered to another student', 409, 'DUPLICATE_MYKAD_409')
        }
      }
      await prisma.student.update({
        where: { studentId: student.studentId },
        data: { mykadNumber: mykadNumber || null },
      })
    }
  }

  return getMe(userId)
}

export const changePassword = async (userId: string, currentPassword: string, newPassword: string) => {
  const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(userId)
  if (!authUser?.email) throw new AppError('User not found', 404, 'USER_NOT_FOUND_404')

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: authUser.email,
    password: currentPassword,
  })
  if (signInError) {
    throw new AppError('Current password is incorrect', 401, 'INVALID_CREDENTIALS_401')
  }

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    password: newPassword,
  })
  if (updateError) {
    throw new AppError(updateError.message ?? 'Password update failed', 400, 'UPDATE_FAILED_400')
  }
}
