-- Track email/password self-registration vs Profile → Connect Google for Scenario 5 (same Supabase user id).
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_signup_at" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "profile_google_linked_at" TIMESTAMP(3);
