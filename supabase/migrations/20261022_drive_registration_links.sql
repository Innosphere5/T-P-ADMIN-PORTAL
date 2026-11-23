-- ====================================================================
-- RIMT UNIVERSITY: DRIVE MANAGEMENT & REGISTRATION LINKS SCHEMA
-- Migration: 20261022_drive_registration_links.sql
-- Description:
--   1. placement_drives: Stores placement drives, university events,
--      department competitions, hackathons, and technical workshops.
--   2. drive_registrations: Stores student applications & credentials
--      submitted directly from mobile app or admin portal.
--   3. Enables Supabase Realtime for instant synchronization.
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ====================================================================
-- 1. PLACEMENT DRIVES & UNIVERSITY EVENTS TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.placement_drives (
  id TEXT PRIMARY KEY DEFAULT ('drive_' || extract(epoch from now())::bigint || '_' || substr(md5(random()::text), 1, 6)),
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'COMPANY_RECRUITMENT' CHECK (
    category IN ('COMPANY_RECRUITMENT', 'COLLEGE_EVENT', 'COMPETITION', 'WORKSHOP', 'PLACEMENT_ACTIVITY')
  ),
  company_name TEXT,                             -- Company or Host Department / Club
  role_title TEXT,                               -- Designation or Event / Contest Theme
  description TEXT,
  mode TEXT NOT NULL DEFAULT 'On-campus',        -- On-campus, Virtual, Hybrid
  venue TEXT,
  meeting_url TEXT,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  registration_deadline TIMESTAMPTZ,
  package_min_lpa NUMERIC(6,2),                  -- LPA or Min Prize Pool
  package_max_lpa NUMERIC(6,2),                  -- LPA or Max Prize Pool
  eligibility JSONB NOT NULL DEFAULT '{
    "departments": ["BCA", "B.Sc Cyber Security", "B.Sc IT"],
    "batches": ["3rd Year (5th Sem)"],
    "minCgpa": 6.5,
    "maxBacklogs": 0,
    "notes": ""
  }'::jsonb,
  rounds JSONB NOT NULL DEFAULT '[]'::jsonb,
  spoc JSONB NOT NULL DEFAULT '{
    "name": "",
    "email": "",
    "phone": "",
    "organisation": ""
  }'::jsonb,
  status TEXT NOT NULL DEFAULT 'PUBLISHED' CHECK (
    status IN ('DRAFT', 'PUBLISHED', 'COMPLETED', 'CANCELLED')
  ),
  registration_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  announcements JSONB NOT NULL DEFAULT '[]'::jsonb,
  results JSONB NOT NULL DEFAULT '[]'::jsonb,
  notifications JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by TEXT DEFAULT 'T&P Administration',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_placement_drives_category ON public.placement_drives (category);
CREATE INDEX IF NOT EXISTS idx_placement_drives_status   ON public.placement_drives (status);
CREATE INDEX IF NOT EXISTS idx_placement_drives_dates    ON public.placement_drives (starts_at, registration_deadline);

-- ====================================================================
-- 2. DRIVE REGISTRATIONS TABLE (STUDENT CREDENTIALS & REGISTRATIONS)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.drive_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drive_id TEXT NOT NULL,                         -- References placement_drives.id
  student_id TEXT,                                -- students.id or roll_number
  student_name TEXT NOT NULL,
  roll_no TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  department TEXT,
  semester TEXT,
  cgpa NUMERIC(4,2),
  resume_url TEXT,
  registration_link_id TEXT,                      -- specific link id if clicked from a configured portal
  registration_source TEXT DEFAULT 'mobile_app' CHECK (
    registration_source IN ('mobile_app', 'web_admin', 'google_docs', 'external_portal')
  ),
  status TEXT NOT NULL DEFAULT 'REGISTERED' CHECK (
    status IN ('REGISTERED', 'SHORTLISTED', 'REJECTED', 'OFFERED', 'WITHDRAWN')
  ),
  notes TEXT,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  metadata JSONB DEFAULT '{}'::jsonb,
  CONSTRAINT uq_drive_student_registration UNIQUE (drive_id, roll_no)
);

CREATE INDEX IF NOT EXISTS idx_drive_registrations_drive_id ON public.drive_registrations (drive_id);
CREATE INDEX IF NOT EXISTS idx_drive_registrations_roll_no  ON public.drive_registrations (roll_no);
CREATE INDEX IF NOT EXISTS idx_drive_registrations_status   ON public.drive_registrations (status);

-- ====================================================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================
ALTER TABLE public.placement_drives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drive_registrations ENABLE ROW LEVEL SECURITY;

-- Allow read access to all users (students and admins)
DROP POLICY IF EXISTS "Public select placement_drives" ON public.placement_drives;
CREATE POLICY "Public select placement_drives"
  ON public.placement_drives
  FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Public full access placement_drives" ON public.placement_drives;
CREATE POLICY "Public full access placement_drives"
  ON public.placement_drives
  FOR ALL
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- Allow students to read and insert registrations
DROP POLICY IF EXISTS "Public select drive_registrations" ON public.drive_registrations;
CREATE POLICY "Public select drive_registrations"
  ON public.drive_registrations
  FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Public insert drive_registrations" ON public.drive_registrations;
CREATE POLICY "Public insert drive_registrations"
  ON public.drive_registrations
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public update drive_registrations" ON public.drive_registrations;
CREATE POLICY "Public update drive_registrations"
  ON public.drive_registrations
  FOR ALL
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- Grant privileges to anon and authenticated roles
GRANT ALL ON TABLE public.placement_drives TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.drive_registrations TO anon, authenticated, service_role;

