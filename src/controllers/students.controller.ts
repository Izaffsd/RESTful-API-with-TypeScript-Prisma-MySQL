import type { Request, Response } from 'express'
import { response } from '../utils/response.js'
import * as studentsService from '../services/students.service.js'

export const getAllStudents = async (req: Request, res: Response): Promise<void> => {
  const { page, limit } = req.query as unknown as { page: number; limit: number }
  const result = await studentsService.getAll(page, limit)
  response(res, 200, 'Students retrieved successfully', result)
}

export const getStudentById = async (req: Request, res: Response): Promise<void> => {
  const { studentId } = req.params as unknown as { studentId: number }
  const student = await studentsService.getById(studentId)
  response(res, 200, 'Student retrieved successfully', student)
}

export const createStudent = async (req: Request, res: Response): Promise<void> => {
  const student = await studentsService.create(req.body)
  response(res, 201, 'Student created successfully', student)
}

export const updateStudent = async (req: Request, res: Response): Promise<void> => {
  const { studentId } = req.params as unknown as { studentId: number }
  const student = await studentsService.update(studentId, req.body)
  response(res, 200, 'Student updated successfully', student)
}

export const deleteStudent = async (req: Request, res: Response): Promise<void> => {
  const { studentId } = req.params as unknown as { studentId: number }
  await studentsService.remove(studentId)
  response(res, 200, 'Student deleted successfully')
}
