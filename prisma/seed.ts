/// <reference types="node" />
/**
 * Monash College Management System - Dummy Data Seed (2 of each)
 * Creates users via Supabase Auth, then profiles, students, lecturers, head lecturers.
 * Password for all users: Password123!
 *
 * Run: npx prisma db seed
 * Prerequisites: Run seed.sql in Supabase first (courses must exist)
 */

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const DATABASE_URL = process.env.DATABASE_URL
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const PASSWORD = 'Password123!'

if (!DATABASE_URL || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('DATABASE_URL, SUPABASE_URL and SUPABASE_SERVICE_KEY are required')
  process.exit(1)
}

const adapter = new PrismaPg({ connectionString: DATABASE_URL })
const prisma = new PrismaClient({ adapter })

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const courseIds = {
  MC: 'c1111111-1111-1111-1111-111111111101',
  CS: 'c1111111-1111-1111-1111-111111111102',
} as const

const users = [
  { email: 'hl1@monash.edu.my', name: 'Dr. Ahmad Rahman', type: 'HEAD_LECTURER' as const },
  { email: 'hl2@monash.edu.my', name: 'Dr. Siti Aminah', type: 'HEAD_LECTURER' as const },
  { email: 'lecturer1@monash.edu.my', name: 'Mr. Raj Kumar', type: 'LECTURER' as const },
  { email: 'lecturer2@monash.edu.my', name: 'Ms. Tan Mei Ling', type: 'LECTURER' as const },
  { email: 'student1@student.monash.edu.my', name: 'Lim Wei Jie', type: 'STUDENT' as const },
  { email: 'student2@student.monash.edu.my', name: 'Nurul Izzati', type: 'STUDENT' as const },
]

const profiles = [
  { phone: '+60123456789', gender: 'Male' as const, race: 'Malay' as const, dob: '1975-03-15', streetOne: 'Jalan Universiti', streetTwo: null, postcode: '47500', city: 'Petaling Jaya', state: 'Selangor' as const },
  { phone: '+60198765432', gender: 'Female' as const, race: 'Malay' as const, dob: '1985-07-22', streetOne: 'Jalan SS2', streetTwo: 'Apt 5B', postcode: '47300', city: 'Petaling Jaya', state: 'Selangor' as const },
  { phone: '+60187654321', gender: 'Male' as const, race: 'Indian' as const, dob: '1982-11-08', streetOne: 'Jalan Bukit Bintang', streetTwo: null, postcode: '50250', city: 'Kuala Lumpur', state: 'KualaLumpur' as const },
  { phone: '+60176543219', gender: 'Female' as const, race: 'Chinese' as const, dob: '1988-03-15', streetOne: 'Jalan Utara', streetTwo: null, postcode: '46200', city: 'Petaling Jaya', state: 'Selangor' as const },
  { phone: '+60176543210', gender: 'Male' as const, race: 'Chinese' as const, dob: '2005-08-11', streetOne: 'Jalan PJ', streetTwo: null, postcode: '46000', city: 'Petaling Jaya', state: 'Selangor' as const },
  { phone: '+60165432109', gender: 'Female' as const, race: 'Malay' as const, dob: '2004-12-03', streetOne: 'Jalan Damansara', streetTwo: 'Blok C', postcode: '47400', city: 'Petaling Jaya', state: 'Selangor' as const },
]

const studentsData = [
  { studentNumber: 'MC24001', mykad: '050811140847', course: 'MC' as const },
  { studentNumber: 'MC24002', mykad: '041203085432', course: 'MC' as const },
]

const lecturersData = [
  { staffNumber: 'LEC001', mykad: '821108098765', course: 'CS' as const },
  { staffNumber: 'LEC002', mykad: '880315134567', course: 'MC' as const },
]

const headLecturersData = [
  { staffNumber: 'HL001', mykad: '750315123456' },
  { staffNumber: 'HL002', mykad: '850722145678' },
]

async function main() {
  const courseCount = await prisma.course.count()
  if (courseCount === 0) {
    console.error('No courses found. Run seed.sql in Supabase first.')
    process.exit(1)
  }

  console.log('Creating 6 users in Supabase Auth...')
  const userIds: string[] = []
  for (const u of users) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: u.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { name: u.name },
    })
    if (error) {
      if (error.message?.toLowerCase().includes('already') || error.message?.toLowerCase().includes('registered')) {
        const { data: list } = await supabaseAdmin.auth.admin.listUsers()
        const found = list?.users?.find((x) => x.email === u.email)
        if (found) userIds.push(found.id)
        else throw error
      } else throw error
    } else if (data.user) {
      userIds.push(data.user.id)
    }
  }

  await new Promise((r) => setTimeout(r, 500))

  console.log('Ensuring public.users rows exist...')
  for (let i = 0; i < userIds.length; i++) {
    await prisma.user.upsert({
      where: { userId: userIds[i] },
      create: { userId: userIds[i], type: users[i].type },
      update: { type: users[i].type },
    })
  }

  console.log('Creating profiles...')
  for (let i = 0; i < userIds.length; i++) {
    const p = profiles[i]
    await prisma.profile.upsert({
      where: { userId: userIds[i] },
      create: {
        userId: userIds[i],
        phoneNumber: p.phone,
        gender: p.gender,
        race: p.race,
        dateOfBirth: new Date(p.dob),
        streetOne: p.streetOne,
        streetTwo: p.streetTwo,
        postcode: p.postcode,
        city: p.city,
        state: p.state,
      },
      update: {},
    })
  }

  console.log('Creating 2 students...')
  for (let i = 0; i < studentsData.length; i++) {
    const s = studentsData[i]
    await prisma.student.upsert({
      where: { userId: userIds[4 + i] },
      create: {
        studentNumber: s.studentNumber,
        mykadNumber: s.mykad,
        courseId: courseIds[s.course],
        userId: userIds[4 + i],
      },
      update: {},
    })
  }

  console.log('Creating 2 lecturers...')
  for (let i = 0; i < lecturersData.length; i++) {
    const l = lecturersData[i]
    await prisma.lecturer.upsert({
      where: { userId: userIds[2 + i] },
      create: {
        staffNumber: l.staffNumber,
        mykadNumber: l.mykad,
        courseId: courseIds[l.course],
        userId: userIds[2 + i],
      },
      update: {},
    })
  }

  console.log('Creating 2 head lecturers...')
  for (let i = 0; i < headLecturersData.length; i++) {
    const h = headLecturersData[i]
    await prisma.headLecturer.upsert({
      where: { userId: userIds[i] },
      create: {
        staffNumber: h.staffNumber,
        mykadNumber: h.mykad,
        userId: userIds[i],
      },
      update: {},
    })
  }

  console.log('Done. Password for all: Password123!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
