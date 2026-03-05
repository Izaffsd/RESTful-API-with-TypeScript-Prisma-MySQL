import prisma from '../config/db.js'
import { AppError } from '../utils/AppError.js'
import { handlePrismaError } from '../utils/prismaErrors.js'

export const getAll = async () => {
  return prisma.course.findMany({ orderBy: { courseCode: 'asc' } })
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

export const update = async ( courseId: number,
  data: { courseCode: string; courseName: string }) => {

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
