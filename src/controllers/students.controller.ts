import type { Request, Response, NextFunction } from 'express'
import { response } from '../utils/response.js'
import * as studentsService from '../services/students.service.js'

export const getAllStudents = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const students = await studentsService.getAll()
    response(res, 200, 'Students retrieved successfully', students)
  } catch (err) {
    next(err)
  }
}

export const getStudentById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { studentId } = req.params as unknown as { studentId: number }
    const student = await studentsService.getById(studentId)
    response(res, 200, 'Student retrieved successfully', student)
  } catch (err) {
    next(err)
  }
}

export const createStudent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const student = await studentsService.create(req.body)
    response(res, 201, 'Student created successfully', student)
  } catch (err) {
    next(err)
  }
}

export const updateStudent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { studentId } = req.params as unknown as { studentId: number }
    const student = await studentsService.update(studentId, req.body)
    response(res, 200, 'Student updated successfully', student)
  } catch (err) {
    next(err)
  }
}

export const deleteStudent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { studentId } = req.params as unknown as { studentId: number }
    await studentsService.remove(studentId)
    response(res, 200, 'Student deleted successfully')
  } catch (err) {
    next(err)
  }
}
