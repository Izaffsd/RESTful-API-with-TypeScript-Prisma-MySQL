/**
 * Single seed: truncates app tables, inserts 7 courses, creates Supabase Auth user + head lecturer.
 *
 * Requires: DIRECT_URL or DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_KEY
 * Optional: SEED_HEAD_EMAIL (default muhdiskandaraffi99@gmail.com), SEED_HEAD_PASSWORD (default SeedHeadLecturer123!)
 */
import 'dotenv/config'
import pg from 'pg'
import { createClient } from '@supabase/supabase-js'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const SEED_STAFF_NUMBER = 'HLSEED01'

const COURSES = [
  {
    courseId: 'c1111111-1111-1111-1111-111111111101',
    courseCode: 'MC',
    courseName: 'Monash Foundation Year',
    description: 'Foundation programme for university entry',
  },
  {
    courseId: 'c1111111-1111-1111-1111-111111111102',
    courseCode: 'CS',
    courseName: 'Computer Science',
    description: 'Bachelor of Computer Science',
  },
  {
    courseId: 'c1111111-1111-1111-1111-111111111103',
    courseCode: 'BA',
    courseName: 'Business Administration',
    description: 'Bachelor of Business Administration',
  },
  {
    courseId: 'c1111111-1111-1111-1111-111111111104',
    courseCode: 'ENG',
    courseName: 'Engineering',
    description: 'Bachelor of Engineering',
  },
  {
    courseId: 'c1111111-1111-1111-1111-111111111105',
    courseCode: 'LAW',
    courseName: 'Law',
    description: 'Bachelor of Laws',
  },
  {
    courseId: 'c1111111-1111-1111-1111-111111111106',
    courseCode: 'MED',
    courseName: 'Medicine',
    description: 'Bachelor of Medicine',
  },
  {
    courseId: 'c1111111-1111-1111-1111-111111111107',
    courseCode: 'PSY',
    courseName: 'Psychology',
    description: 'Bachelor of Psychology',
  },
] as const

const supabaseUrl = process.env.SUPABASE_URL?.trim()
const serviceKey = process.env.SUPABASE_SERVICE_KEY?.trim()
const email = (process.env.SEED_HEAD_EMAIL ?? 'muhdiskandaraffi99@gmail.com').trim().toLowerCase()
const password = process.env.SEED_HEAD_PASSWORD ?? 'SeedHeadLecturer123!'

const connectionString =
  process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim()

if (!connectionString) {
  console.error('DIRECT_URL or DATABASE_URL is required')
  process.exit(1)
}
if (!supabaseUrl || !serviceKey) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_KEY are required')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const pool = new pg.Pool({ connectionString })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

async function deleteAuthUserByEmail(target: string): Promise<void> {
  const perPage = 200
  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error) throw error
    const found = data.users.find((u) => u.email?.toLowerCase() === target)
    if (found) {
      const { error: delErr } = await supabase.auth.admin.deleteUser(found.id)
      if (delErr) throw delErr
      console.log('Removed existing Auth user for', target)
      return
    }
    if (data.users.length < perPage) break
  }
}

async function main(): Promise<void> {
  await deleteAuthUserByEmail(email)

  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: 'Seed Head Lecturer' },
  })

  if (createErr || !created.user) {
    console.error('createUser failed:', createErr?.message ?? 'no user')
    process.exit(1)
  }

  const uid = created.user.id

  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      'TRUNCATE TABLE documents, students, lecturers, head_lecturers, profiles, users, courses CASCADE;',
    )

    for (const c of COURSES) {
      await tx.course.create({
        data: {
          courseId: c.courseId,
          courseCode: c.courseCode,
          courseName: c.courseName,
          description: c.description,
          isActive: true,
        },
      })
    }

    await tx.user.create({
      data: {
        userId: uid,
        type: 'HEAD_LECTURER',
        status: 'ACTIVE',
        name: 'Seed Head Lecturer',
        passwordSignupAt: new Date(),
      },
    })

    await tx.headLecturer.create({
      data: {
        staffNumber: SEED_STAFF_NUMBER,
        userId: uid,
      },
    })
  })

  console.log('Seed complete: 7 courses + head lecturer (Supabase Auth linked).')
  console.log(`  Email: ${email}`)
  console.log('  Password: SEED_HEAD_PASSWORD or default SeedHeadLecturer123!')
  console.log('  Login: POST /api/v1/auth/login')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
