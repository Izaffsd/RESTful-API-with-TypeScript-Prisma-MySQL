/**
 * Memory-only uploads. Real type checks run in `uploadToStorage` via magic bytes.
 */

import multer from 'multer'

const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE },
})
