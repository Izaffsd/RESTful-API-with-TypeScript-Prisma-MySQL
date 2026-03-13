import type { Request, Response } from 'express'
import { response } from '../utils/response.js'
import { buildPagination } from '../utils/pagination.js'
import * as coursesService from '../services/courses.service.js'
import type { PaginationQuery } from '../validations/shared/paginationSchema.js'

export const getCoursesForSelect = async (_req: Request, res: Response): Promise<void> => {
  const items = await coursesService.getForSelect()
  response(res, 200, 'Courses retrieved successfully', items)
}

export const getAllCourses = async (req: Request, res: Response): Promise<void> => {
  const { page, limit } = req.validated.query as PaginationQuery
  const { items, total } = await coursesService.getAll(page, limit)
  const { meta, links } = buildPagination(req, page, limit, total)
  response(res, 200, 'Courses retrieved successfully', items, null, [], meta, links)
}

export const getCourseById = async (req: Request, res: Response): Promise<void> => {
  const { courseId } = req.validated.params as { courseId: string }
  const course = await coursesService.getById(courseId)
  response(res, 200, 'Course retrieved successfully', course)
}

export const createCourse = async (req: Request, res: Response): Promise<void> => {
  const data = req.validated.body as Parameters<typeof coursesService.create>[0]
  const course = await coursesService.create(data)
  response(res, 201, 'Course created successfully', course)
}

export const updateCourse = async (req: Request, res: Response): Promise<void> => {
  const { courseId } = req.validated.params as { courseId: string }
  const data = req.validated.body as Parameters<typeof coursesService.update>[1]
  const course = await coursesService.update(courseId, data)
  response(res, 200, 'Course updated successfully', course)
}

export const deleteCourse = async (req: Request, res: Response): Promise<void> => {
  const { courseId } = req.validated.params as { courseId: string }
  await coursesService.remove(courseId)
  res.status(204).end()
}
