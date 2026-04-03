-- Align DB with schema: User.name (was in Prisma but missing from earlier migrations).
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "name" VARCHAR(200);
