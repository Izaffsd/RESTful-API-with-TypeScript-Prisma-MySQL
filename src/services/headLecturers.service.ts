import prisma from '../config/db.js'
import { AppError } from '../utils/AppError.js'
import { handlePrismaError } from '../utils/prismaErrors.js'
import { createEntityAccount } from './createEntityAccount.js'

const headLecturerInclude = {
  user: { select: { userId: true, status: true } },
} as const

export const getAll = async (page: number, limit: number) => {
  const skip = (page - 1) * limit
  const where = { user: { deletedAt: null } }
  const [items, total] = await Promise.all([
    prisma.headLecturer.findMany({
      where,
      include: {
        ...headLecturerInclude,
        documents: { where: { deletedAt: null, category: 'PROFILE_PICTURE' }, orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.headLecturer.count({ where }),
  ])
  return { items, total }
}

export const getById = async (headLecturerId: string) => {
  const hl = await prisma.headLecturer.findUnique({
    where: { headLecturerId },
    include: { ...headLecturerInclude, documents: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } } },
  })
  if (!hl) throw new AppError('Head lecturer not found', 404, 'HEAD_LECTURER_NOT_FOUND_404')
  return hl
}

export const create = async (data: {
  staffNumber: string
  name: string
  email: string
  password: string
  mykadNumber?: string
}) => {
  const { authUserId } = await createEntityAccount({
    email: data.email,
    password: data.password,
    name: data.name,
    userType: 'HEAD_LECTURER',
  })

  try {
    const headLecturer = await prisma.headLecturer.create({
      data: {
        staffNumber: data.staffNumber,
        mykadNumber: data.mykadNumber ?? null,
        userId: authUserId,
      },
      include: headLecturerInclude,
    })
    return headLecturer
  } catch (err) {
    return handlePrismaError(err, 'Head Lecturer')
  }
}

export const update = async (headLecturerId: string, data: {
  name?: string
  mykadNumber?: string | null
}) => {
  const hl = await getById(headLecturerId)

  const updateData: Record<string, unknown> = {}
  if (data.mykadNumber !== undefined) updateData.mykadNumber = data.mykadNumber

  try {
    if (data.name) {
      await prisma.user.update({
        where: { userId: hl.user.userId },
        data: { name: data.name },
      })
    }
    return await prisma.headLecturer.update({ where: { headLecturerId }, data: updateData, include: headLecturerInclude })
  } catch (err) {
    return handlePrismaError(err, 'Head Lecturer')
  }
}

export const remove = async (headLecturerId: string) => {
  const hl = await getById(headLecturerId)
  try {
    await prisma.user.update({ where: { userId: hl.user.userId }, data: { deletedAt: new Date() } })
  } catch (err) {
    return handlePrismaError(err, 'Head Lecturer')
  }
}
