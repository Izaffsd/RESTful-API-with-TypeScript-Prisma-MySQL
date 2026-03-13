import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { env } from './env.js'
import logger from '../utils/logger.js'

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

export const connectDB = async (): Promise<void> => {
  try {
    await prisma.$connect()
    await prisma.$queryRaw`SELECT 1`
    logger.info({ msg: 'Postgres database connected successfully' })
  } catch (err) {
    logger.error({ msg: 'Postgres connection error', err })
    process.exit(1)
  }
}

export default prisma
