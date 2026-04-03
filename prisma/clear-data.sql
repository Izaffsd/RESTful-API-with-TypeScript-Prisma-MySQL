-- Empty all app tables in public (schema + _prisma_migrations stay).
-- Does NOT touch Supabase auth.users — delete users in Dashboard → Authentication if you want logins gone.
-- Does NOT run seed. Use: pnpm run db:clear

TRUNCATE TABLE documents, students, lecturers, head_lecturers, profiles, users, courses CASCADE;
