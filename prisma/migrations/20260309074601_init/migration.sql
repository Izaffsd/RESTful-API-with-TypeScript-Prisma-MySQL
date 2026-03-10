-- CreateTable
CREATE TABLE `users` (
    `user_id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `type` ENUM('STUDENT', 'LECTURER', 'HEAD_LECTURER') NOT NULL DEFAULT 'STUDENT',
    `status` ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
    `is_email_verified` BOOLEAN NOT NULL DEFAULT false,
    `email_verified_at` DATETIME(3) NULL,
    `email_verify_token` VARCHAR(255) NULL,
    `email_verify_expiry` DATETIME(3) NULL,
    `password_reset_token` VARCHAR(255) NULL,
    `password_reset_expiry` DATETIME(3) NULL,
    `refresh_token` VARCHAR(500) NULL,
    `refresh_token_expiry` DATETIME(3) NULL,
    `failed_login_attempts` INTEGER NOT NULL DEFAULT 0,
    `locked_until` DATETIME(3) NULL,
    `last_login_at` DATETIME(3) NULL,
    `deleted_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    UNIQUE INDEX `users_email_verify_token_key`(`email_verify_token`),
    UNIQUE INDEX `users_password_reset_token_key`(`password_reset_token`),
    UNIQUE INDEX `users_refresh_token_key`(`refresh_token`),
    PRIMARY KEY (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `profiles` (
    `profile_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `phone_number` VARCHAR(15) NULL,
    `gender` ENUM('Male', 'Female') NULL,
    `race` ENUM('Malay', 'Chinese', 'Indian', 'Others') NULL,
    `date_of_birth` DATETIME(3) NULL,
    `street_one` VARCHAR(255) NULL,
    `street_two` VARCHAR(255) NULL,
    `postcode` VARCHAR(5) NULL,
    `city` VARCHAR(100) NULL,
    `state` ENUM('Johor', 'Kedah', 'Kelantan', 'Melaka', 'NegeriSembilan', 'Pahang', 'Perak', 'Perlis', 'PulauPinang', 'Sabah', 'Sarawak', 'Selangor', 'Terengganu', 'KualaLumpur', 'Labuan', 'Putrajaya') NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `profiles_user_id_key`(`user_id`),
    PRIMARY KEY (`profile_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `students` (
    `student_id` VARCHAR(191) NOT NULL,
    `student_number` VARCHAR(10) NOT NULL,
    `mykad_number` VARCHAR(12) NULL,
    `course_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `students_student_number_key`(`student_number`),
    UNIQUE INDEX `students_mykad_number_key`(`mykad_number`),
    UNIQUE INDEX `students_user_id_key`(`user_id`),
    PRIMARY KEY (`student_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lecturers` (
    `lecturer_id` VARCHAR(191) NOT NULL,
    `staff_number` VARCHAR(10) NOT NULL,
    `mykad_number` VARCHAR(12) NULL,
    `course_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `lecturers_staff_number_key`(`staff_number`),
    UNIQUE INDEX `lecturers_mykad_number_key`(`mykad_number`),
    UNIQUE INDEX `lecturers_user_id_key`(`user_id`),
    PRIMARY KEY (`lecturer_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `head_lecturers` (
    `head_lecturer_id` VARCHAR(191) NOT NULL,
    `staff_number` VARCHAR(10) NOT NULL,
    `mykad_number` VARCHAR(12) NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `head_lecturers_staff_number_key`(`staff_number`),
    UNIQUE INDEX `head_lecturers_mykad_number_key`(`mykad_number`),
    UNIQUE INDEX `head_lecturers_user_id_key`(`user_id`),
    PRIMARY KEY (`head_lecturer_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `courses` (
    `course_id` VARCHAR(191) NOT NULL,
    `course_code` VARCHAR(10) NOT NULL,
    `course_name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `courses_course_code_key`(`course_code`),
    PRIMARY KEY (`course_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `documents` (
    `document_id` VARCHAR(191) NOT NULL,
    `entity_id` VARCHAR(191) NOT NULL,
    `entity_type` ENUM('STUDENT', 'LECTURER', 'HEAD_LECTURER') NOT NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `original_name` VARCHAR(255) NOT NULL,
    `mime_type` VARCHAR(100) NOT NULL,
    `file_size` BIGINT NOT NULL,
    `file_path` VARCHAR(500) NOT NULL,
    `file_url` VARCHAR(500) NOT NULL,
    `category` ENUM('PROFILE_PICTURE', 'IC', 'TRANSCRIPT', 'DOCUMENT', 'OTHER') NOT NULL,
    `student_id` VARCHAR(191) NULL,
    `lecturer_id` VARCHAR(191) NULL,
    `head_lecturer_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `documents_entity_id_entity_type_idx`(`entity_id`, `entity_type`),
    PRIMARY KEY (`document_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `token_blacklist` (
    `id` VARCHAR(191) NOT NULL,
    `token` VARCHAR(500) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `token_blacklist_token_key`(`token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `profiles` ADD CONSTRAINT `profiles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `students` ADD CONSTRAINT `students_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `students` ADD CONSTRAINT `students_course_id_fkey` FOREIGN KEY (`course_id`) REFERENCES `courses`(`course_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lecturers` ADD CONSTRAINT `lecturers_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lecturers` ADD CONSTRAINT `lecturers_course_id_fkey` FOREIGN KEY (`course_id`) REFERENCES `courses`(`course_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `head_lecturers` ADD CONSTRAINT `head_lecturers_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documents` ADD CONSTRAINT `documents_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `students`(`student_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documents` ADD CONSTRAINT `documents_lecturer_id_fkey` FOREIGN KEY (`lecturer_id`) REFERENCES `lecturers`(`lecturer_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documents` ADD CONSTRAINT `documents_head_lecturer_id_fkey` FOREIGN KEY (`head_lecturer_id`) REFERENCES `head_lecturers`(`head_lecturer_id`) ON DELETE SET NULL ON UPDATE CASCADE;
