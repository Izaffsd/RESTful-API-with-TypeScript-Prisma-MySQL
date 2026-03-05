import type { Request, Response, NextFunction } from 'express'
import { response } from '../utils/response.js'
import * as coursesService from '../services/courses.service.js'

export const getAllCourses = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const courses = await coursesService.getAll()
    response(res, 200, 'Courses retrieved successfully', courses)
  } catch (err) {
    next(err)
  }
}

export const getCourseByCode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { courseCode } = req.params as unknown as { courseCode: string }
    const course = await coursesService.getByCode(courseCode)
    response(res, 200, 'Course retrieved successfully', course)
  } catch (err) {
    next(err)
  }
}

export const createCourse = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const course = await coursesService.create(req.body)
    response(res, 201, 'Course created successfully', course)
  } catch (err) {
    next(err)
  }
};

export const updateCourse = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { courseCode } = req.params as unknown as { courseCode: string };
    const existing = await coursesService.getByCode(courseCode);
    const course = await coursesService.update(existing.courseId, req.body);
    response(res, 200, 'Course updated successfully', course);
  } catch (err) {
    next(err);
  }
};

export const deleteCourse = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { courseId } = req.params as unknown as { courseId: number };
    await coursesService.remove(courseId);
    response(res, 200, 'Course deleted successfully');
  } catch (err) {
    next(err);
  }
};
