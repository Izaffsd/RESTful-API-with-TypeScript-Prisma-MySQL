import prisma from '../config/db.js'
import { AppError } from '../utils/AppError.js'
import { handlePrismaError } from '../utils/prismaErrors.js'

export const getAll = async (page: number, limit: number) => {
  const skip = (page - 1) * limit
  const [data, total] = await Promise.all([
    prisma.course.findMany({ orderBy: { courseCode: 'asc' }, skip, take: limit }),
    prisma.course.count(),
  ])
  return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } }
}

export const getByCode = async (courseCode: string) => {
  const course = await prisma.course.findUnique({
    where: { courseCode },
    include: { students: true },
  })

  if (!course) {
    throw new AppError('Course does not exist', 404, 'COURSE_NOT_FOUND_404')
  }

  return course
}

export const create = async (data: { courseCode: string; courseName: string }) => {
  try {
    return await prisma.course.create({ data })
  } catch (err) {
    return handlePrismaError(err, 'Course')
  }
}

export const update = async (courseId: number, data: { courseCode: string; courseName: string }) => {
  try {
    return await prisma.course.update({ where: { courseId }, data })
  } catch (err) {
    return handlePrismaError(err, 'Course')
  }
}

export const remove = async (courseId: number) => {
  try {
    return await prisma.course.delete({ where: { courseId } })
  } catch (err) {
    return handlePrismaError(err, 'Course')
  }
}
