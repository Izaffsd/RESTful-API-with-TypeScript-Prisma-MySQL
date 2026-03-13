import { env } from './config/env.js'
import app from './app.js'
import prisma, { connectDB } from './config/db.js'
import logger from './utils/logger.js'

await connectDB()

const server = app.listen(env.PORT, () => {
  logger.info(`Server is running on port ${env.PORT}`)
})

const shutdown = async (signal: string) => {
  logger.info(`${signal} received — shutting down gracefully`)
  server.close(async () => {
    await prisma.$disconnect()
    logger.info('Database disconnected, server closed')
    process.exit(0)
  })
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
