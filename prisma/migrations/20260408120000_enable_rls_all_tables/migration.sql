-- Enable Row Level Security on all application tables.
-- No permissive policies are added: PostgREST (anon/authenticated roles) is
-- denied by default, while Prisma connects as the table owner and bypasses RLS.

ALTER TABLE "users"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "profiles"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "students"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "lecturers"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "head_lecturers"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "courses"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "documents"       ENABLE ROW LEVEL SECURITY;
