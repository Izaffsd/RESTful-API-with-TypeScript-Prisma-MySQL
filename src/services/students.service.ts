import bcrypt from 'bcrypt'
import prisma from '../config/db.js'
import { AppError } from '../utils/AppError.js'
import { handlePrismaError } from '../utils/prismaErrors.js'

const studentInclude = {
  user: { select: { userId: true, name: true, email: true, status: true } },
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
      { studentNumber: { contains: filters.search } },
      { user: { name: { contains: filters.search } } },
      { user: { email: { contains: filters.search } } },
    ]
  }
  if (filters.gender) {
    where.user = { ...where.user as object, profile: { gender: filters.gender } }
  }
  if (filters.courseCode) {
    where.course = { courseCode: filters.courseCode }
  }

  const orderBy = filters.sortBy === 'name'
    ? { user: { name: filters.order ?? 'desc' } }
    : { [filters.sortBy ?? 'createdAt']: filters.order ?? 'desc' }

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
  const passwordHash = await bcrypt.hash(defaultPassword, 12)

  try {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          passwordHash,
          name: data.name,
          type: 'STUDENT',
          isEmailVerified: true,
          emailVerifiedAt: new Date(),
        },
      })
      const student = await tx.student.create({
        data: {
          studentNumber: data.studentNumber,
          mykadNumber: data.mykadNumber ?? null,
          courseId: course.courseId,
          userId: user.userId,
        },
        include: studentInclude,
      })
      return student
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
      await prisma.user.update({ where: { userId: student.user.userId }, data: { name: data.name } })
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
