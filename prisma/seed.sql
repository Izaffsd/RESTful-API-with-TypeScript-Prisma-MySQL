-- Monash College Management System - Dummy Data Seed
-- Password for all users: Password123!
--
-- Run with MySQL client:
--   mysql -u YOUR_USER -p YOUR_DATABASE < prisma/seed.sql
--
-- Or from MySQL shell:
--   USE your_database;
--   SOURCE prisma/seed.sql;

-- Clear existing data (child tables first due to foreign keys)
DELETE FROM token_blacklist;
DELETE FROM documents;
DELETE FROM head_lecturers;
DELETE FROM lecturers;
DELETE FROM students;
DELETE FROM profiles;
DELETE FROM users;
DELETE FROM courses;

-- ==================== COURSES (7) ====================
INSERT INTO courses (course_id, course_code, course_name, description, is_active, created_at, updated_at) VALUES
('c1111111-1111-1111-1111-111111111101', 'MC', 'Monash Foundation Year', 'Foundation programme for university entry', 1, NOW(), NOW()),
('c1111111-1111-1111-1111-111111111102', 'CS', 'Computer Science', 'Bachelor of Computer Science', 1, NOW(), NOW()),
('c1111111-1111-1111-1111-111111111103', 'BA', 'Business Administration', 'Bachelor of Business Administration', 1, NOW(), NOW()),
('c1111111-1111-1111-1111-111111111104', 'ENG', 'Engineering', 'Bachelor of Engineering', 1, NOW(), NOW()),
('c1111111-1111-1111-1111-111111111105', 'LAW', 'Law', 'Bachelor of Laws', 1, NOW(), NOW()),
('c1111111-1111-1111-1111-111111111106', 'MED', 'Medicine', 'Bachelor of Medicine', 1, NOW(), NOW()),
('c1111111-1111-1111-1111-111111111107', 'PSY', 'Psychology', 'Bachelor of Psychology', 1, NOW(), NOW());

