import type { Document, EntityType, FileCategory } from '@prisma/client'
import prisma from '../config/db.js'
import { supabaseAdmin } from '../config/supabase.js'
import { AppError } from '../utils/AppError.js'
import { uploadToStorage, deleteFromStorage } from '../utils/storage.js'
import logger from '../utils/logger.js'
import { getCachedSignedUrl } from '../redis/signedUrlCache.js'

const SIGNED_URL_TTL_SEC = 3600

/** BigInt fileSize → number for JSON */
function plainFileSize(doc: { fileSize?: bigint; [k: string]: unknown }) {
  return doc.fileSize != null ? Number(doc.fileSize) : doc.fileSize
}

/** Resolves `fileUrl`: profile public URL, or signed URL for private `documents` bucket. */
export async function serializeDocument(doc: Document): Promise<Record<string, unknown>> {
  const base: Record<string, unknown> = { ...doc, fileSize: plainFileSize(doc) }

  if (doc.category === 'PROFILE_PICTURE') {
    return { ...base, fileUrl: doc.fileUrl }
  }

  const signedUrl = await getCachedSignedUrl('documents', doc.filePath, SIGNED_URL_TTL_SEC, async () => {
    const { data, error } = await supabaseAdmin.storage
      .from('documents')
      .createSignedUrl(doc.filePath, SIGNED_URL_TTL_SEC)
    if (error || !data?.signedUrl) {
      logger.warn({ err: error?.message, path: doc.filePath }, 'createSignedUrl failed')
      return null
    }
    return data.signedUrl
  })

  if (signedUrl) {
    return { ...base, fileUrl: signedUrl }
  }

  return { ...base, fileUrl: '' }
}

export async function serializeWithDocuments<T extends { documents?: unknown[] }>(item: T): Promise<T> {
  if (!item.documents?.length) {
    return item
  }
  const docs = await Promise.all(
    item.documents.map((d) => serializeDocument(d as Document)),
  )
  return { ...item, documents: docs }
}

export const createDocument = async (
  file: Express.Multer.File,
  opts: {
    entityId: string
    entityType: EntityType | string
    category: FileCategory | string
    relationField: string
    relationId: string
  },
) => {
  const buf = file.buffer
  if (!buf || !Buffer.isBuffer(buf)) {
    throw new AppError('Invalid upload', 400, 'NO_FILE_400')
  }
  const buffer = buf

  const category = opts.category as FileCategory

  if (category === 'PROFILE_PICTURE') {
    const existing = await prisma.document.findMany({
      where: {
        entityId: opts.entityId,
        entityType: opts.entityType as EntityType,
        category: 'PROFILE_PICTURE',
        deletedAt: null,
      },
    })
    for (const d of existing) {
      await removeStoredFile(d)
      await softDeleteDocument(d.documentId)
    }
  }

  const { path: storagePath, publicUrl, mimeType } = await uploadToStorage(buffer, category)
  const fileName = storagePath.split('/').pop() ?? storagePath
  const fileUrl = publicUrl ?? ''

  return prisma.document.create({
    data: {
      entityId: opts.entityId,
      entityType: opts.entityType as EntityType,
      fileName,
      originalName: file.originalname,
      mimeType,
      fileSize: BigInt(buffer.length),
      filePath: storagePath,
      fileUrl,
      category,
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

/** Remove file from Supabase storage (object keys may look like `uploads/...` inside the documents bucket). */
export async function removeStoredFile(doc: Pick<Document, 'filePath' | 'category'>): Promise<void> {
  await deleteFromStorage(doc.filePath, doc.category)
}
