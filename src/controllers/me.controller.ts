import type { Request, Response } from 'express'
import { response } from '../utils/response.js'
import { buildPagination } from '../utils/pagination.js'
import { AppError } from '../utils/AppError.js'
import * as meService from '../services/me.service.js'
import * as documentsService from '../services/documents.service.js'
import type { PaginationQuery } from '../validations/shared/paginationSchema.js'

export const getMyStudent = async (req: Request, res: Response): Promise<void> => {
  const student = await meService.getMyStudent(req.user!.userId)
  response(res, 200, 'Student data retrieved successfully', student)
}

export const updateMyStudent = async (req: Request, res: Response): Promise<void> => {
  const data = req.validated.body as { mykadNumber?: string | null }
  const updated = await meService.updateMyStudent(req.user!.userId, data)
  response(res, 200, 'Student data updated successfully', updated)
}

export const getMyCourse = async (req: Request, res: Response): Promise<void> => {
  const course = await meService.getMyCourse(req.user!.userId)
  if (!course) {
    response(res, 200, 'No course assigned', null)
    return
  }
  response(res, 200, 'Course retrieved successfully', course)
}

export const getMyLecturer = async (req: Request, res: Response): Promise<void> => {
  const lecturer = await meService.getMyLecturer(req.user!.userId)
  response(res, 200, 'Lecturer data retrieved successfully', lecturer)
}

export const updateMyLecturer = async (req: Request, res: Response): Promise<void> => {
  const data = req.validated.body as { mykadNumber?: string | null }
  const updated = await meService.updateMyLecturer(req.user!.userId, data)
  response(res, 200, 'Lecturer data updated successfully', updated)
}

export const getMyHeadLecturer = async (req: Request, res: Response): Promise<void> => {
  const hl = await meService.getMyHeadLecturer(req.user!.userId)
  response(res, 200, 'Head lecturer data retrieved successfully', hl)
}

export const updateMyHeadLecturer = async (req: Request, res: Response): Promise<void> => {
  const data = req.validated.body as { mykadNumber?: string | null }
  const updated = await meService.updateMyHeadLecturer(req.user!.userId, data)
  response(res, 200, 'Head lecturer data updated successfully', updated)
}

export const getMyStudents = async (req: Request, res: Response): Promise<void> => {
  const { page, limit } = req.validated.query as PaginationQuery
  const { items, total } = await meService.getMyStudents(req.user!.userId, page, limit)
  const { meta, links } = buildPagination(req, page, limit, total)
  response(res, 200, 'Students retrieved successfully', items, null, [], meta, links)
}

export const getMyDocuments = async (req: Request, res: Response): Promise<void> => {
  const entity = await meService.getEntityRecord(req.user!.userId, req.user!.type)
  if (!entity) {
    response(res, 200, 'Documents retrieved successfully', [])
    return
  }

  const docs = await documentsService.getDocumentsByEntity(entity.entityId, req.user!.type)
  const serialized = await Promise.all(docs.map((d) => documentsService.serializeDocument(d)))
  response(res, 200, 'Documents retrieved successfully', serialized)
}

export const uploadMyDocument = async (req: Request, res: Response): Promise<void> => {
  if (!req.file) throw new AppError('No file uploaded', 400, 'NO_FILE_400')

  const entity = await meService.getEntityRecord(req.user!.userId, req.user!.type)
  if (!entity) throw new AppError(meService.entityNotFoundMessage(req.user!.type), 404, 'RECORD_NOT_FOUND_404')

  const { category } = req.validated.body as { category: string }

  const doc = await documentsService.createDocument(req.file, {
    entityId: entity.entityId,
    entityType: req.user!.type,
    category,
    relationField: `${entity.model}Id`,
    relationId: entity.entityId,
  })

  response(res, 201, 'Document uploaded successfully', await documentsService.serializeDocument(doc))
}

export const deleteMyDocument = async (req: Request, res: Response): Promise<void> => {
  const { documentId } = req.validated.params as { documentId: string }
  const entity = await meService.getEntityRecord(req.user!.userId, req.user!.type)
  if (!entity) {
    throw new AppError(meService.entityNotFoundMessage(req.user!.type), 404, 'RECORD_NOT_FOUND_404')
  }

  const doc = await documentsService.getDocumentById(documentId)
  if (doc.entityId !== entity.entityId || doc.entityType !== req.user!.type) {
    throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND_404')
  }

  await documentsService.removeStoredFile(doc)
  await documentsService.softDeleteDocument(documentId)
  res.status(204).end()
}
