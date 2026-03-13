import type { Request, Response } from 'express'
import { response } from '../utils/response.js'
import prisma from '../config/db.js'
import { supabaseAdmin } from '../config/supabase.js'

export const getEnums = async (_req: Request, res: Response): Promise<void> => {
  response(res, 200, 'Enums retrieved successfully', {
    genders: ['Male', 'Female'],
    races: ['Malay', 'Chinese', 'Indian', 'Others'],
    states: [
      'Johor', 'Kedah', 'Kelantan', 'Melaka', 'NegeriSembilan', 'Pahang',
      'Perak', 'Perlis', 'PulauPinang', 'Sabah', 'Sarawak', 'Selangor',
      'Terengganu', 'KualaLumpur', 'Labuan', 'Putrajaya',
    ],
    fileCategories: ['PROFILE_PICTURE', 'IC', 'TRANSCRIPT', 'DOCUMENT', 'OTHER'],
    userStatuses: ['ACTIVE', 'INACTIVE', 'SUSPENDED'],
    userTypes: ['STUDENT', 'LECTURER', 'HEAD_LECTURER'],
  })
}

export const getStats = async (_req: Request, res: Response): Promise<void> => {
  const [totalStudents, totalLecturers, totalHeadLecturers, totalCourses, activeUsers] = await Promise.all([
    prisma.student.count({ where: { user: { deletedAt: null } } }),
    prisma.lecturer.count({ where: { user: { deletedAt: null } } }),
    prisma.headLecturer.count({ where: { user: { deletedAt: null } } }),
    prisma.course.count(),
    prisma.user.count({ where: { status: 'ACTIVE', deletedAt: null } }),
  ])

  const studentsByCourse = await prisma.course.findMany({
    select: {
      courseCode: true,
      courseName: true,
      _count: { select: { students: true } },
    },
    orderBy: { courseCode: 'asc' },
  })

  const recentUsers = await prisma.user.findMany({
    where: { deletedAt: null },
    select: {
      userId: true,
      type: true,
      createdAt: true,
      student: { select: { documents: { where: { deletedAt: null, category: 'PROFILE_PICTURE' }, orderBy: { createdAt: 'desc' }, take: 1, select: { fileUrl: true } } } },
      lecturer: { select: { documents: { where: { deletedAt: null, category: 'PROFILE_PICTURE' }, orderBy: { createdAt: 'desc' }, take: 1, select: { fileUrl: true } } } },
      headLecturer: { select: { documents: { where: { deletedAt: null, category: 'PROFILE_PICTURE' }, orderBy: { createdAt: 'desc' }, take: 1, select: { fileUrl: true } } } },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  })

  const recentRegistrations = await Promise.all(
    recentUsers.map(async (u) => {
      const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(u.userId)
      return {
        userId: u.userId,
        type: u.type,
        name: (authUser?.user_metadata?.name as string) ?? null,
        createdAt: u.createdAt,
        profilePictureUrl: u.student?.documents?.[0]?.fileUrl ?? u.lecturer?.documents?.[0]?.fileUrl ?? u.headLecturer?.documents?.[0]?.fileUrl ?? null,
      }
    }),
  )

  response(res, 200, 'Stats retrieved successfully', {
    totalStudents,
    totalLecturers,
    totalHeadLecturers,
    totalCourses,
    activeUsers,
    studentsByCourse: studentsByCourse.map((c) => ({
      courseCode: c.courseCode,
      courseName: c.courseName,
      total: c._count.students,
    })),
    recentRegistrations,
  })
}
