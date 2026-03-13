-- Monash College Management System - Seed (PostgreSQL)
-- Run: Supabase Dashboard → SQL Editor → paste and run
-- Then run `npx prisma db seed` for users, profiles, students, lecturers, head lecturers

-- Clear existing data (child tables first due to foreign keys)
TRUNCATE TABLE documents CASCADE;
TRUNCATE TABLE students CASCADE;
TRUNCATE TABLE lecturers CASCADE;
TRUNCATE TABLE head_lecturers CASCADE;
TRUNCATE TABLE profiles CASCADE;
TRUNCATE TABLE users CASCADE;
TRUNCATE TABLE courses CASCADE;

-- ==================== COURSES (7) ====================
INSERT INTO courses (course_id, course_code, course_name, description, is_active, created_at, updated_at) VALUES
('c1111111-1111-1111-1111-111111111101', 'MC', 'Monash Foundation Year', 'Foundation programme for university entry', true, NOW(), NOW()),
('c1111111-1111-1111-1111-111111111102', 'CS', 'Computer Science', 'Bachelor of Computer Science', true, NOW(), NOW()),
('c1111111-1111-1111-1111-111111111103', 'BA', 'Business Administration', 'Bachelor of Business Administration', true, NOW(), NOW()),
('c1111111-1111-1111-1111-111111111104', 'ENG', 'Engineering', 'Bachelor of Engineering', true, NOW(), NOW()),
('c1111111-1111-1111-1111-111111111105', 'LAW', 'Law', 'Bachelor of Laws', true, NOW(), NOW()),
('c1111111-1111-1111-1111-111111111106', 'MED', 'Medicine', 'Bachelor of Medicine', true, NOW(), NOW()),
('c1111111-1111-1111-1111-111111111107', 'PSY', 'Psychology', 'Bachelor of Psychology', true, NOW(), NOW());
