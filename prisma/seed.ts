/**
 * Prisma seed entrypoint.
 *
 * This keeps `package.json -> prisma.seed` working and runs the SQL seed that
 * already exists at `prisma/seed/seed.sql`.
 *
 * Run: `npm run db:seed` or `npx prisma db seed`
 */

import fs from 'node:fs'
import path from 'node:path'
import 'dotenv/config'
import pg from 'pg'

const { Client } = pg

const DIRECT_URL = process.env.DIRECT_URL
const DATABASE_URL = process.env.DATABASE_URL
const CONNECTION_STRING = DIRECT_URL || DATABASE_URL

if (!CONNECTION_STRING) {
  console.error('DIRECT_URL (preferred) or DATABASE_URL is required to seed')
  process.exit(1)
}

const seedSqlPath = path.resolve('prisma', 'seed', 'seed.sql')
if (!fs.existsSync(seedSqlPath)) {
  console.error(`Seed SQL not found at ${seedSqlPath}`)
  process.exit(1)
}

function splitSqlStatements(sql: string): string[] {
  // Simple splitter suitable for our seed.sql (no semicolons inside strings).
  return sql
    .split(/;\s*$/m)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => (s.endsWith(';') ? s : `${s};`))
}

async function main(): Promise<void> {
  const sql = fs.readFileSync(seedSqlPath, 'utf8')
  const statements = splitSqlStatements(sql)

  const client = new Client({ connectionString: CONNECTION_STRING })
  await client.connect()

  try {
    await client.query('BEGIN')
    for (const stmt of statements) {
      // Skip pure comments
      if (/^--/m.test(stmt) && stmt.replace(/--.*$/gm, '').trim().length === 0) continue
      await client.query(stmt)
    }
    await client.query('COMMIT')
    console.log('SQL seed applied successfully.')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error('Seeding failed:', err)
  process.exit(1)
})

