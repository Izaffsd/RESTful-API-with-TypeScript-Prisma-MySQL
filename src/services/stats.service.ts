import prisma from '../config/db.js'

export const getDashboardStats = async () => {
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
    where: {
      deletedAt: null,
      OR: [
        { type: 'STUDENT', student: { isNot: null } },
        { type: 'LECTURER', lecturer: { isNot: null } },
        { type: 'HEAD_LECTURER', headLecturer: { isNot: null } },
      ],
    },
    select: {
      userId: true,
      type: true,
      name: true,
      createdAt: true,
      student: { select: { documents: { where: { deletedAt: null, category: 'PROFILE_PICTURE' }, orderBy: { createdAt: 'desc' }, take: 1, select: { fileUrl: true } } } },
      lecturer: { select: { documents: { where: { deletedAt: null, category: 'PROFILE_PICTURE' }, orderBy: { createdAt: 'desc' }, take: 1, select: { fileUrl: true } } } },
      headLecturer: { select: { documents: { where: { deletedAt: null, category: 'PROFILE_PICTURE' }, orderBy: { createdAt: 'desc' }, take: 1, select: { fileUrl: true } } } },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  })

  const recentRegistrations = recentUsers.map((u) => ({
    userId: u.userId,
    type: u.type,
    name: u.name ?? null,
    createdAt: u.createdAt,
    profilePictureUrl:
      u.student?.documents?.[0]?.fileUrl ??
      u.lecturer?.documents?.[0]?.fileUrl ??
      u.headLecturer?.documents?.[0]?.fileUrl ??
      null,
  }))

  return {
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
  }
}
