import prisma from '../config/db.js'
import { AppError } from '../utils/AppError.js'
import { handlePrismaError } from '../utils/prismaErrors.js'
import { extractStudentNumberPrefix } from '../validations/studentValidation.js'

const studentInclude = { course: true } as const

export const getAll = async () => {
  return prisma.student.findMany({ include: studentInclude })
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

export const create = async ( data: {
  studentNumber: string
  mykadNumber: string
  email: string
  studentName: string
  address?: string | null
  gender?: 'Male' | 'Female' | null}) => {
  const prefix = extractStudentNumberPrefix(data.studentNumber)
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

  try {
    return await prisma.student.create({
      data: {
        ...data,
        address: data.address ?? null,
        gender: data.gender ?? null,
        courseId: course.courseId,
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

  const prefix = extractStudentNumberPrefix(data.studentNumber)
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

  try {
    return await prisma.student.update({
      where: { studentId },
      data: {
        ...data,
        address: data.address ?? null,
        gender: data.gender ?? null,
        courseId: course.courseId,
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
