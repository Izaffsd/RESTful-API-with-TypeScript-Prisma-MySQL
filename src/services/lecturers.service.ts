import bcrypt from 'bcrypt'
import prisma from '../config/db.js'
import { AppError } from '../utils/AppError.js'
import { handlePrismaError } from '../utils/prismaErrors.js'

const lecturerInclude = {
  user: { select: { userId: true, name: true, email: true, status: true } },
  course: { select: { courseId: true, courseCode: true, courseName: true } },
} as const

export const getAll = async (page: number, limit: number) => {
  const skip = (page - 1) * limit
  const where = { user: { deletedAt: null } }
  const [items, total] = await Promise.all([
    prisma.lecturer.findMany({
      where,
      include: {
        ...lecturerInclude,
        documents: { where: { deletedAt: null, category: 'PROFILE_PICTURE' }, orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.lecturer.count({ where }),
  ])
  return { items, total }
}

export const getById = async (lecturerId: string) => {
  const lecturer = await prisma.lecturer.findUnique({
    where: { lecturerId },
    include: { ...lecturerInclude, documents: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } } },
  })
  if (!lecturer) throw new AppError('Lecturer not found', 404, 'LECTURER_NOT_FOUND_404')
  return lecturer
}

export const create = async (data: {
  staffNumber: string
  name: string
  email: string
  password: string
  mykadNumber?: string
  courseCode: string
}) => {
  const course = await prisma.course.findUnique({ where: { courseCode: data.courseCode } })
  if (!course) throw new AppError('Course not found', 404, 'COURSE_NOT_FOUND_404')

  const passwordHash = await bcrypt.hash(data.password, 12)

  try {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          passwordHash,
          name: data.name,
          type: 'LECTURER',
          isEmailVerified: true,
          emailVerifiedAt: new Date(),
        },
      })
      return await tx.lecturer.create({
        data: {
          staffNumber: data.staffNumber,
          mykadNumber: data.mykadNumber ?? null,
          courseId: course.courseId,
          userId: user.userId,
        },
        include: lecturerInclude,
      })
    })
  } catch (err) {
    return handlePrismaError(err, 'Lecturer')
  }
}

export const update = async (lecturerId: string, data: {
  name?: string
  courseCode?: string
  mykadNumber?: string | null
}) => {
  const lecturer = await getById(lecturerId)

  const updateData: Record<string, unknown> = {}
  if (data.mykadNumber !== undefined) updateData.mykadNumber = data.mykadNumber
  if (data.courseCode) {
    const course = await prisma.course.findUnique({ where: { courseCode: data.courseCode } })
    if (!course) throw new AppError('Course not found', 404, 'COURSE_NOT_FOUND_404')
    updateData.courseId = course.courseId
  }

  try {
    if (data.name) {
      await prisma.user.update({ where: { userId: lecturer.user.userId }, data: { name: data.name } })
    }
    return await prisma.lecturer.update({ where: { lecturerId }, data: updateData, include: lecturerInclude })
  } catch (err) {
    return handlePrismaError(err, 'Lecturer')
  }
}

export const remove = async (lecturerId: string) => {
  const lecturer = await getById(lecturerId)
  try {
    await prisma.user.update({ where: { userId: lecturer.user.userId }, data: { deletedAt: new Date() } })
  } catch (err) {
    return handlePrismaError(err, 'Lecturer')
  }
}
