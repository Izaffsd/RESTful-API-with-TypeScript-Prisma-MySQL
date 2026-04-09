import prisma from '../config/db.js'
import { AppError } from '../utils/AppError.js'
import { enrichWithAuthUsers } from '../utils/enrichAuthUser.js'

export const getEntityRecord = async (userId: string, type: string) => {
  if (type === 'STUDENT') {
    const r = await prisma.student.findUnique({ where: { userId } })
    return r ? { entityId: r.studentId, model: 'student' } : null
  }
  if (type === 'LECTURER') {
    const r = await prisma.lecturer.findUnique({ where: { userId } })
    return r ? { entityId: r.lecturerId, model: 'lecturer' } : null
  }
  const r = await prisma.headLecturer.findUnique({ where: { userId } })
  return r ? { entityId: r.headLecturerId, model: 'headLecturer' } : null
}

export const getMyStudent = async (userId: string) => {
  const student = await prisma.student.findUnique({
    where: { userId },
    include: { course: true },
  })
  if (!student) throw new AppError('Student record not found', 404, 'STUDENT_NOT_FOUND_404')
  return student
}

export const updateMyStudent = async (userId: string, data: { mykadNumber?: string | null }) => {
  const student = await prisma.student.findUnique({ where: { userId } })
  if (!student) throw new AppError('Student record not found', 404, 'STUDENT_NOT_FOUND_404')

  if (data.mykadNumber) {
    await assertMykadUnique('student', data.mykadNumber, student.studentId)
  }

  return prisma.student.update({
    where: { studentId: student.studentId },
    data: { mykadNumber: data.mykadNumber },
    include: { course: true },
  })
}

export const getMyCourse = async (userId: string) => {
  const student = await prisma.student.findUnique({
    where: { userId },
    include: { course: true },
  })
  return student?.course ?? null
}

export const getMyLecturer = async (userId: string) => {
  const lecturer = await prisma.lecturer.findUnique({
    where: { userId },
    include: { course: true },
  })
  if (!lecturer) throw new AppError('Lecturer record not found', 404, 'LECTURER_NOT_FOUND_404')
  return lecturer
}

export const updateMyLecturer = async (userId: string, data: { mykadNumber?: string | null }) => {
  const lecturer = await prisma.lecturer.findUnique({ where: { userId } })
  if (!lecturer) throw new AppError('Lecturer record not found', 404, 'LECTURER_NOT_FOUND_404')

  if (data.mykadNumber) {
    await assertMykadUnique('lecturer', data.mykadNumber, lecturer.lecturerId)
  }

  return prisma.lecturer.update({
    where: { lecturerId: lecturer.lecturerId },
    data: { mykadNumber: data.mykadNumber },
    include: { course: true },
  })
}

export const getMyHeadLecturer = async (userId: string) => {
  const hl = await prisma.headLecturer.findUnique({ where: { userId } })
  if (!hl) throw new AppError('Head lecturer record not found', 404, 'HEAD_LECTURER_NOT_FOUND_404')
  return hl
}

export const updateMyHeadLecturer = async (userId: string, data: { mykadNumber?: string | null }) => {
  const hl = await prisma.headLecturer.findUnique({ where: { userId } })
  if (!hl) throw new AppError('Head lecturer record not found', 404, 'HEAD_LECTURER_NOT_FOUND_404')

  if (data.mykadNumber) {
    await assertMykadUnique('headLecturer', data.mykadNumber, hl.headLecturerId)
  }

  return prisma.headLecturer.update({
    where: { headLecturerId: hl.headLecturerId },
    data: { mykadNumber: data.mykadNumber },
  })
}

export const getMyStudents = async (userId: string, page: number, limit: number) => {
  const lecturer = await prisma.lecturer.findUnique({ where: { userId } })
  if (!lecturer) throw new AppError('Lecturer record not found', 404, 'LECTURER_NOT_FOUND_404')

  const skip = (page - 1) * limit
  const where = { courseId: lecturer.courseId, user: { deletedAt: null } }

  const [items, total] = await Promise.all([
    prisma.student.findMany({
      where,
      include: {
        user: { include: { profile: true } },
        course: { select: { courseId: true, courseCode: true, courseName: true } },
      },
      skip,
      take: limit,
    }),
    prisma.student.count({ where }),
  ])
  const enriched = await enrichWithAuthUsers(items)
  return { items: enriched, total }
}

export const entityNotFoundMessage = (type: string) =>
  type === 'STUDENT'
    ? 'Add your student number and course in the profile page to upload documents.'
    : type === 'LECTURER'
      ? 'No lecturer profile linked to your account. Contact an administrator.'
      : 'No head lecturer profile linked to your account. Contact an administrator.'

/**
 * Consolidated MyKad uniqueness check for all entity types.
 * Throws 409 if the MyKad number is already registered to a different entity.
 */
async function assertMykadUnique(
  entityType: 'student' | 'lecturer' | 'headLecturer',
  mykadNumber: string,
  currentEntityId: string,
): Promise<void> {
  const label =
    entityType === 'student' ? 'student'
      : entityType === 'lecturer' ? 'lecturer'
        : 'head lecturer'

  const idField =
    entityType === 'student' ? 'studentId'
      : entityType === 'lecturer' ? 'lecturerId'
        : 'headLecturerId'

  const existing = await (prisma[entityType] as never as {
    findFirst: (args: { where: Record<string, unknown> }) => Promise<unknown>
  }).findFirst({
    where: { mykadNumber, [idField]: { not: currentEntityId } },
  })

  if (existing) {
    throw new AppError(`MyKad number already registered to another ${label}`, 409, 'DUPLICATE_MYKAD_409')
  }
}
