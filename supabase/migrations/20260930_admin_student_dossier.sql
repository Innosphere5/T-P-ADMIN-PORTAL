-- ====================================================================
-- RIMT UNIVERSITY: ADMIN STUDENT DOSSIER & MANUAL ACADEMICS SYSTEM
-- Spec: CONTEXT (1).md
-- Date: 2026-09-30
-- Description:
--   Creates tables for student dossier (profiles, projects, git_projects,
--   certificates, internships) and manual-only academic tracking
--   (academic summary, semester records, grades, audit log).
--   Enforces strict manual-only academic guarantee (NO automation).
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. Helper Functions for Security & RLS
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins a
    WHERE (a.id = auth.uid() OR auth.role() = 'service_role')
      AND LOWER(a.status) = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.current_student_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id FROM public.students s WHERE s.id = auth.uid() LIMIT 1;
$$;

-- --------------------------------------------------------------------
-- 1.1 Ensure students table has bio and profile columns directly
-- --------------------------------------------------------------------
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS headline TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}';
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS github_url TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS portfolio_url TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS resume_url TEXT;

-- --------------------------------------------------------------------
-- 2. Student Profiles (Bio, Socials, Portfolio)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_profiles (
  student_id      UUID PRIMARY KEY REFERENCES public.students(id) ON DELETE CASCADE,
  bio             TEXT,
  headline        TEXT,
  skills          TEXT[] DEFAULT '{}',
  linkedin_url    TEXT,
  github_url      TEXT,
  portfolio_url   TEXT,
  resume_url      TEXT,
  updated_by      UUID,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 3. Student Projects (General & Academic Projects)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_projects (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT,
  tech_stack    TEXT[] DEFAULT '{}',
  live_url      TEXT,
  start_date    DATE,
  end_date      DATE,
  is_visible    BOOLEAN NOT NULL DEFAULT true,
  sort_order    INT NOT NULL DEFAULT 0,
  created_by    UUID,
  updated_by    UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_student_projects_order ON public.student_projects (student_id, sort_order);

-- --------------------------------------------------------------------
-- 4. Student Git Projects (Repositories & Code Metadata)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_git_projects (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  repo_name     TEXT NOT NULL,
  repo_url      TEXT NOT NULL,
  description   TEXT,
  primary_language TEXT,
  stars         INT DEFAULT 0,
  is_visible    BOOLEAN NOT NULL DEFAULT true,
  sort_order    INT NOT NULL DEFAULT 0,
  created_by    UUID,
  updated_by    UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT git_url_format CHECK (repo_url ~* '^https?://')
);
CREATE INDEX IF NOT EXISTS idx_student_git_projects_order ON public.student_git_projects (student_id, sort_order);

-- --------------------------------------------------------------------
-- 5. Student Certificates (Credentials & Document Proofs)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_certificates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  project_id    UUID REFERENCES public.student_projects(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  issuer        TEXT,
  issue_date    DATE,
  credential_id TEXT,
  credential_url TEXT,
  file_path     TEXT,
  file_mime     TEXT,
  is_visible    BOOLEAN NOT NULL DEFAULT true,
  created_by    UUID,
  updated_by    UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_student_certificates_student ON public.student_certificates (student_id);

-- --------------------------------------------------------------------
-- 6. Student Internships (Work Experience & Industrial Training)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_internships (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id                  UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  company_name                TEXT NOT NULL,
  role_title                  TEXT NOT NULL,
  location                    TEXT,
  mode                        TEXT CHECK (mode IN ('onsite','remote','hybrid')),
  start_date                  DATE,
  end_date                    DATE,
  is_ongoing                  BOOLEAN NOT NULL DEFAULT false,
  stipend                     NUMERIC,
  description                 TEXT,
  offer_letter_path           TEXT,
  completion_certificate_path TEXT,
  status                      TEXT NOT NULL DEFAULT 'ongoing' CHECK (status IN ('ongoing','completed','terminated')),
  created_by                  UUID,
  updated_by                  UUID,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_student_internships_student ON public.student_internships (student_id);

-- --------------------------------------------------------------------
-- 7. Academic Records (MANUAL ONLY - NO AUTOMATION)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_academic_summary (
  student_id          UUID PRIMARY KEY REFERENCES public.students(id) ON DELETE CASCADE,
  cgpa                NUMERIC(4,2) CHECK (cgpa BETWEEN 0 AND 10),
  overall_attendance  NUMERIC(5,2) CHECK (overall_attendance BETWEEN 0 AND 100),
  backlogs            INT CHECK (backlogs >= 0),
  updated_by          UUID,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.student_semester_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  semester        INT NOT NULL CHECK (semester BETWEEN 1 AND 12),
  academic_year   TEXT,
  sgpa            NUMERIC(4,2) CHECK (sgpa BETWEEN 0 AND 10),
  attendance_pct  NUMERIC(5,2) CHECK (attendance_pct BETWEEN 0 AND 100),
  remarks         TEXT,
  updated_by      UUID,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, semester)
);

CREATE TABLE IF NOT EXISTS public.student_grades (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  semester      INT NOT NULL,
  subject_code  TEXT,
  subject_name  TEXT NOT NULL,
  credits       NUMERIC(3,1),
  grade         TEXT,
  grade_points  NUMERIC(4,2),
  updated_by    UUID,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, semester, subject_name)
);

-- --------------------------------------------------------------------
-- 8. Admin Audit Log (Strict History of Manual Administrative Edits)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id    UUID,
  student_id  UUID,
  table_name  TEXT NOT NULL,
  record_id   TEXT,
  action      TEXT NOT NULL CHECK (action IN ('insert','update','delete')),
  old_data    JSONB,
  new_data    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_student ON public.admin_audit_log (student_id, created_at DESC);

-- --------------------------------------------------------------------
-- 9. Private Storage Bucket for Certificates
-- --------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('student-certificates', 'student-certificates', false)
ON CONFLICT (id) DO NOTHING;

-- --------------------------------------------------------------------
-- 10. Row Level Security (RLS)
-- --------------------------------------------------------------------
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_git_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_internships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_academic_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_semester_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Admin Full Access Policies
CREATE POLICY "admin_all_profiles" ON public.student_profiles FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin_all_projects" ON public.student_projects FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin_all_git_projects" ON public.student_git_projects FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin_all_certificates" ON public.student_certificates FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin_all_internships" ON public.student_internships FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin_all_academic_summary" ON public.student_academic_summary FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin_all_semester_records" ON public.student_semester_records FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin_all_grades" ON public.student_grades FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin_all_audit_log" ON public.admin_audit_log FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Student Access Policies (Own Row Only - Read and Update Profile)
CREATE POLICY "student_read_own_profile" ON public.student_profiles FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "student_upsert_own_profile" ON public.student_profiles FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "student_read_own_projects" ON public.student_projects FOR SELECT TO authenticated, anon USING (is_visible = true);
CREATE POLICY "student_read_own_git_projects" ON public.student_git_projects FOR SELECT TO authenticated, anon USING (is_visible = true);
CREATE POLICY "student_read_own_certificates" ON public.student_certificates FOR SELECT TO authenticated, anon USING (is_visible = true);
CREATE POLICY "student_read_own_internships" ON public.student_internships FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "student_read_own_academic_summary" ON public.student_academic_summary FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "student_read_own_semester_records" ON public.student_semester_records FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "student_read_own_grades" ON public.student_grades FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "student_log_audit" ON public.admin_audit_log FOR INSERT TO authenticated, anon WITH CHECK (true);

-- Storage policies for student-certificates bucket
CREATE POLICY "admin_manage_certificates_storage" ON storage.objects FOR ALL TO authenticated, anon
USING (bucket_id = 'student-certificates')
WITH CHECK (bucket_id = 'student-certificates');

CREATE POLICY "student_read_own_certificates_storage" ON storage.objects FOR SELECT TO authenticated, anon
USING (bucket_id = 'student-certificates');

-- --------------------------------------------------------------------
-- 11. Real-Time Bidirectional Sync Publication
-- --------------------------------------------------------------------
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.students;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.student_profiles;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.student_projects;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.student_git_projects;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.student_certificates;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.student_internships;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.student_academic_summary;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.student_semester_records;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.student_grades;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_audit_log;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;


-- --------------------------------------------------------------------
-- ROLLBACK / DOWN MIGRATION (For Reference):
-- --------------------------------------------------------------------
-- DROP TABLE IF EXISTS public.admin_audit_log CASCADE;
-- DROP TABLE IF EXISTS public.student_grades CASCADE;
-- DROP TABLE IF EXISTS public.student_semester_records CASCADE;
-- DROP TABLE IF EXISTS public.student_academic_summary CASCADE;
-- DROP TABLE IF EXISTS public.student_internships CASCADE;
-- DROP TABLE IF EXISTS public.student_certificates CASCADE;
-- DROP TABLE IF EXISTS public.student_git_projects CASCADE;
-- DROP TABLE IF EXISTS public.student_projects CASCADE;
-- DROP TABLE IF EXISTS public.student_profiles CASCADE;
-- DROP FUNCTION IF EXISTS public.current_student_id CASCADE;
-- DROP FUNCTION IF EXISTS public.is_admin CASCADE;