-- ====================================================================
-- 4. ENABLE REALTIME REPLICATION FOR DRIVES & REGISTRATIONS
-- ====================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.placement_drives;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.drive_registrations;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

ALTER TABLE public.placement_drives REPLICA IDENTITY FULL;
ALTER TABLE public.drive_registrations REPLICA IDENTITY FULL;

-- ====================================================================
-- 5. SEED INITIAL UNIVERSITY DRIVES & EVENTS
-- ====================================================================
INSERT INTO public.placement_drives (
  id,
  title,
  category,
  company_name,
  role_title,
  description,
  mode,
  venue,
  starts_at,
  ends_at,
  registration_deadline,
  package_min_lpa,
  package_max_lpa,
  eligibility,
  rounds,
  status,
  registration_links
) VALUES
(
  'drive_lt_2026',
  'Larsen & Toubro Ltd — Campus Recruitment Drive',
  'COMPANY_RECRUITMENT',
  'Larsen & Toubro Ltd',
  'Graduate Engineer Trainee (GET) & Software Engineer',
  'Larsen & Toubro is conducting an exclusive on-campus recruitment drive for BCA, MCA, and B.Sc Computer Science scholars. The selection pipeline includes Online Aptitude, Technical viva, and Leadership HR interview.',
  'On-campus',
  'Auditorium 1 & Systems Lab 4',
  timezone('utc'::text, now() + interval '5 days'),
  timezone('utc'::text, now() + interval '5 days 6 hours'),
  timezone('utc'::text, now() + interval '3 days'),
  7.50,
  13.50,
  '{"departments":["BCA","B.Sc Cyber Security","B.Sc IT"],"batches":["3rd Year (5th Sem)","3rd Year (6th Sem)"],"minCgpa":6.5,"maxBacklogs":0,"notes":"Minimum 60% aggregate across 10th and 12th standards."}'::jsonb,
  '[{"name":"1. Online Technical Assessment"},{"name":"2. Technical Viva & Code Review"},{"name":"3. Senior Leadership HR"}]'::jsonb,
  'PUBLISHED',
  '[{"id":"link_lt_google_docs","label":"Official Google Form / Docs Registration","url":"https://docs.google.com/forms/d/e/1FAIpQLSc_ExampleLTForm/viewform","opensAt":null,"closesAt":null,"enabled":true}]'::jsonb
),
(
  'drive_carva_freshers_2026',
  'Carva Celebration for Freshers 2026 & Department Talent Hunt',
  'COLLEGE_EVENT',
  'Department of Computer Applications & Cultural Committee',
  'Annual Freshers Celebration, Stage Performances & Technical Showcase',
  'University Department Annual Event: Carva Celebration for 1st-year scholars. Includes cultural performances, technical project showcase, Mr. & Ms. Fresher contest, and institutional honors. All department students must register their entries.',
  'On-campus',
  'RIMT Central Auditorium & Campus Lawns',
  timezone('utc'::text, now() + interval '8 days'),
  timezone('utc'::text, now() + interval '8 days 8 hours'),
  timezone('utc'::text, now() + interval '6 days'),
  NULL,
  NULL,
  '{"departments":["BCA","B.Sc Cyber Security","B.Sc IT","B.Sc (Hons) AI & ML"],"batches":["1st Year (1st Sem)","2nd Year (3rd Sem)","3rd Year (5th Sem)"],"minCgpa":null,"maxBacklogs":null,"notes":"Open to all enrolled students of Computer Applications."}'::jsonb,
  '[{"name":"1. Entry Registration"},{"name":"2. Audition & Stage Rehearsal"},{"name":"3. Grand Gala Presentation"}]'::jsonb,
  'PUBLISHED',
  '[{"id":"link_carva_google_docs","label":"Carva Freshers Google Docs Registration Link","url":"https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?usp=sharing","opensAt":null,"closesAt":null,"enabled":true}]'::jsonb
),
(
  'drive_hackathon_2026',
  'RIMT Cyber Hackathon & Innovation Contest 2026',
  'COMPETITION',
  'Cyber Security & Computing Club (RIMT Trust)',
  '24-Hour Rapid Prototyping & AI Security Challenge',
  'Department competition targeting cutting-edge AI security, secure coding, and cloud deployments. Cash prize pool of ₹50,000 for top 3 teams. Certified by NAAC / IEEE Student Branch.',
  'Hybrid',
  'Systems Innovation Lab 2 & Virtual Portal',
  timezone('utc'::text, now() + interval '12 days'),
  timezone('utc'::text, now() + interval '13 days'),
  timezone('utc'::text, now() + interval '10 days'),
  NULL,
  NULL,
  '{"departments":["BCA","B.Sc Cyber Security","B.Sc IT"],"batches":["1st Year (2nd Sem)","2nd Year (3rd Sem)","2nd Year (4th Sem)","3rd Year (5th Sem)"],"minCgpa":6.0,"maxBacklogs":2,"notes":"Teams of 2 to 4 members."}'::jsonb,
  '[{"name":"1. Idea Abstract Submission"},{"name":"2. 24-Hour Prototype Build"},{"name":"3. Jury Evaluation & Award Ceremony"}]'::jsonb,
  'PUBLISHED',
  '[{"id":"link_hackathon_google_docs","label":"Hackathon Team Google Docs Entry Form","url":"https://docs.google.com/forms/d/e/1FAIpQLSc_ExampleHackathon/viewform","opensAt":null,"closesAt":null,"enabled":true}]'::jsonb
)
ON CONFLICT (id) DO NOTHING;
