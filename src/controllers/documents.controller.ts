import type { Request, Response } from 'express'
import { response } from '../utils/response.js'
import { AppError } from '../utils/AppError.js'
import * as documentsService from '../services/documents.service.js'
import {
  assertCanAccessLecturerEntity,
  assertCanAccessStudent,
  assertCanAccessHeadLecturerEntity,
  assertCanAccessDocumentOwner,
} from '../utils/resourceAccess.js'
import type { UserType } from '@prisma/client'

const requireFile = (req: Request) => {
  if (!req.file) throw new AppError('No file uploaded', 400, 'NO_FILE_400')
  return req.file
}

type EntityConfig = {
  paramName: string
  entityType: 'STUDENT' | 'LECTURER' | 'HEAD_LECTURER'
  relationField: string
  assertAccess: (actorType: UserType, actorUserId: string, entityId: string) => Promise<void>
}

const ENTITY_CONFIGS: Record<string, EntityConfig> = {
  student: {
    paramName: 'studentId',
    entityType: 'STUDENT',
    relationField: 'studentId',
    assertAccess: assertCanAccessStudent,
  },
  lecturer: {
    paramName: 'lecturerId',
    entityType: 'LECTURER',
    relationField: 'lecturerId',
    assertAccess: assertCanAccessLecturerEntity,
  },
  headLecturer: {
    paramName: 'headLecturerId',
    entityType: 'HEAD_LECTURER',
    relationField: 'headLecturerId',
    assertAccess: assertCanAccessHeadLecturerEntity,
  },
}

function buildEntityHandlers(config: EntityConfig) {
  const upload = async (req: Request, res: Response): Promise<void> => {
    const entityId = (req.validated.params as Record<string, string>)[config.paramName]
    await config.assertAccess(req.user!.type, req.user!.userId, entityId)
    const file = requireFile(req)
    const { category } = req.validated.body as { category: string }

    const doc = await documentsService.createDocument(file, {
      entityId,
      entityType: config.entityType,
      category,
      relationField: config.relationField,
      relationId: entityId,
    })
    response(res, 201, 'Document uploaded successfully', await documentsService.serializeDocument(doc))
  }

  const list = async (req: Request, res: Response): Promise<void> => {
    const entityId = (req.validated.params as Record<string, string>)[config.paramName]
    await config.assertAccess(req.user!.type, req.user!.userId, entityId)
    const docs = await documentsService.getDocumentsByEntity(entityId, config.entityType)
    const serialized = await Promise.all(docs.map((d) => documentsService.serializeDocument(d)))
    response(res, 200, 'Documents retrieved successfully', serialized)
  }

  return { upload, list }
}

const studentHandlers = buildEntityHandlers(ENTITY_CONFIGS.student)
const lecturerHandlers = buildEntityHandlers(ENTITY_CONFIGS.lecturer)
const headLecturerHandlers = buildEntityHandlers(ENTITY_CONFIGS.headLecturer)

export const uploadStudentDocument = studentHandlers.upload
export const getStudentDocuments = studentHandlers.list
export const uploadLecturerDocument = lecturerHandlers.upload
export const getLecturerDocuments = lecturerHandlers.list
export const uploadHeadLecturerDocument = headLecturerHandlers.upload
export const getHeadLecturerDocuments = headLecturerHandlers.list

export const deleteDocument = async (req: Request, res: Response): Promise<void> => {
  const { documentId } = req.validated.params as { documentId: string }
  const doc = await documentsService.getDocumentById(documentId)
  await assertCanAccessDocumentOwner(req.user!.type, req.user!.userId, doc.entityType, doc.entityId)
  await documentsService.removeStoredFile(doc)
  await documentsService.softDeleteDocument(documentId)
  res.status(204).end()
}
