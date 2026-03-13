-- DropForeignKey
ALTER TABLE "students" DROP CONSTRAINT "students_course_id_fkey";

-- AlterTable
ALTER TABLE "lecturers" ALTER COLUMN "staff_number" DROP NOT NULL;

-- AlterTable
ALTER TABLE "students" ALTER COLUMN "student_number" DROP NOT NULL,
ALTER COLUMN "course_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("course_id") ON DELETE SET NULL ON UPDATE CASCADE;
