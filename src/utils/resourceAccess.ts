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

/** HEAD_LECTURER may only act on their own head-lecturer record. */
export async function assertCanAccessHeadLecturerEntity(
  actorType: UserType,
  actorUserId: string,
  targetHeadLecturerId: string,
): Promise<void> {
  if (actorType !== 'HEAD_LECTURER') {
    throw new AppError('You do not have permission to perform this action', 403, 'FORBIDDEN_403')
  }
  const hl = await prisma.headLecturer.findUnique({
    where: { userId: actorUserId },
    select: { headLecturerId: true },
  })
  if (!hl || hl.headLecturerId !== targetHeadLecturerId) {
    throw new AppError('Head lecturer not found', 404, 'HEAD_LECTURER_NOT_FOUND_404')
  }
}

/**
 * Verify the caller can access the entity that owns a document.
 * Used by the global `DELETE /documents/:documentId` route.
 */
export async function assertCanAccessDocumentOwner(
  actorType: UserType,
  actorUserId: string,
  entityType: string,
  entityId: string,
): Promise<void> {
  switch (entityType) {
    case 'STUDENT':
      return assertCanAccessStudent(actorType, actorUserId, entityId)
    case 'LECTURER':
      return assertCanAccessLecturerEntity(actorType, actorUserId, entityId)
    case 'HEAD_LECTURER':
      return assertCanAccessHeadLecturerEntity(actorType, actorUserId, entityId)
    default:
      throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND_404')
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