-- ==================== USERS ====================
-- Password: Password123! (bcrypt 12 rounds)
INSERT INTO users (user_id, email, password_hash, name, type, status, is_email_verified, email_verified_at, created_at, updated_at) VALUES
-- Head Lecturer
('u1111111-1111-1111-1111-111111111101', 'hl@monash.edu.my', '$2b$12$i/1A6m8v3lIWPkMqllWFrOe0LYnOR79TyyINUznZSuVvUDjm9shXG', 'Dr. Ahmad Rahman', 'HEAD_LECTURER', 'ACTIVE', 1, NOW(), NOW(), NOW()),
-- Lecturers
('u1111111-1111-1111-1111-111111111102', 'lecturer1@monash.edu.my', '$2b$12$i/1A6m8v3lIWPkMqllWFrOe0LYnOR79TyyINUznZSuVvUDjm9shXG', 'Dr. Siti Aminah', 'LECTURER', 'ACTIVE', 1, NOW(), NOW(), NOW()),
('u1111111-1111-1111-1111-111111111103', 'lecturer2@monash.edu.my', '$2b$12$i/1A6m8v3lIWPkMqllWFrOe0LYnOR79TyyINUznZSuVvUDjm9shXG', 'Mr. Raj Kumar', 'LECTURER', 'ACTIVE', 1, NOW(), NOW(), NOW()),
('u1111111-1111-1111-1111-111111111114', 'lecturer3@monash.edu.my', '$2b$12$i/1A6m8v3lIWPkMqllWFrOe0LYnOR79TyyINUznZSuVvUDjm9shXG', 'Ms. Tan Mei Ling', 'LECTURER', 'ACTIVE', 1, NOW(), NOW(), NOW()),
('u1111111-1111-1111-1111-111111111115', 'lecturer4@monash.edu.my', '$2b$12$i/1A6m8v3lIWPkMqllWFrOe0LYnOR79TyyINUznZSuVvUDjm9shXG', 'Dr. Kumar Rajesh', 'LECTURER', 'ACTIVE', 1, NOW(), NOW(), NOW()),
-- Students
('u1111111-1111-1111-1111-111111111104', 'student1@student.monash.edu.my', '$2b$12$i/1A6m8v3lIWPkMqllWFrOe0LYnOR79TyyINUznZSuVvUDjm9shXG', 'Lim Wei Jie', 'STUDENT', 'ACTIVE', 1, NOW(), NOW(), NOW()),
('u1111111-1111-1111-1111-111111111105', 'student2@student.monash.edu.my', '$2b$12$i/1A6m8v3lIWPkMqllWFrOe0LYnOR79TyyINUznZSuVvUDjm9shXG', 'Nurul Izzati', 'STUDENT', 'ACTIVE', 1, NOW(), NOW(), NOW()),
('u1111111-1111-1111-1111-111111111106', 'student3@student.monash.edu.my', '$2b$12$i/1A6m8v3lIWPkMqllWFrOe0LYnOR79TyyINUznZSuVvUDjm9shXG', 'Chen Ming Wei', 'STUDENT', 'ACTIVE', 1, NOW(), NOW(), NOW()),
('u1111111-1111-1111-1111-111111111107', 'student4@student.monash.edu.my', '$2b$12$i/1A6m8v3lIWPkMqllWFrOe0LYnOR79TyyINUznZSuVvUDjm9shXG', 'Ahmad Firdaus', 'STUDENT', 'ACTIVE', 1, NOW(), NOW(), NOW()),
('u1111111-1111-1111-1111-111111111108', 'student5@student.monash.edu.my', '$2b$12$i/1A6m8v3lIWPkMqllWFrOe0LYnOR79TyyINUznZSuVvUDjm9shXG', 'Sarah Lee', 'STUDENT', 'ACTIVE', 1, NOW(), NOW(), NOW()),
('u1111111-1111-1111-1111-111111111109', 'student6@student.monash.edu.my', '$2b$12$i/1A6m8v3lIWPkMqllWFrOe0LYnOR79TyyINUznZSuVvUDjm9shXG', 'Muhammad Hafiz', 'STUDENT', 'ACTIVE', 1, NOW(), NOW(), NOW()),
('u1111111-1111-1111-1111-111111111110', 'student7@student.monash.edu.my', '$2b$12$i/1A6m8v3lIWPkMqllWFrOe0LYnOR79TyyINUznZSuVvUDjm9shXG', 'Priya Sharma', 'STUDENT', 'ACTIVE', 1, NOW(), NOW(), NOW()),
('u1111111-1111-1111-1111-111111111111', 'student8@student.monash.edu.my', '$2b$12$i/1A6m8v3lIWPkMqllWFrOe0LYnOR79TyyINUznZSuVvUDjm9shXG', 'Wong Kai Ming', 'STUDENT', 'ACTIVE', 1, NOW(), NOW(), NOW()),
('u1111111-1111-1111-1111-111111111112', 'student9@student.monash.edu.my', '$2b$12$i/1A6m8v3lIWPkMqllWFrOe0LYnOR79TyyINUznZSuVvUDjm9shXG', 'Fatimah Zahra', 'STUDENT', 'ACTIVE', 1, NOW(), NOW(), NOW()),
('u1111111-1111-1111-1111-111111111113', 'student10@student.monash.edu.my', '$2b$12$i/1A6m8v3lIWPkMqllWFrOe0LYnOR79TyyINUznZSuVvUDjm9shXG', 'Jason Ng', 'STUDENT', 'ACTIVE', 1, NOW(), NOW(), NOW()),
('u1111111-1111-1111-1111-111111111116', 'student11@student.monash.edu.my', '$2b$12$i/1A6m8v3lIWPkMqllWFrOe0LYnOR79TyyINUznZSuVvUDjm9shXG', 'Amirah binti Hassan', 'STUDENT', 'ACTIVE', 1, NOW(), NOW(), NOW()),
('u1111111-1111-1111-1111-111111111117', 'student12@student.monash.edu.my', '$2b$12$i/1A6m8v3lIWPkMqllWFrOe0LYnOR79TyyINUznZSuVvUDjm9shXG', 'David Tan', 'STUDENT', 'ACTIVE', 1, NOW(), NOW(), NOW());

