import type { Request, Response } from 'express'
import { response } from '../utils/response.js'
import { buildPagination } from '../utils/pagination.js'
import * as studentsService from '../services/students.service.js'
import { serializeWithDocuments } from '../services/documents.service.js'
import type { studentQuerySchema } from '../validations/studentValidation.js'
import type { z } from 'zod'

type StudentQuery = z.infer<typeof studentQuerySchema>

export const getAllStudents = async (req: Request, res: Response): Promise<void> => {
  const { page, limit, ...filters } = req.validated.query as StudentQuery
  const { items, total } = await studentsService.getAll(page, limit, filters)
  const serialized = items.map(serializeWithDocuments)
  const { meta, links } = buildPagination(req, page, limit, total)
  response(res, 200, 'Students retrieved successfully', serialized, null, [], meta, links)
}

export const getStudentById = async (req: Request, res: Response): Promise<void> => {
  const { studentId } = req.validated.params as { studentId: string }
  const student = await studentsService.getById(studentId)
  response(res, 200, 'Student retrieved successfully', serializeWithDocuments(student))
}

export const createStudent = async (req: Request, res: Response): Promise<void> => {
  const data = req.validated.body as Parameters<typeof studentsService.create>[0]
  const student = await studentsService.create(data)
  response(res, 201, 'Student created successfully', student)
}

export const updateStudent = async (req: Request, res: Response): Promise<void> => {
  const { studentId } = req.validated.params as { studentId: string }
  const data = req.validated.body as Parameters<typeof studentsService.update>[1]
  const student = await studentsService.update(studentId, data)
  response(res, 200, 'Student updated successfully', student)
}

export const deleteStudent = async (req: Request, res: Response): Promise<void> => {
  const { studentId } = req.validated.params as { studentId: string }
  await studentsService.remove(studentId)
  res.status(204).end()
}
