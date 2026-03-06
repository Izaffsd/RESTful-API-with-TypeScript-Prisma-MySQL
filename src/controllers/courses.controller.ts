import type { Request, Response } from 'express'
import { response } from '../utils/response.js'
import * as coursesService from '../services/courses.service.js'

export const getAllCourses = async (req: Request, res: Response): Promise<void> => {
  const { page, limit } = req.query as unknown as { page: number; limit: number }
  const result = await coursesService.getAll(page, limit)
  response(res, 200, 'Courses retrieved successfully', result)
}

export const getCourseByCode = async (req: Request, res: Response): Promise<void> => {
  const courseCode = req.params.courseCode as string
  const course = await coursesService.getByCode(courseCode)
  response(res, 200, 'Course retrieved successfully', course)
}

export const createCourse = async (req: Request, res: Response): Promise<void> => {
  const course = await coursesService.create(req.body)
  response(res, 201, 'Course created successfully', course)
}

export const updateCourse = async (req: Request, res: Response): Promise<void> => {
  const courseCode = req.params.courseCode as string
  const existing = await coursesService.getByCode(courseCode)
  const course = await coursesService.update(existing.courseId, req.body)
  response(res, 200, 'Course updated successfully', course)
}

export const deleteCourse = async (req: Request, res: Response): Promise<void> => {
  const { courseId } = req.params as unknown as { courseId: number }
  await coursesService.remove(courseId)
  response(res, 200, 'Course deleted successfully')
}
