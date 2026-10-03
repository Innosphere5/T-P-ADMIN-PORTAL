-- ====================================================================
-- ENABLE SUPABASE REALTIME ON ALL STUDENT TABLES
-- Run this in the Supabase SQL Editor to ensure Realtime events
-- are published for both admin panel and mobile app listeners.
-- ====================================================================

-- Add all student-related tables to the supabase_realtime publication.
-- This is idempotent — Supabase ignores tables already in the publication.

ALTER PUBLICATION supabase_realtime ADD TABLE public.students;
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_academic_summary;
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_projects;
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_git_projects;
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_certificates;
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_internships;
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_semester_records;
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_grades;
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_audit_log;

-- Set REPLICA IDENTITY to FULL on tables where we need old_data in payloads
-- (useful for detecting which fields changed)
ALTER TABLE public.students REPLICA IDENTITY FULL;
ALTER TABLE public.student_profiles REPLICA IDENTITY FULL;
ALTER TABLE public.student_academic_summary REPLICA IDENTITY FULL;
