-- =============================================
-- Seed Data for Monash College Management System
-- Run after: npx prisma db push --force-reset
-- =============================================

SET @cs  = UUID();
SET @se  = UUID();
SET @it  = UUID();
SET @law = UUID();
SET @bus = UUID();
SET @acc = UUID();

-- Courses
INSERT INTO courses (course_id, course_code, course_name, created_at, updated_at) VALUES
(@cs,  'CS',   'Computer Science',        NOW(), NOW()),
(@se,  'SE',   'Software Engineering',    NOW(), NOW()),
(@it,  'IT',   'Information Technology',   NOW(), NOW()),
(@law, 'LAW',  'Law',                      NOW(), NOW()),
(@bus, 'BUS',  'Business Administration',  NOW(), NOW()),
(@acc, 'ACC',  'Accounting',               NOW(), NOW());

-- Students
INSERT INTO students (student_id, student_number, mykad_number, email, student_name, address, gender, profile_picture, course_id, created_at, updated_at) VALUES
-- Computer Science
(UUID(), 'CS0401',   '020101141234', 'ahmad.farid@monash.edu',      'Ahmad Farid',       'No 12, Jalan Ampang, KL',                   'Male',   NULL, @cs, NOW(), NOW()),
(UUID(), 'CS0102',   '030215081234', 'nurul.aisyah@monash.edu',     'Nurul Aisyah',      'Blok A-12-3, Kondominium Seri Puteri, PJ',  'Female', NULL, @cs, NOW(), NOW()),
(UUID(), 'CS0203',   '010530141567', 'muhammad.haziq@monash.edu',   'Muhammad Haziq',    'No 45, Taman Desa Jaya, Johor Bahru',       'Male',   NULL, @cs, NOW(), NOW()),

-- Software Engineering
(UUID(), 'SE0301',  '020810101234', 'siti.nabila@monash.edu',      'Siti Nabila',       'No 8, Lorong Mawar 3, Shah Alam',           'Female', NULL, @se, NOW(), NOW()),
(UUID(), 'SE0102',  '011122141890', 'danish.irfan@monash.edu',     'Danish Irfan',      'Lot 23, Kampung Baru, Subang Jaya',         'Male',   NULL, @se, NOW(), NOW()),
(UUID(), 'SE0203',  '030704082345', 'aina.sofea@monash.edu',       'Aina Sofea',        'No 67, Jalan Kenanga, Petaling Jaya',       'Female', NULL, @se, NOW(), NOW()),

-- Information Technology
(UUID(), 'IT0501',   '020325141111', 'amir.hakimi@monash.edu',      'Amir Hakimi',       'A-3-5, Pangsapuri Harmoni, Cyberjaya',      'Male',   NULL, @it, NOW(), NOW()),
(UUID(), 'IT0302',   '031201082222', 'farah.diana@monash.edu',      'Farah Diana',       'No 15, Jalan Cempaka 7, Bangi',             'Female', NULL, @it, NOW(), NOW()),

-- Law
(UUID(), 'LAW0504',  '010918143333', 'adam.luqman@monash.edu',      'Adam Luqman',       'No 3, Persiaran Damansara, TTDI',           'Male',   NULL, @law, NOW(), NOW()),
(UUID(), 'LAW0505',  '020607084444', 'nur.aliya@monash.edu',        'Nur Aliya',         'B-7-2, Vista Komanwel, Bukit Jalil',        'Female', NULL, @law, NOW(), NOW()),
(UUID(), 'LAW0206',  '030412145555', 'hariz.danial@monash.edu',     'Hariz Danial',      'No 88, Jalan Tun Razak, KL',                'Male',   NULL, @law, NOW(), NOW()),

-- Business Administration
(UUID(), 'BUS0101',  '011130086666', 'izzah.natasha@monash.edu',    'Izzah Natasha',     'No 21, Taman Melati, Gombak',               'Female', NULL, @bus, NOW(), NOW()),
(UUID(), 'BUS0302',  '020814147777', 'zafran.aqil@monash.edu',      'Zafran Aqil',       'Lot 5, Jalan Perdana, Putrajaya',           'Male',   NULL, @bus, NOW(), NOW()),

-- Accounting
(UUID(), 'ACC0001',  '030928088888', 'syafiqah.zahra@monash.edu',   'Syafiqah Zahra',    'No 9, Jalan Bukit Bintang, KL',             'Female', NULL, @acc, NOW(), NOW()),
(UUID(), 'ACC0002',  '011005149999', 'arif.budiman@monash.edu',     'Arif Budiman',       NULL,                                        'Male',   NULL, @acc, NOW(), NOW());
