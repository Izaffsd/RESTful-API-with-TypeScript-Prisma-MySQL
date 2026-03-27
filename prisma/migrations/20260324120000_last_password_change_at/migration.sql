-- Track password changes for auditing (optional future UX).
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_password_change_at" TIMESTAMP(3);
