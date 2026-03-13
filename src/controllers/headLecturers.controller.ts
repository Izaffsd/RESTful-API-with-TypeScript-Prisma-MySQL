import type { Request, Response } from 'express'
import { response } from '../utils/response.js'
import { buildPagination } from '../utils/pagination.js'
import * as headLecturersService from '../services/headLecturers.service.js'
import { serializeWithDocuments } from '../services/documents.service.js'
import { enrichWithAuthUser, enrichWithAuthUsers } from '../utils/enrichAuthUser.js'
import type { PaginationQuery } from '../validations/shared/paginationSchema.js'

export const getAllHeadLecturers = async (req: Request, res: Response): Promise<void> => {
  const { page, limit } = req.validated.query as PaginationQuery
  const { items, total } = await headLecturersService.getAll(page, limit)
  const enriched = await enrichWithAuthUsers(items)
  const serialized = enriched.map(serializeWithDocuments)
  const { meta, links } = buildPagination(req, page, limit, total)
  response(res, 200, 'Head lecturers retrieved successfully', serialized, null, [], meta, links)
}

export const getHeadLecturerById = async (req: Request, res: Response): Promise<void> => {
  const { headLecturerId } = req.validated.params as { headLecturerId: string }
  const hl = await headLecturersService.getById(headLecturerId)
  const enriched = await enrichWithAuthUser(hl)
  response(res, 200, 'Head lecturer retrieved successfully', serializeWithDocuments(enriched))
}

export const createHeadLecturer = async (req: Request, res: Response): Promise<void> => {
  const data = req.validated.body as Parameters<typeof headLecturersService.create>[0]
  const hl = await headLecturersService.create(data)
  const enriched = await enrichWithAuthUser(hl)
  response(res, 201, 'Head lecturer created successfully', enriched)
}

export const updateHeadLecturer = async (req: Request, res: Response): Promise<void> => {
  const { headLecturerId } = req.validated.params as { headLecturerId: string }
  const data = req.validated.body as Parameters<typeof headLecturersService.update>[1]
  const hl = await headLecturersService.update(headLecturerId, data)
  const enriched = await enrichWithAuthUser(hl)
  response(res, 200, 'Head lecturer updated successfully', enriched)
}

export const deleteHeadLecturer = async (req: Request, res: Response): Promise<void> => {
  const { headLecturerId } = req.validated.params as { headLecturerId: string }
  await headLecturersService.remove(headLecturerId)
  res.status(204).end()
}
