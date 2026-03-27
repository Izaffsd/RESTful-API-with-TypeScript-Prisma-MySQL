import type { Request, Response } from 'express'
import { response } from '../utils/response.js'
import { buildPagination } from '../utils/pagination.js'
import * as studentsService from '../services/students.service.js'
import { serializeWithDocuments } from '../services/documents.service.js'
import { enrichWithAuthUser, enrichWithAuthUsers } from '../utils/enrichAuthUser.js'
import type { studentQuerySchema } from '../validations/studentValidation.js'
import type { z } from 'zod'

type StudentQuery = z.infer<typeof studentQuerySchema>

export const getAllStudents = async (req: Request, res: Response): Promise<void> => {
  const { page, limit, ...filters } = req.validated.query as StudentQuery
  const { items, total } = await studentsService.getAll(page, limit, filters)
  const enriched = await enrichWithAuthUsers(items)
  const serialized = await Promise.all(
    enriched.map((item) => serializeWithDocuments(item as { documents?: unknown[] })),
  )
  const { meta, links } = buildPagination(req, page, limit, total)
  response(res, 200, 'Students retrieved successfully', serialized, null, [], meta, links)
}

export const getStudentById = async (req: Request, res: Response): Promise<void> => {
  const { studentId } = req.validated.params as { studentId: string }
  const student = await studentsService.getById(studentId)
  const enriched = await enrichWithAuthUser(student)
  response(res, 200, 'Student retrieved successfully', await serializeWithDocuments(enriched))
}

export const createStudent = async (req: Request, res: Response): Promise<void> => {
  const data = req.validated.body as Parameters<typeof studentsService.create>[0]
  const student = await studentsService.create(data)
  const enriched = await enrichWithAuthUser(student)
  response(res, 201, 'Student created successfully', enriched)
}

export const updateStudent = async (req: Request, res: Response): Promise<void> => {
  const { studentId } = req.validated.params as { studentId: string }
  const data = req.validated.body as Parameters<typeof studentsService.update>[1]
  const student = await studentsService.update(studentId, data)
  const enriched = await enrichWithAuthUser(student)
  response(res, 200, 'Student updated successfully', enriched)
}

export const deleteStudent = async (req: Request, res: Response): Promise<void> => {
  const { studentId } = req.validated.params as { studentId: string }
  await studentsService.remove(studentId)
  res.status(204).end()
}
