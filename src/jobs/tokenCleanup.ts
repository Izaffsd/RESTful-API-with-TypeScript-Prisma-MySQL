import cron from 'node-cron'
import prisma from '../config/db.js'
import logger from '../utils/logger.js'

export const startTokenCleanup = () => {
  cron.schedule('0 3 * * *', async () => {
    try {
      const result = await prisma.tokenBlacklist.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      })
      if (result.count > 0) {
        logger.info(`Token cleanup: removed ${result.count} expired blacklisted tokens`)
      }
    } catch (err) {
      logger.error({ message: 'Token cleanup failed', err })
    }
  })
  logger.info('Token cleanup cron job scheduled (daily at 03:00)')
}
