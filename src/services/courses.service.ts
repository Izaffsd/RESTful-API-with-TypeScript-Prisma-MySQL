import prisma from '../config/db.js'
import { AppError } from '../utils/AppError.js'
import { handlePrismaError } from '../utils/prismaErrors.js'

export const getForSelect = async () => {
  return prisma.course.findMany({
    where: { isActive: true },
    orderBy: { courseCode: 'asc' },
    select: { courseId: true, courseCode: true, courseName: true },
  })
}

export const getAll = async (page: number, limit: number) => {
  const skip = (page - 1) * limit
  const [items, total] = await Promise.all([
    prisma.course.findMany({
      orderBy: { courseCode: 'asc' },
      skip,
      take: limit,
      include: { _count: { select: { students: true, lecturers: true } } },
    }),
    prisma.course.count(),
  ])

  const data = items.map((c) => ({
    ...c,
    totalStudents: c._count.students,
    totalLecturers: c._count.lecturers,
    _count: undefined,
  }))

  return { items: data, total }
}

export const getById = async (courseId: string) => {
  const course = await prisma.course.findUnique({
    where: { courseId },
    include: {
      _count: { select: { students: true, lecturers: true } },
      lecturers: {
        include: { user: { select: { userId: true, status: true } } },
      },
    },
  })
  if (!course) throw new AppError('Course not found', 404, 'COURSE_NOT_FOUND_404')

  return {
    ...course,
    totalStudents: course._count.students,
    totalLecturers: course._count.lecturers,
    _count: undefined,
    lecturers: course.lecturers.map((l) => ({
      lecturerId: l.lecturerId,
      staffNumber: l.staffNumber,
      userId: l.user.userId,
    })),
  }
}

export const create = async (data: { courseCode: string; courseName: string; description?: string | null }) => {
  try {
    return await prisma.course.create({ data })
  } catch (err) {
    return handlePrismaError(err, 'Course')
  }
}

export const update = async (courseId: string, data: {
  courseCode?: string
  courseName?: string
  description?: string | null
  isActive?: boolean
}) => {
  await getById(courseId)
  try {
    return await prisma.course.update({ where: { courseId }, data })
  } catch (err) {
    return handlePrismaError(err, 'Course')
  }
}

export const remove = async (courseId: string) => {
  await getById(courseId)
  try {
    return await prisma.course.delete({ where: { courseId } })
  } catch (err) {
    return handlePrismaError(err, 'Course')
  }
}
