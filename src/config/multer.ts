/**
 * File upload config: profile pictures and documents.
 * Saves to uploads/profiles/ or uploads/documents/ (client sends `category`: PROFILE_PICTURE or else).
 *
 * Flow: Multer saves file → validateFileType reads bytes and checks magic numbers → reject + delete if wrong.
 */

import type { Request, Response, NextFunction } from 'express'
import multer from 'multer'
import path from 'node:path'
import fs from 'node:fs'
import crypto from 'node:crypto'
import { fileTypeFromFile } from 'file-type'
import { AppError } from '../utils/AppError.js'

const UPLOAD_DIR = path.resolve('uploads')
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const
const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

const diskStorage = multer.diskStorage({
  destination(req, _file, cb) {
    const category = (req as Request & { body?: { category?: string } }).body?.category
    const dir = path.join(UPLOAD_DIR, category === 'PROFILE_PICTURE' ? 'profiles' : 'documents')
    fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, `${crypto.randomUUID()}${ext}`)
  },
})

export const uploadDocument = multer({
  storage: diskStorage,
  limits: { fileSize: MAX_SIZE },
  fileFilter(_req, file, cb) {
    if (!(ALLOWED as readonly string[]).includes(file.mimetype)) {
      return cb(new AppError('Only JPEG, PNG, WebP and PDF allowed', 400, 'INVALID_FILE_TYPE_400'))
    }
    cb(null, true)
  },
})

/**
 * Run after uploadDocument.single('file'). Reads the saved file's bytes and checks magic numbers.
 * If the real type is not allowed, deletes the file and throws.
 */
export function validateFileType(req: Request, _res: Response, next: NextFunction): void {
  if (!req.file) {
    return next()
  }
  const filePath = req.file.path
  fileTypeFromFile(filePath)
    .then((detected) => {
      const allowed = ALLOWED as readonly string[]
      if (!detected || !allowed.includes(detected.mime)) {
        try {
          fs.unlinkSync(filePath)
        } catch {
          /* ignore unlink error */
        }
        return next(
          new AppError('File content does not match allowed type (JPEG, PNG, WebP or PDF)', 400, 'INVALID_FILE_TYPE_400')
        )
      }
      next()
    })
    .catch(next)
}

export function toRelativePath(absolutePath: string): string {
  return path.relative(path.resolve(), absolutePath).replace(/\\/g, '/')
}
