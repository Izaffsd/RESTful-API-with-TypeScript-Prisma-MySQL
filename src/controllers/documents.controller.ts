import type { Request, Response } from 'express'
import { response } from '../utils/response.js'
import { AppError } from '../utils/AppError.js'
import * as documentsService from '../services/documents.service.js'

const requireFile = (req: Request) => {
  if (!req.file) throw new AppError('No file uploaded', 400, 'NO_FILE_400')
  return req.file
}

export const uploadStudentDocument = async (req: Request, res: Response): Promise<void> => {
  const { studentId } = req.validated.params as { studentId: string }
  const file = requireFile(req)
  const { category } = req.validated.body as { category: string }

  const doc = await documentsService.createDocument(req, file, {
    entityId: studentId,
    entityType: 'STUDENT',
    category,
    relationField: 'studentId',
    relationId: studentId,
  })
  response(res, 201, 'Document uploaded successfully', documentsService.serializeDocument(doc))
}

export const getStudentDocuments = async (req: Request, res: Response): Promise<void> => {
  const { studentId } = req.validated.params as { studentId: string }
  const docs = await documentsService.getDocumentsByEntity(studentId, 'STUDENT')
  response(res, 200, 'Documents retrieved successfully', docs.map(documentsService.serializeDocument))
}

export const uploadLecturerDocument = async (req: Request, res: Response): Promise<void> => {
  const { lecturerId } = req.validated.params as { lecturerId: string }
  const file = requireFile(req)
  const { category } = req.validated.body as { category: string }

  const doc = await documentsService.createDocument(req, file, {
    entityId: lecturerId,
    entityType: 'LECTURER',
    category,
    relationField: 'lecturerId',
    relationId: lecturerId,
  })
  response(res, 201, 'Document uploaded successfully', documentsService.serializeDocument(doc))
}

export const getLecturerDocuments = async (req: Request, res: Response): Promise<void> => {
  const { lecturerId } = req.validated.params as { lecturerId: string }
  const docs = await documentsService.getDocumentsByEntity(lecturerId, 'LECTURER')
  response(res, 200, 'Documents retrieved successfully', docs.map(documentsService.serializeDocument))
}

export const uploadHeadLecturerDocument = async (req: Request, res: Response): Promise<void> => {
  const { headLecturerId } = req.validated.params as { headLecturerId: string }
  const file = requireFile(req)
  const { category } = req.validated.body as { category: string }

  const doc = await documentsService.createDocument(req, file, {
    entityId: headLecturerId,
    entityType: 'HEAD_LECTURER',
    category,
    relationField: 'headLecturerId',
    relationId: headLecturerId,
  })
  response(res, 201, 'Document uploaded successfully', documentsService.serializeDocument(doc))
}

export const getHeadLecturerDocuments = async (req: Request, res: Response): Promise<void> => {
  const { headLecturerId } = req.validated.params as { headLecturerId: string }
  const docs = await documentsService.getDocumentsByEntity(headLecturerId, 'HEAD_LECTURER')
  response(res, 200, 'Documents retrieved successfully', docs.map(documentsService.serializeDocument))
}

export const deleteDocument = async (req: Request, res: Response): Promise<void> => {
  const { documentId } = req.validated.params as { documentId: string }
  const doc = await documentsService.getDocumentById(documentId)
  await documentsService.deleteFileFromDisk(doc.filePath)
  await documentsService.softDeleteDocument(documentId)
  res.status(204).end()
}
