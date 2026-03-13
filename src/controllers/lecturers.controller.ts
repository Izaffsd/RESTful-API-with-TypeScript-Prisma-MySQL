import type { Request, Response } from 'express'
import { response } from '../utils/response.js'
import { buildPagination } from '../utils/pagination.js'
import * as lecturersService from '../services/lecturers.service.js'
import { serializeWithDocuments } from '../services/documents.service.js'
import { enrichWithAuthUser, enrichWithAuthUsers } from '../utils/enrichAuthUser.js'
import type { PaginationQuery } from '../validations/shared/paginationSchema.js'

export const getAllLecturers = async (req: Request, res: Response): Promise<void> => {
  const { page, limit } = req.validated.query as PaginationQuery
  const { items, total } = await lecturersService.getAll(page, limit)
  const enriched = await enrichWithAuthUsers(items)
  const serialized = enriched.map(serializeWithDocuments)
  const { meta, links } = buildPagination(req, page, limit, total)
  response(res, 200, 'Lecturers retrieved successfully', serialized, null, [], meta, links)
}

export const getLecturerById = async (req: Request, res: Response): Promise<void> => {
  const { lecturerId } = req.validated.params as { lecturerId: string }
  const lecturer = await lecturersService.getById(lecturerId)
  const enriched = await enrichWithAuthUser(lecturer)
  response(res, 200, 'Lecturer retrieved successfully', serializeWithDocuments(enriched))
}

export const createLecturer = async (req: Request, res: Response): Promise<void> => {
  const data = req.validated.body as Parameters<typeof lecturersService.create>[0]
  const lecturer = await lecturersService.create(data)
  const enriched = await enrichWithAuthUser(lecturer)
  response(res, 201, 'Lecturer created successfully', enriched)
}

export const updateLecturer = async (req: Request, res: Response): Promise<void> => {
  const { lecturerId } = req.validated.params as { lecturerId: string }
  const data = req.validated.body as Parameters<typeof lecturersService.update>[1]
  const lecturer = await lecturersService.update(lecturerId, data)
  const enriched = await enrichWithAuthUser(lecturer)
  response(res, 200, 'Lecturer updated successfully', enriched)
}

export const deleteLecturer = async (req: Request, res: Response): Promise<void> => {
  const { lecturerId } = req.validated.params as { lecturerId: string }
  await lecturersService.remove(lecturerId)
  res.status(204).end()
}
