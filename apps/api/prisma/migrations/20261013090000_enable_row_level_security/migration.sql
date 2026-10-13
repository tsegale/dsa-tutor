-- Enable row level security on every table in the public schema, with no
-- policies. Supabase exposes the public schema through its Data API
-- (PostgREST) to the anon and authenticated roles; with RLS off, anyone
-- holding the project's anon key could read and write these tables directly,
-- participant data included. RLS with no policies denies those roles every
-- row. The app is unaffected: Prisma connects as the table owner, which RLS
-- does not apply to (no FORCE ROW LEVEL SECURITY).
--
-- Idempotent, so it is also safe to paste into the Supabase SQL editor.
-- A table added by a later migration needs the same statement: the Supabase
-- Security Advisor flags any public table with RLS off.
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END
$$;
