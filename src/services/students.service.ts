import prisma from '../config/db.js'
import { AppError } from '../utils/AppError.js'
import { handlePrismaError } from '../utils/prismaErrors.js'
import { extractStudentNumberPrefix } from '../validations/studentValidation.js'

const studentInclude = { course: true } as const // TS sees permanently true

const checkDuplicate = async ( data: { studentNumber: string; email: string },
  excludeId?: number ) => {
  const existing = await prisma.student.findFirst({
    where: {
      OR: [
        { studentNumber: data.studentNumber },
        { email: data.email },
      ],
      ...(excludeId ? { NOT: { studentId: excludeId } } : {}),
    },
    select: { studentNumber: true, email: true },
  })

  if (!existing) return

  if (existing.studentNumber === data.studentNumber)
    throw new AppError('Student with this student number already exists', 409, 'DUPLICATE_STUDENT_409', [{ field: 'studentNumber' }])

  if (existing.email === data.email)
    throw new AppError('Student with this email already exists', 409, 'DUPLICATE_STUDENT_409', [{ field: 'email' }])
}

const findCourseByPrefix = async (studentNumber: string) => {
  const prefix = extractStudentNumberPrefix(studentNumber)
  if (!prefix) {
    throw new AppError('Invalid student number prefix', 400, 'INVALID_STUDENT_NUMBER_400')
  }

  const course = await prisma.course.findUnique({
    where: { courseCode: prefix },
    select: { courseId: true },
  })
  if (!course) {
    throw new AppError('Course does not exist for this prefix', 404, 'COURSE_NOT_FOUND_404')
  }

  return course.courseId
}

export const getAll = async (page: number, limit: number) => {
  const skip = (page - 1) * limit
  const [data, total] = await Promise.all([
    prisma.student.findMany({ include: studentInclude, skip, take: limit }),
    prisma.student.count(),
  ])
  return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } }
}

export const getById = async (studentId: number) => {
  const student = await prisma.student.findUnique({
    where: { studentId },
    include: studentInclude,
  })

  if (!student) {
    throw new AppError('Student does not exist', 404, 'STUDENT_NOT_FOUND_404')
  }

  return student
}

export const create = async (data: {
  studentNumber: string
  mykadNumber: string
  email: string
  studentName: string
  address?: string | null
  gender?: 'Male' | 'Female' | null }) => {

  const courseId = await findCourseByPrefix(data.studentNumber)
  await checkDuplicate(data)

  try {
    return await prisma.student.create({
      data: {
        ...data,
        address: data.address ?? null,
        gender: data.gender ?? null,
        courseId
      },
      include: studentInclude,
    })
  } catch (err) {
    return handlePrismaError(err, 'Student')
  }
}

export const update = async ( studentId: number,
  data: {
    studentNumber: string
    mykadNumber: string
    email: string
    studentName: string
    address?: string | null
    gender?: 'Male' | 'Female' | null }) => {

  const courseId = await findCourseByPrefix(data.studentNumber)
  await checkDuplicate(data, studentId)

  try {
    return await prisma.student.update({
      where: { studentId },
      data: {
        ...data,
        address: data.address ?? null,
        gender: data.gender ?? null,
        courseId
      },
      include: studentInclude,
    })
  } catch (err) {
    return handlePrismaError(err, 'Student')
  }
}

export const remove = async (studentId: number) => {
  try {
    return await prisma.student.delete({ where: { studentId } })
  } catch (err) {
    return handlePrismaError(err, 'Student')
  }
}
