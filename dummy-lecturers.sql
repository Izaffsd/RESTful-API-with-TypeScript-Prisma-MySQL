-- Dummy Lecturer and Head Lecturer (and their User accounts).
-- Password for both: SecurePass1!
-- Run after dummy-courses.sql (so course BCS exists).
-- Run: mysql -u USER -p monash < dummy-lecturers.sql

-- 1) Create or update users (so they can log in)
INSERT INTO `users` (
  `user_id`, `email`, `password_hash`, `name`, `type`, `status`,
  `is_email_verified`, `email_verified_at`, `created_at`, `updated_at`
) VALUES
(
  UUID(), 'lecturer@monash.edu',
  '$2b$12$/IDSBKYwg/CDDwmQuj0fs..XH.GdYWC7nYvUau.lLOQU5H5CgQV0u',
  'Demo Lecturer', 'LECTURER', 'ACTIVE',
  1, NOW(), NOW(), NOW()
),
(
  UUID(), 'headlecturer@monash.edu',
  '$2b$12$/IDSBKYwg/CDDwmQuj0fs..XH.GdYWC7nYvUau.lLOQU5H5CgQV0u',
  'Demo Head Lecturer', 'HEAD_LECTURER', 'ACTIVE',
  1, NOW(), NOW(), NOW()
)
ON DUPLICATE KEY UPDATE
  `password_hash` = VALUES(`password_hash`),
  `is_email_verified` = 1,
  `email_verified_at` = NOW(),
  `type` = VALUES(`type`),
  `updated_at` = NOW();

-- 2) Lecturer (linked to lecturer@monash.edu and course BCS)
INSERT IGNORE INTO `lecturers` (`lecturer_id`, `staff_number`, `course_id`, `user_id`, `created_at`, `updated_at`)
SELECT UUID(), 'LEC001', c.`course_id`, u.`user_id`, NOW(), NOW()
FROM `users` u
CROSS JOIN `courses` c
WHERE u.`email` = 'lecturer@monash.edu' AND c.`course_code` = 'BCS'
LIMIT 1;

-- 3) Head Lecturer (linked to headlecturer@monash.edu)
INSERT IGNORE INTO `head_lecturers` (`head_lecturer_id`, `staff_number`, `user_id`, `created_at`, `updated_at`)
SELECT UUID(), 'HL001', u.`user_id`, NOW(), NOW()
FROM `users` u
WHERE u.`email` = 'headlecturer@monash.edu'
LIMIT 1;