-- ==================== PROFILES ====================
INSERT INTO profiles (profile_id, user_id, phone_number, gender, race, date_of_birth, street_one, street_two, postcode, city, state, created_at, updated_at) VALUES
('p1111111-1111-1111-1111-111111111101', 'u1111111-1111-1111-1111-111111111101', '+60123456789', 'Male', 'Malay', '1975-03-15', 'Jalan Universiti', NULL, '47500', 'Petaling Jaya', 'Selangor', NOW(), NOW()),
('p1111111-1111-1111-1111-111111111102', 'u1111111-1111-1111-1111-111111111102', '+60198765432', 'Female', 'Malay', '1985-07-22', 'Jalan SS2', 'Apt 5B', '47300', 'Petaling Jaya', 'Selangor', NOW(), NOW()),
('p1111111-1111-1111-1111-111111111103', 'u1111111-1111-1111-1111-111111111103', '+60187654321', 'Male', 'Indian', '1982-11-08', 'Jalan Bukit Bintang', NULL, '50250', 'Kuala Lumpur', 'KualaLumpur', NOW(), NOW()),
('p1111111-1111-1111-1111-111111111104', 'u1111111-1111-1111-1111-111111111104', '+60176543210', 'Male', 'Chinese', '2005-08-11', 'Jalan PJ', NULL, '46000', 'Petaling Jaya', 'Selangor', NOW(), NOW()),
('p1111111-1111-1111-1111-111111111105', 'u1111111-1111-1111-1111-111111111105', '+60165432109', 'Female', 'Malay', '2004-12-03', 'Jalan Damansara', 'Blok C', '47400', 'Petaling Jaya', 'Selangor', NOW(), NOW()),
('p1111111-1111-1111-1111-111111111106', 'u1111111-1111-1111-1111-111111111106', '+60154321098', 'Male', 'Chinese', '2005-01-20', 'Jalan Klang', NULL, '41000', 'Klang', 'Selangor', NOW(), NOW()),
('p1111111-1111-1111-1111-111111111107', 'u1111111-1111-1111-1111-111111111107', '+60143210987', 'Male', 'Malay', '2005-10-15', 'Jalan Ampang', NULL, '50450', 'Kuala Lumpur', 'KualaLumpur', NOW(), NOW()),
('p1111111-1111-1111-1111-111111111108', 'u1111111-1111-1111-1111-111111111108', '+60132109876', 'Female', 'Chinese', '2004-07-22', 'Jalan Gasing', 'Unit 12', '46000', 'Petaling Jaya', 'Selangor', NOW(), NOW()),
('p1111111-1111-1111-1111-111111111109', 'u1111111-1111-1111-1111-111111111109', '+60121098765', 'Male', 'Malay', '2005-03-06', 'Jalan SS15', NULL, '47500', 'Subang Jaya', 'Selangor', NOW(), NOW()),
('p1111111-1111-1111-1111-111111111110', 'u1111111-1111-1111-1111-111111111110', '+60110987654', 'Female', 'Indian', '2004-12-18', 'Jalan Brickfields', NULL, '50470', 'Kuala Lumpur', 'KualaLumpur', NOW(), NOW()),
('p1111111-1111-1111-1111-111111111111', 'u1111111-1111-1111-1111-111111111111', '+60109876543', 'Male', 'Chinese', '2005-04-29', 'Jalan Imbi', NULL, '55100', 'Kuala Lumpur', 'KualaLumpur', NOW(), NOW()),
('p1111111-1111-1111-1111-111111111112', 'u1111111-1111-1111-1111-111111111112', '+60098765432', 'Female', 'Malay', '2004-09-11', 'Jalan USJ', 'Tower A', '47600', 'Subang Jaya', 'Selangor', NOW(), NOW()),
('p1111111-1111-1111-1111-111111111113', 'u1111111-1111-1111-1111-111111111113', '+60087654321', 'Male', 'Chinese', '2005-12-07', 'Jalan Pudu', NULL, '50250', 'Kuala Lumpur', 'KualaLumpur', NOW(), NOW()),
('p1111111-1111-1111-1111-111111111114', 'u1111111-1111-1111-1111-111111111114', '+60176543219', 'Female', 'Chinese', '1988-03-15', 'Jalan Utara', NULL, '46200', 'Petaling Jaya', 'Selangor', NOW(), NOW()),
('p1111111-1111-1111-1111-111111111115', 'u1111111-1111-1111-1111-111111111115', '+60165432108', 'Male', 'Indian', '1980-09-25', 'Jalan Bangsar', NULL, '59000', 'Kuala Lumpur', 'KualaLumpur', NOW(), NOW()),
('p1111111-1111-1111-1111-111111111116', 'u1111111-1111-1111-1111-111111111116', '+60154321097', 'Female', 'Malay', '2005-02-14', 'Jalan Cheras', NULL, '43200', 'Cheras', 'Selangor', NOW(), NOW()),
('p1111111-1111-1111-1111-111111111117', 'u1111111-1111-1111-1111-111111111117', '+60143210986', 'Male', 'Chinese', '2004-11-30', 'Jalan Kepong', NULL, '52100', 'Kuala Lumpur', 'KualaLumpur', NOW(), NOW());

