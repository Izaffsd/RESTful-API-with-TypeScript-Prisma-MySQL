-- =============================================================================
-- NUCLEAR: removes the entire `public` schema (all tables, enums, types, data).
-- Does NOT touch `auth`, `storage`, `extensions`, etc.
--
-- After this file runs, your DB has NO app tables until you recreate them:
--   pnpm exec prisma migrate deploy
--
-- Also clear Supabase Auth users / Storage in the Dashboard if you want those gone.
-- =============================================================================

DROP SCHEMA IF EXISTS public CASCADE;

CREATE SCHEMA public;

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO postgres, anon, authenticated, service_role;
