import { fileTypeFromBuffer } from 'file-type'
import crypto from 'node:crypto'
import type { FileCategory } from '@prisma/client'
import { supabaseAdmin } from '../config/supabase.js'
import { AppError } from './AppError.js'
import logger from './logger.js'

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const
const PROFILE_ALLOWED = ['image/jpeg', 'image/png', 'image/webp'] as const
const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

export type UploadToStorageResult = {
  path: string
  publicUrl: string | null
  mimeType: string
}

export async function uploadToStorage(buffer: Buffer, category: FileCategory): Promise<UploadToStorageResult> {
  if (buffer.byteLength > MAX_SIZE) {
    throw new AppError('File too large. Max 10MB allowed.', 400, 'FILE_TOO_LARGE_400')
  }

  const detected = await fileTypeFromBuffer(buffer)
  const allowed = ALLOWED as readonly string[]
  if (!detected || !allowed.includes(detected.mime)) {
    throw new AppError(
      'File content does not match allowed type (JPEG, PNG, WebP or PDF)',
      400,
      'INVALID_FILE_TYPE_400',
    )
  }

  if (category === 'PROFILE_PICTURE') {
    const profileAllowed = PROFILE_ALLOWED as readonly string[]
    if (!profileAllowed.includes(detected.mime)) {
      throw new AppError(
        'Profile picture must be JPEG, PNG, or WebP',
        400,
        'INVALID_FILE_TYPE_400',
      )
    }
  }

  const bucket = category === 'PROFILE_PICTURE' ? 'profiles' : 'documents'
  const folder = category === 'PROFILE_PICTURE' ? 'avatars' : 'uploads'
  const ext = detected.ext
  const filename = `${folder}/${crypto.randomUUID()}.${ext}`

  const { error } = await supabaseAdmin.storage.from(bucket).upload(filename, buffer, {
    contentType: detected.mime,
    upsert: false,
  })

  if (error) {
    logger.warn({ message: error.message, bucket, filename }, 'Supabase storage upload failed')
    throw new AppError('Upload failed. Please try again.', 500, 'UPLOAD_FAILED_500')
  }

  const publicUrl =
    bucket === 'profiles'
      ? supabaseAdmin.storage.from(bucket).getPublicUrl(filename).data.publicUrl
      : null

  return { path: filename, publicUrl, mimeType: detected.mime }
}

export async function deleteFromStorage(storagePath: string, category: FileCategory): Promise<void> {
  const bucket = category === 'PROFILE_PICTURE' ? 'profiles' : 'documents'
  const { error } = await supabaseAdmin.storage.from(bucket).remove([storagePath])
  if (error) {
    logger.warn({ message: error.message, bucket, storagePath }, 'Supabase storage delete failed')
  }
}
