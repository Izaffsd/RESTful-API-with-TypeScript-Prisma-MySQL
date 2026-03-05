/*
  Warnings:

  - You are about to drop the `student` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `student` DROP FOREIGN KEY `student_course_id_fkey`;

-- DropTable
DROP TABLE `student`;

-- CreateTable
CREATE TABLE `students` (
    `student_id` INTEGER NOT NULL AUTO_INCREMENT,
    `student_number` VARCHAR(10) NOT NULL,
    `mykad_number` CHAR(12) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `student_name` VARCHAR(100) NOT NULL,
    `address` TEXT NULL,
    `gender` ENUM('Male', 'Female') NULL,
    `course_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `students_student_number_key`(`student_number`),
    UNIQUE INDEX `students_mykad_number_key`(`mykad_number`),
    UNIQUE INDEX `students_email_key`(`email`),
    PRIMARY KEY (`student_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `students` ADD CONSTRAINT `students_course_id_fkey` FOREIGN KEY (`course_id`) REFERENCES `courses`(`course_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
