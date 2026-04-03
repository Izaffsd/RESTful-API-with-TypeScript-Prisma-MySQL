import type { UserType } from '@prisma/client'
import prisma from '../config/db.js'
import { AppError } from './AppError.js'

export async function getLecturerScope(userId: string) {
  return prisma.lecturer.findUnique({
    where: { userId },
    select: { lecturerId: true, courseId: true },
  })
}

/** LECTURER may only access students in their course. HEAD_LECTURER bypasses. */
export async function assertCanAccessStudent(
  actorType: UserType,
  actorUserId: string,
  studentId: string,
): Promise<void> {
  if (actorType === 'HEAD_LECTURER') return
  if (actorType !== 'LECTURER') {
    throw new AppError('You do not have permission to perform this action', 403, 'FORBIDDEN_403')
  }
  const lecturer = await getLecturerScope(actorUserId)
  if (!lecturer) {
    throw new AppError('Student not found', 404, 'STUDENT_NOT_FOUND_404')
  }
  const student = await prisma.student.findUnique({
    where: { studentId },
    select: {
      courseId: true,
      user: { select: { deletedAt: true } },
    },
  })
  if (!student?.user || student.user.deletedAt || student.courseId !== lecturer.courseId) {
    throw new AppError('Student not found', 404, 'STUDENT_NOT_FOUND_404')
  }
}

/** LECTURER may only act on their own lecturer record. HEAD_LECTURER bypasses. */
export async function assertCanAccessLecturerEntity(
  actorType: UserType,
  actorUserId: string,
  targetLecturerId: string,
): Promise<void> {
  if (actorType === 'HEAD_LECTURER') return
  if (actorType !== 'LECTURER') {
    throw new AppError('You do not have permission to perform this action', 403, 'FORBIDDEN_403')
  }
  const lecturer = await getLecturerScope(actorUserId)
  if (!lecturer || lecturer.lecturerId !== targetLecturerId) {
    throw new AppError('Lecturer not found', 404, 'LECTURER_NOT_FOUND_404')
  }
}

/** LECTURER may only read their assigned course. HEAD_LECTURER bypasses. */
export async function assertCanAccessCourse(
  actorType: UserType,
  actorUserId: string,
  courseId: string,
): Promise<void> {
  if (actorType === 'HEAD_LECTURER') return
  if (actorType !== 'LECTURER') {
    throw new AppError('You do not have permission to perform this action', 403, 'FORBIDDEN_403')
  }
  const lecturer = await getLecturerScope(actorUserId)
  if (!lecturer || lecturer.courseId !== courseId) {
    throw new AppError('Course not found', 404, 'COURSE_NOT_FOUND_404')
  }
}
