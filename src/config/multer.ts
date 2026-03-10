import multer from 'multer'
import path from 'node:path'
import fs from 'node:fs'
import crypto from 'node:crypto'
import { AppError } from '../utils/AppError.js'

const UPLOAD_DIR = path.resolve('uploads')

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
const ALLOWED_DOCUMENT_TYPES = [...ALLOWED_IMAGE_TYPES, 'application/pdf'] as const

function getDateSubdir() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return path.join(String(y), m, d)
}

/** Upload dir: uploads/profiles/YYYY/MM/DD or uploads/documents/YYYY/MM/DD based on category (body must be parsed before file; client should send category first). */
function getUploadDir(req: Express.Request) {
  const category = (req as Express.Request & { body?: { category?: string } }).body?.category
  const subfolder = category === 'PROFILE_PICTURE' ? 'profiles' : 'documents'
  const dir = path.join(UPLOAD_DIR, subfolder, getDateSubdir())
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

const generateFilename = (_req: Express.Request, file: Express.Multer.File, cb: (err: Error | null, filename: string) => void) => {
  const ext = path.extname(file.originalname).toLowerCase()
  cb(null, `${crypto.randomUUID()}${ext}`)
}

const storage = multer.diskStorage({
  destination(req, _file, cb) {
    const dir = getUploadDir(req)
    cb(null, dir)
  },
  filename: generateFilename,
})

export const uploadDocument = multer({
  storage,
  fileFilter(_req, file, cb) {
    if (!(ALLOWED_DOCUMENT_TYPES as readonly string[]).includes(file.mimetype)) {
      return cb(new AppError('Only JPEG, PNG, WebP images and PDF files are allowed', 400, 'INVALID_FILE_TYPE_400'))
    }
    cb(null, true)
  },
  limits: { fileSize: 10 * 1024 * 1024 },
})

export const toRelativePath = (absolutePath: string): string => {
  return path.relative(path.resolve(), absolutePath).replace(/\\/g, '/')
}
