import prisma from '../config/db.js'
import { supabaseAdmin } from '../config/supabase.js'
import { AppError } from '../utils/AppError.js'
import { handlePrismaError } from '../utils/prismaErrors.js'

const studentInclude = {
  user: { include: { profile: true } },
  course: { select: { courseId: true, courseCode: true, courseName: true } },
} as const

export const getAll = async (page: number, limit: number, filters: {
  search?: string
  gender?: string
  courseCode?: string
  sortBy?: string
  order?: 'asc' | 'desc'
}) => {
  const where: Record<string, unknown> = { user: { deletedAt: null } }
  if (filters.search) {
    where.OR = [
      { studentNumber: { contains: filters.search, mode: 'insensitive' } },
    ]
  }
  if (filters.gender) {
    where.user = { ...where.user as object, profile: { gender: filters.gender } }
  }
  if (filters.courseCode) {
    where.course = { courseCode: filters.courseCode }
  }

  const sortBy = filters.sortBy ?? 'createdAt'
  const orderBy = sortBy === 'name' ? { createdAt: filters.order ?? 'desc' } : { [sortBy]: filters.order ?? 'desc' }

  const skip = (page - 1) * limit
  const [items, total] = await Promise.all([
    prisma.student.findMany({
      where,
      include: {
        ...studentInclude,
        documents: { where: { deletedAt: null, category: 'PROFILE_PICTURE' }, orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy,
      skip,
      take: limit,
    }),
    prisma.student.count({ where }),
  ])
  return { items, total }
}

export const getById = async (studentId: string) => {
  const student = await prisma.student.findUnique({
    where: { studentId },
    include: { ...studentInclude, documents: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } } },
  })
  if (!student) throw new AppError('Student not found', 404, 'STUDENT_NOT_FOUND_404')
  return student
}

export const create = async (data: {
  studentNumber: string
  name: string
  email: string
  mykadNumber?: string
  courseCode: string
}) => {
  const course = await prisma.course.findUnique({ where: { courseCode: data.courseCode } })
  if (!course) throw new AppError('Course not found', 404, 'COURSE_NOT_FOUND_404')

  const defaultPassword = `Monash@${data.studentNumber}`
  const { data: authData, error } = await supabaseAdmin.auth.admin.createUser({
    email: data.email,
    password: defaultPassword,
    email_confirm: true,
    user_metadata: { name: data.name },
  })

  if (error) {
    if (error.message?.toLowerCase().includes('already') || error.message?.toLowerCase().includes('registered')) {
      throw new AppError('Email already registered', 409, 'DUPLICATE_EMAIL_409')
    }
    throw new AppError(error.message ?? 'Failed to create student', 400, 'CREATE_FAILED_400')
  }

  if (!authData.user) {
    throw new AppError('Failed to create student', 400, 'CREATE_FAILED_400')
  }

  try {
    return await prisma.student.create({
      data: {
        studentNumber: data.studentNumber,
        mykadNumber: data.mykadNumber ?? null,
        courseId: course.courseId,
        userId: authData.user.id,
      },
      include: studentInclude,
    })
  } catch (err) {
    return handlePrismaError(err, 'Student')
  }
}

export const update = async (studentId: string, data: {
  name?: string
  courseCode?: string
  mykadNumber?: string | null
}) => {
  const student = await getById(studentId)

  const updateData: Record<string, unknown> = {}
  if (data.mykadNumber !== undefined) updateData.mykadNumber = data.mykadNumber
  if (data.courseCode) {
    const course = await prisma.course.findUnique({ where: { courseCode: data.courseCode } })
    if (!course) throw new AppError('Course not found', 404, 'COURSE_NOT_FOUND_404')
    updateData.courseId = course.courseId
  }

  try {
    if (data.name) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(student.user.userId, { user_metadata: { name: data.name } })
      if (error) throw error
    }
    return await prisma.student.update({
      where: { studentId },
      data: updateData,
      include: studentInclude,
    })
  } catch (err) {
    return handlePrismaError(err, 'Student')
  }
}

export const remove = async (studentId: string) => {
  const student = await getById(studentId)
  try {
    await prisma.user.update({ where: { userId: student.user.userId }, data: { deletedAt: new Date() } })
  } catch (err) {
    return handlePrismaError(err, 'Student')
  }
}
