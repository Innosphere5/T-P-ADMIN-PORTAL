-- ====================================================================
-- ENABLE SUPABASE REALTIME ON ALL STUDENT & SYSTEM TABLES
-- Run this in the Supabase SQL Editor.
-- Completely idempotent and safe to run multiple times.
-- ====================================================================

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'students',
    'student_profiles',
    'student_academic_summary',
    'student_projects',
    'student_git_projects',
    'student_certificates',
    'student_internships',
    'student_semester_records',
    'student_grades',
    'admin_audit_log',
    'internship_opportunities',
    'notifications',
    'student_notification_reads'
  ];
  replica_tables text[] := ARRAY[
    'students',
    'student_profiles',
    'student_academic_summary',
    'notifications'
  ];
BEGIN
  -- 1. Ensure supabase_realtime publication exists
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
    RAISE NOTICE 'Created publication supabase_realtime';
  END IF;

  -- 2. Add each table to supabase_realtime if not already present
  FOREACH t IN ARRAY tables LOOP
    -- Check if table actually exists in public schema first
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      -- Check if already added to supabase_realtime
      IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = t
      ) THEN
        BEGIN
          EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', t);
          RAISE NOTICE 'Added table public.% to supabase_realtime', t;
        EXCEPTION WHEN duplicate_object THEN
          RAISE NOTICE 'Table public.% was already a member of supabase_realtime, skipped.', t;
        END;
      ELSE
        RAISE NOTICE 'Table public.% is already in supabase_realtime, skipped.', t;
      END IF;
    ELSE
      RAISE NOTICE 'Table public.% does not exist, skipped.', t;
    END IF;
  END LOOP;

  -- 3. Set REPLICA IDENTITY FULL on specified tables for change tracking
  FOREACH t IN ARRAY replica_tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL;', t);
      RAISE NOTICE 'Set REPLICA IDENTITY FULL on public.%', t;
    END IF;
  END LOOP;
END $$;