-- ==================== STUDENTS (12) ====================
-- Note: IDs must be valid UUIDs (hex 0-9a-f only). Prefix 'b' used for students.
INSERT INTO students (student_id, student_number, mykad_number, course_id, user_id, created_at, updated_at) VALUES
('b1111111-1111-1111-1111-111111111101', 'MC24001', '050811140847', 'c1111111-1111-1111-1111-111111111101', 'u1111111-1111-1111-1111-111111111104', NOW(), NOW()),
('b1111111-1111-1111-1111-111111111102', 'MC24002', '041203085432', 'c1111111-1111-1111-1111-111111111101', 'u1111111-1111-1111-1111-111111111105', NOW(), NOW()),
('b1111111-1111-1111-1111-111111111103', 'CS24001', '050120101234', 'c1111111-1111-1111-1111-111111111102', 'u1111111-1111-1111-1111-111111111106', NOW(), NOW()),
('b1111111-1111-1111-1111-111111111104', 'MC24003', '051015098765', 'c1111111-1111-1111-1111-111111111101', 'u1111111-1111-1111-1111-111111111107', NOW(), NOW()),
('b1111111-1111-1111-1111-111111111105', 'MC24004', '040722112233', 'c1111111-1111-1111-1111-111111111101', 'u1111111-1111-1111-1111-111111111108', NOW(), NOW()),
('b1111111-1111-1111-1111-111111111106', 'CS24002', '050306077889', 'c1111111-1111-1111-1111-111111111102', 'u1111111-1111-1111-1111-111111111109', NOW(), NOW()),
('b1111111-1111-1111-1111-111111111107', 'BA24001', '041218055566', 'c1111111-1111-1111-1111-111111111103', 'u1111111-1111-1111-1111-111111111110', NOW(), NOW()),
('b1111111-1111-1111-1111-111111111108', 'MC24005', '050429033344', 'c1111111-1111-1111-1111-111111111101', 'u1111111-1111-1111-1111-111111111111', NOW(), NOW()),
('b1111111-1111-1111-1111-111111111109', 'CS24003', '040911066677', 'c1111111-1111-1111-1111-111111111102', 'u1111111-1111-1111-1111-111111111112', NOW(), NOW()),
('b1111111-1111-1111-1111-111111111110', 'BA24002', '051207099988', 'c1111111-1111-1111-1111-111111111103', 'u1111111-1111-1111-1111-111111111113', NOW(), NOW()),
('b1111111-1111-1111-1111-111111111111', 'ENG24001', '050214077654', 'c1111111-1111-1111-1111-111111111104', 'u1111111-1111-1111-1111-111111111116', NOW(), NOW()),
('b1111111-1111-1111-1111-111111111112', 'PSY24001', '041130088765', 'c1111111-1111-1111-1111-111111111107', 'u1111111-1111-1111-1111-111111111117', NOW(), NOW());

-- ==================== LECTURERS (4) ====================
-- Note: IDs must be valid UUIDs (hex 0-9a-f only). Prefix 'a' used for lecturers.
INSERT INTO lecturers (lecturer_id, staff_number, mykad_number, course_id, user_id, created_at, updated_at) VALUES
('a1111111-1111-1111-1111-111111111101', 'LEC001', '850722145678', 'c1111111-1111-1111-1111-111111111101', 'u1111111-1111-1111-1111-111111111102', NOW(), NOW()),
('a1111111-1111-1111-1111-111111111102', 'LEC002', '821108098765', 'c1111111-1111-1111-1111-111111111102', 'u1111111-1111-1111-1111-111111111103', NOW(), NOW()),
('a1111111-1111-1111-1111-111111111103', 'LEC003', '880315134567', 'c1111111-1111-1111-1111-111111111103', 'u1111111-1111-1111-1111-111111111114', NOW(), NOW()),
('a1111111-1111-1111-1111-111111111104', 'LEC004', '800925112345', 'c1111111-1111-1111-1111-111111111104', 'u1111111-1111-1111-1111-111111111115', NOW(), NOW());

-- ==================== HEAD LECTURERS ====================
-- Note: IDs must be valid UUIDs (hex 0-9a-f only). Prefix 'd' used for head lecturers.
INSERT INTO head_lecturers (head_lecturer_id, staff_number, mykad_number, user_id, created_at, updated_at) VALUES
('d1111111-1111-1111-1111-111111111101', 'HL001', '750315123456', 'u1111111-1111-1111-1111-111111111101', NOW(), NOW());
