import type { Request } from 'express'
import prisma from '../config/db.js'
import { AppError } from '../utils/AppError.js'
import { toRelativePath } from '../config/multer.js'
import type { EntityType, FileCategory } from '@prisma/client'
import fs from 'node:fs/promises'
import path from 'node:path'

/** Serialize document for JSON (BigInt fileSize is not JSON-safe) */
export const serializeDocument = (doc: { fileSize?: bigint; [k: string]: unknown }) =>
  doc ? { ...doc, fileSize: doc.fileSize != null ? Number(doc.fileSize) : doc.fileSize } : doc

/** Serialize any entity that may include a `documents` array with BigInt fileSize values */
export const serializeWithDocuments = <T extends { documents?: unknown[] }>(item: T): T =>
  item.documents
    ? { ...item, documents: item.documents.map((d) => serializeDocument(d as { fileSize?: bigint; [k: string]: unknown })) }
    : item

const buildFileUrl = (req: Request, relativePath: string) =>
  `${req.protocol}://${req.get('host')}/${relativePath}`

export const createDocument = async (
  req: Request,
  file: Express.Multer.File,
  opts: {
    entityId: string
    entityType: EntityType | string
    category: FileCategory | string
    relationField: string
    relationId: string
  },
) => {
  const relativePath = toRelativePath(file.path)
  const fileUrl = buildFileUrl(req, relativePath)

  return prisma.document.create({
    data: {
      entityId: opts.entityId,
      entityType: opts.entityType as EntityType,
      fileName: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      fileSize: BigInt(file.size),
      filePath: relativePath,
      fileUrl,
      category: opts.category as FileCategory,
      [opts.relationField]: opts.relationId,
    },
  })
}

export const getDocumentsByEntity = async (entityId: string, entityType: EntityType | string) => {
  return prisma.document.findMany({
    where: { entityId, entityType: entityType as EntityType, deletedAt: null },
    orderBy: { createdAt: 'desc' },
  })
}

export const getDocumentById = async (documentId: string) => {
  const doc = await prisma.document.findUnique({ where: { documentId } })
  if (!doc || doc.deletedAt) {
    throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND_404')
  }
  return doc
}

export const softDeleteDocument = async (documentId: string) => {
  return prisma.document.update({
    where: { documentId },
    data: { deletedAt: new Date() },
  })
}

export const deleteFileFromDisk = async (filePath: string) => {
  try {
    await fs.unlink(path.resolve(filePath))
  } catch {
    // file already removed
  }
}
