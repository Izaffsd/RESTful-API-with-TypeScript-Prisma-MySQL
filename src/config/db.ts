import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { env } from './env.js'
import logger from '../utils/logger.js'

const adapter = new PrismaMariaDb({
  host: env.DB_HOST,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
})
const prisma = new PrismaClient({ adapter })

export const connectDB = async (): Promise<void> => {
  try {
    await prisma.$connect()
    await prisma.$queryRaw`SELECT 1`
    logger.info('MySQL database connected successfully')
  } catch (err) {
    logger.error({ message: 'MySQL connection error', err })
    process.exit(1)
  }
}

export default prisma
