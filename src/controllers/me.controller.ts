import type { Request, Response } from 'express'
import { response } from '../utils/response.js'
import { buildPagination } from '../utils/pagination.js'
import prisma from '../config/db.js'
import { AppError } from '../utils/AppError.js'
import * as documentsService from '../services/documents.service.js'
import type { PaginationQuery } from '../validations/paginationSchema.js'

const getEntityRecord = async (userId: string, type: string) => {
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

export const getMyStudent = async (req: Request, res: Response): Promise<void> => {
  const student = await prisma.student.findUnique({
    where: { userId: req.user!.userId },
    include: { course: true },
  })
  if (!student) throw new AppError('Student record not found', 404, 'STUDENT_NOT_FOUND_404')
  response(res, 200, 'Student data retrieved successfully', student)
}

export const updateMyStudent = async (req: Request, res: Response): Promise<void> => {
  const student = await prisma.student.findUnique({ where: { userId: req.user!.userId } })
  if (!student) throw new AppError('Student record not found', 404, 'STUDENT_NOT_FOUND_404')

  const data = req.validated.body as { mykadNumber?: string | null }
  if (data.mykadNumber) {
    const existing = await prisma.student.findFirst({
      where: { mykadNumber: data.mykadNumber, studentId: { not: student.studentId } },
    })
    if (existing) {
      throw new AppError('MyKad number already registered to another student', 409, 'DUPLICATE_MYKAD_409')
    }
  }

  const updated = await prisma.student.update({
    where: { studentId: student.studentId },
    data: { mykadNumber: data.mykadNumber },
    include: { course: true },
  })
  response(res, 200, 'Student data updated successfully', updated)
}

export const getMyCourse = async (req: Request, res: Response): Promise<void> => {
  const student = await prisma.student.findUnique({
    where: { userId: req.user!.userId },
    include: { course: true },
  })
  if (!student) throw new AppError('Student record not found', 404, 'STUDENT_NOT_FOUND_404')
  response(res, 200, 'Course retrieved successfully', student.course)
}

export const getMyLecturer = async (req: Request, res: Response): Promise<void> => {
  const lecturer = await prisma.lecturer.findUnique({
    where: { userId: req.user!.userId },
    include: { course: true },
  })
  if (!lecturer) throw new AppError('Lecturer record not found', 404, 'LECTURER_NOT_FOUND_404')
  response(res, 200, 'Lecturer data retrieved successfully', lecturer)
}

export const updateMyLecturer = async (req: Request, res: Response): Promise<void> => {
  const lecturer = await prisma.lecturer.findUnique({ where: { userId: req.user!.userId } })
  if (!lecturer) throw new AppError('Lecturer record not found', 404, 'LECTURER_NOT_FOUND_404')

  const data = req.validated.body as { mykadNumber?: string | null }
  if (data.mykadNumber) {
    const existing = await prisma.lecturer.findFirst({
      where: { mykadNumber: data.mykadNumber, lecturerId: { not: lecturer.lecturerId } },
    })
    if (existing) {
      throw new AppError('MyKad number already registered to another lecturer', 409, 'DUPLICATE_MYKAD_409')
    }
  }

  const updated = await prisma.lecturer.update({
    where: { lecturerId: lecturer.lecturerId },
    data: { mykadNumber: data.mykadNumber },
    include: { course: true },
  })
  response(res, 200, 'Lecturer data updated successfully', updated)
}

export const getMyStudents = async (req: Request, res: Response): Promise<void> => {
  const lecturer = await prisma.lecturer.findUnique({ where: { userId: req.user!.userId } })
  if (!lecturer) throw new AppError('Lecturer record not found', 404, 'LECTURER_NOT_FOUND_404')

  const { page, limit } = req.validated.query as PaginationQuery
  const skip = (page - 1) * limit
  const where = { courseId: lecturer.courseId, user: { deletedAt: null } }

  const [items, total] = await Promise.all([
    prisma.student.findMany({
      where,
      include: { user: { select: { userId: true, name: true, email: true, status: true } } },
      skip,
      take: limit,
    }),
    prisma.student.count({ where }),
  ])
  const { meta, links } = buildPagination(req, page, limit, total)
  response(res, 200, 'Students retrieved successfully', items, null, [], meta, links)
}

const entityNotFoundMessage = (type: string) =>
  type === 'STUDENT'
    ? 'No student profile linked to your account. Register with a student number to use documents, or contact an administrator.'
    : type === 'LECTURER'
      ? 'No lecturer profile linked to your account. Contact an administrator.'
      : 'No head lecturer profile linked to your account. Contact an administrator.'

export const getMyDocuments = async (req: Request, res: Response): Promise<void> => {
  const entity = await getEntityRecord(req.user!.userId, req.user!.type)
  if (!entity) throw new AppError(entityNotFoundMessage(req.user!.type), 404, 'RECORD_NOT_FOUND_404')

  const docs = await documentsService.getDocumentsByEntity(entity.entityId, req.user!.type)
  response(res, 200, 'Documents retrieved successfully', docs.map(documentsService.serializeDocument))
}

export const uploadMyDocument = async (req: Request, res: Response): Promise<void> => {
  if (!req.file) throw new AppError('No file uploaded', 400, 'NO_FILE_400')

  const entity = await getEntityRecord(req.user!.userId, req.user!.type)
  if (!entity) throw new AppError(entityNotFoundMessage(req.user!.type), 404, 'RECORD_NOT_FOUND_404')

  const { category } = req.validated.body as { category: string }

  const doc = await documentsService.createDocument(req, req.file, {
    entityId: entity.entityId,
    entityType: req.user!.type,
    category,
    relationField: `${entity.model}Id`,
    relationId: entity.entityId,
  })

  response(res, 201, 'Document uploaded successfully', documentsService.serializeDocument(doc))
}
