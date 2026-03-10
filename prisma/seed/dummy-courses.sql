-- Dummy courses for Monash CMS (matches prisma schema: courses table)
-- Run against your database (e.g. mysql -u USER -p monash < dummy-courses.sql)

INSERT INTO `courses` (`course_id`, `course_code`, `course_name`, `description`, `is_active`, `created_at`, `updated_at`) VALUES
(UUID(), 'BCS', 'Bachelor of Computer Science', 'Core computing and software development.', 1, NOW(), NOW()),
(UUID(), 'BIT', 'Bachelor of Information Technology', 'IT systems and business technology.', 1, NOW(), NOW()),
(UUID(), 'BSE', 'Bachelor of Software Engineering', 'Software design and engineering.', 1, NOW(), NOW()),
(UUID(), 'MIT', 'Master of Information Technology', 'Advanced IT and research.', 1, NOW(), NOW()),
(UUID(), 'MCS', 'Master of Computer Science', 'Graduate computer science.', 1, NOW(), NOW());

-- Optional: a few more if you need variety
-- INSERT INTO `courses` (`course_id`, `course_code`, `course_name`, `description`, `is_active`, `created_at`, `updated_at`) VALUES
-- (UUID(), 'BIS', 'Bachelor of Information Systems', 'Information systems and business analytics.', 1, NOW(), NOW()),
-- (UUID(), 'DCS', 'Diploma in Computer Science', 'Foundation computing.', 1, NOW(), NOW());
