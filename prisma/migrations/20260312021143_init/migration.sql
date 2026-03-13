-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('STUDENT', 'LECTURER', 'HEAD_LECTURER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('Male', 'Female');

-- CreateEnum
CREATE TYPE "Race" AS ENUM ('Malay', 'Chinese', 'Indian', 'Others');

-- CreateEnum
CREATE TYPE "State" AS ENUM ('Johor', 'Kedah', 'Kelantan', 'Melaka', 'NegeriSembilan', 'Pahang', 'Perak', 'Perlis', 'PulauPinang', 'Sabah', 'Sarawak', 'Selangor', 'Terengganu', 'KualaLumpur', 'Labuan', 'Putrajaya');

-- CreateEnum
CREATE TYPE "FileCategory" AS ENUM ('PROFILE_PICTURE', 'IC', 'TRANSCRIPT', 'DOCUMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('STUDENT', 'LECTURER', 'HEAD_LECTURER');

-- CreateTable
CREATE TABLE "users" (
    "user_id" UUID NOT NULL,
    "type" "UserType" NOT NULL DEFAULT 'STUDENT',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "profile_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "phone_number" VARCHAR(15),
    "gender" "Gender",
    "race" "Race",
    "date_of_birth" TIMESTAMP(3),
    "street_one" VARCHAR(255),
    "street_two" VARCHAR(255),
    "postcode" VARCHAR(5),
    "city" VARCHAR(100),
    "state" "State",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("profile_id")
);

-- CreateTable
CREATE TABLE "students" (
    "student_id" UUID NOT NULL,
    "student_number" VARCHAR(10) NOT NULL,
    "mykad_number" VARCHAR(12),
    "course_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("student_id")
);

-- CreateTable
CREATE TABLE "lecturers" (
    "lecturer_id" UUID NOT NULL,
    "staff_number" VARCHAR(10) NOT NULL,
    "mykad_number" VARCHAR(12),
    "course_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lecturers_pkey" PRIMARY KEY ("lecturer_id")
);

-- CreateTable
CREATE TABLE "head_lecturers" (
    "head_lecturer_id" UUID NOT NULL,
    "staff_number" VARCHAR(10) NOT NULL,
    "mykad_number" VARCHAR(12),
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "head_lecturers_pkey" PRIMARY KEY ("head_lecturer_id")
);

-- CreateTable
CREATE TABLE "courses" (
    "course_id" UUID NOT NULL,
    "course_code" VARCHAR(10) NOT NULL,
    "course_name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("course_id")
);

-- CreateTable
CREATE TABLE "documents" (
    "document_id" UUID NOT NULL,
    "entity_id" VARCHAR(191) NOT NULL,
    "entity_type" "EntityType" NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "original_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "file_size" BIGINT NOT NULL,
    "file_path" VARCHAR(500) NOT NULL,
    "file_url" VARCHAR(500) NOT NULL,
    "category" "FileCategory" NOT NULL,
    "student_id" UUID,
    "lecturer_id" UUID,
    "head_lecturer_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "documents_pkey" PRIMARY KEY ("document_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_user_id_key" ON "profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "students_student_number_key" ON "students"("student_number");

-- CreateIndex
CREATE UNIQUE INDEX "students_mykad_number_key" ON "students"("mykad_number");

-- CreateIndex
CREATE UNIQUE INDEX "students_user_id_key" ON "students"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "lecturers_staff_number_key" ON "lecturers"("staff_number");

-- CreateIndex
CREATE UNIQUE INDEX "lecturers_mykad_number_key" ON "lecturers"("mykad_number");

-- CreateIndex
CREATE UNIQUE INDEX "lecturers_user_id_key" ON "lecturers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "head_lecturers_staff_number_key" ON "head_lecturers"("staff_number");

-- CreateIndex
CREATE UNIQUE INDEX "head_lecturers_mykad_number_key" ON "head_lecturers"("mykad_number");

-- CreateIndex
CREATE UNIQUE INDEX "head_lecturers_user_id_key" ON "head_lecturers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "courses_course_code_key" ON "courses"("course_code");

-- CreateIndex
CREATE INDEX "documents_entity_id_entity_type_idx" ON "documents"("entity_id", "entity_type");

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("course_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lecturers" ADD CONSTRAINT "lecturers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lecturers" ADD CONSTRAINT "lecturers_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("course_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "head_lecturers" ADD CONSTRAINT "head_lecturers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_lecturer_id_fkey" FOREIGN KEY ("lecturer_id") REFERENCES "lecturers"("lecturer_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_head_lecturer_id_fkey" FOREIGN KEY ("head_lecturer_id") REFERENCES "head_lecturers"("head_lecturer_id") ON DELETE SET NULL ON UPDATE CASCADE;
