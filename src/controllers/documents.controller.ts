import type { Request, Response } from 'express'
import { response } from '../utils/response.js'
import { AppError } from '../utils/AppError.js'
import * as documentsService from '../services/documents.service.js'
import { assertCanAccessLecturerEntity, assertCanAccessStudent } from '../utils/resourceAccess.js'

const requireFile = (req: Request) => {
  if (!req.file) throw new AppError('No file uploaded', 400, 'NO_FILE_400')
  return req.file
}

export const uploadStudentDocument = async (req: Request, res: Response): Promise<void> => {
  const { studentId } = req.validated.params as { studentId: string }
  await assertCanAccessStudent(req.user!.type, req.user!.userId, studentId)
  const file = requireFile(req)
  const { category } = req.validated.body as { category: string }

  const doc = await documentsService.createDocument(file, {
    entityId: studentId,
    entityType: 'STUDENT',
    category,
    relationField: 'studentId',
    relationId: studentId,
  })
  response(res, 201, 'Document uploaded successfully', await documentsService.serializeDocument(doc))
}

export const getStudentDocuments = async (req: Request, res: Response): Promise<void> => {
  const { studentId } = req.validated.params as { studentId: string }
  await assertCanAccessStudent(req.user!.type, req.user!.userId, studentId)
  const docs = await documentsService.getDocumentsByEntity(studentId, 'STUDENT')
  const serialized = await Promise.all(docs.map((d) => documentsService.serializeDocument(d)))
  response(res, 200, 'Documents retrieved successfully', serialized)
}

export const uploadLecturerDocument = async (req: Request, res: Response): Promise<void> => {
  const { lecturerId } = req.validated.params as { lecturerId: string }
  await assertCanAccessLecturerEntity(req.user!.type, req.user!.userId, lecturerId)
  const file = requireFile(req)
  const { category } = req.validated.body as { category: string }

  const doc = await documentsService.createDocument(file, {
    entityId: lecturerId,
    entityType: 'LECTURER',
    category,
    relationField: 'lecturerId',
    relationId: lecturerId,
  })
  response(res, 201, 'Document uploaded successfully', await documentsService.serializeDocument(doc))
}

export const getLecturerDocuments = async (req: Request, res: Response): Promise<void> => {
  const { lecturerId } = req.validated.params as { lecturerId: string }
  await assertCanAccessLecturerEntity(req.user!.type, req.user!.userId, lecturerId)
  const docs = await documentsService.getDocumentsByEntity(lecturerId, 'LECTURER')
  const serialized = await Promise.all(docs.map((d) => documentsService.serializeDocument(d)))
  response(res, 200, 'Documents retrieved successfully', serialized)
}

export const uploadHeadLecturerDocument = async (req: Request, res: Response): Promise<void> => {
  const { headLecturerId } = req.validated.params as { headLecturerId: string }
  const file = requireFile(req)
  const { category } = req.validated.body as { category: string }

  const doc = await documentsService.createDocument(file, {
    entityId: headLecturerId,
    entityType: 'HEAD_LECTURER',
    category,
    relationField: 'headLecturerId',
    relationId: headLecturerId,
  })
  response(res, 201, 'Document uploaded successfully', await documentsService.serializeDocument(doc))
}

export const getHeadLecturerDocuments = async (req: Request, res: Response): Promise<void> => {
  const { headLecturerId } = req.validated.params as { headLecturerId: string }
  const docs = await documentsService.getDocumentsByEntity(headLecturerId, 'HEAD_LECTURER')
  const serialized = await Promise.all(docs.map((d) => documentsService.serializeDocument(d)))
  response(res, 200, 'Documents retrieved successfully', serialized)
}

export const deleteDocument = async (req: Request, res: Response): Promise<void> => {
  const { documentId } = req.validated.params as { documentId: string }
  const doc = await documentsService.getDocumentById(documentId)
  await documentsService.removeStoredFile(doc)
  await documentsService.softDeleteDocument(documentId)
  res.status(204).end()
}
