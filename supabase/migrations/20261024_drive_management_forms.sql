-- ====================================================================
-- RIMT UNIVERSITY: DRIVE MANAGEMENT & DYNAMIC FORMS ENGINE
-- Migration: 20261024_drive_management_forms.sql
-- Spec: DRIVE_MANAGEMENT_AGENT.md
-- Description:
--   1. Creates public.drives, public.drive_forms, public.notifications
--   2. Extends public.drive_registrations with form_id and answers jsonb
--   3. Implements is_admin() and current_student_id() helpers
--   4. Implements atomic publish_drive and register_for_drive RPCs
--   5. Enforces Row Level Security (RLS) & Realtime Publication
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ====================================================================
-- 1. SECURITY & IDENTITY HELPERS
-- ====================================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
     OR coalesce(auth.jwt() ->> 'role', '') = 'admin'
     OR coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
     OR auth.role() = 'service_role'
     OR EXISTS (
       SELECT 1 FROM public.admins a
       WHERE (a.id = auth.uid() OR lower(a.email) = lower(auth.jwt() ->> 'email'))
         AND lower(a.status) = 'active'
     );
$$;

CREATE OR REPLACE FUNCTION public.current_student_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id FROM public.students s
  WHERE s.id = auth.uid()
     OR (auth.uid() IS NOT NULL AND lower(s.email) = lower(auth.jwt() ->> 'email'))
  LIMIT 1;
$$;

-- ====================================================================
-- 2. CORE DRIVES TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.drives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE,                                   -- Assigned on first publish
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 3 AND 150),
  type TEXT NOT NULL CHECK (type IN ('event', 'function', 'company', 'notice')),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed')),
  registration_enabled BOOLEAN NOT NULL DEFAULT true,
  deadline TIMESTAMPTZ,
  max_registrations INT CHECK (max_registrations IS NULL OR max_registrations > 0),
  eligible_branches TEXT[],                           -- NULL = all branches eligible
  eligible_years INT[],                               -- NULL = all years eligible
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_drives_slug ON public.drives (slug);
CREATE INDEX IF NOT EXISTS idx_drives_status ON public.drives (status);
CREATE INDEX IF NOT EXISTS idx_drives_type ON public.drives (type);

-- ====================================================================
-- 3. DRIVE FORMS TABLE (SCHEMA VERSIONING)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.drive_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drive_id UUID NOT NULL REFERENCES public.drives(id) ON DELETE CASCADE,
  version INT NOT NULL,
  schema JSONB NOT NULL DEFAULT '[]'::jsonb,
  published_at TIMESTAMPTZ,                           -- NULL indicates the single draft
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (drive_id, version)
);

CREATE UNIQUE INDEX IF NOT EXISTS drive_forms_one_draft 
  ON public.drive_forms (drive_id) 
  WHERE published_at IS NULL;

-- ====================================================================
-- 4. ENSURE DRIVE REGISTRATIONS TABLE SUPPORTS DYNAMIC FORMS
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.drive_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drive_id TEXT NOT NULL,
  student_id UUID,
  student_name TEXT,
  roll_no TEXT,
  email TEXT,
  phone TEXT,
  department TEXT,
  semester TEXT,
  cgpa NUMERIC(4,2),
  resume_url TEXT,
  form_id UUID REFERENCES public.drive_forms(id) ON DELETE SET NULL,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  registration_source TEXT DEFAULT 'mobile_app',
  status TEXT NOT NULL DEFAULT 'REGISTERED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure columns exist if table was already created
ALTER TABLE public.drive_registrations ADD COLUMN IF NOT EXISTS form_id UUID REFERENCES public.drive_forms(id) ON DELETE SET NULL;
ALTER TABLE public.drive_registrations ADD COLUMN IF NOT EXISTS answers JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.drive_registrations ADD COLUMN IF NOT EXISTS student_id UUID;
ALTER TABLE public.drive_registrations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_drive_registrations_drive_created ON public.drive_registrations (drive_id, created_at DESC);

-- ====================================================================
-- 5. IN-APP NOTIFICATIONS TABLE (NO EXTERNAL PUSH PROVIDER)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  drive_id UUID REFERENCES public.drives(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'drive_published',
  title TEXT NOT NULL,
  body TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_student_created ON public.notifications (student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_student_unread ON public.notifications (student_id) WHERE read_at IS NULL;

-- ====================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================
ALTER TABLE public.drives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drive_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drive_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Drives RLS
DROP POLICY IF EXISTS drives_admin_all ON public.drives;
CREATE POLICY drives_admin_all ON public.drives FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS drives_student_read ON public.drives;
CREATE POLICY drives_student_read ON public.drives FOR SELECT USING (
  status IN ('published', 'closed') AND (
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = public.current_student_id()
        AND (
          drives.eligible_branches IS NULL 
          OR coalesce(s.department, s.course) = ANY(drives.eligible_branches)
        )
    )
    OR public.current_student_id() IS NULL -- Fallback for general public browse
  )
);

-- Forms RLS: Admins have full access; students read published schemas of accessible drives
DROP POLICY IF EXISTS forms_admin_all ON public.drive_forms;
CREATE POLICY forms_admin_all ON public.drive_forms FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS forms_student_read ON public.drive_forms;
CREATE POLICY forms_student_read ON public.drive_forms FOR SELECT USING (
  published_at IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.drives d WHERE d.id = drive_id AND d.status IN ('published', 'closed')
  )
);

-- Registrations RLS: Admins read all; students read own; no direct write for students
DROP POLICY IF EXISTS regs_admin_read ON public.drive_registrations;
CREATE POLICY regs_admin_read ON public.drive_registrations FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS regs_student_read ON public.drive_registrations;
CREATE POLICY regs_student_read ON public.drive_registrations FOR SELECT
  USING (student_id = public.current_student_id() OR roll_no = (SELECT roll_no FROM public.students WHERE id = public.current_student_id()));

-- Notifications RLS: Students read and mark own notifications as read
DROP POLICY IF EXISTS notif_student_read ON public.notifications;
CREATE POLICY notif_student_read ON public.notifications FOR SELECT
  USING (student_id = public.current_student_id());

DROP POLICY IF EXISTS notif_student_update ON public.notifications;
CREATE POLICY notif_student_update ON public.notifications FOR UPDATE
  USING (student_id = public.current_student_id())
  WITH CHECK (student_id = public.current_student_id());

-- ====================================================================
-- 7. REALTIME REPLICATION CONFIGURATION
-- ====================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.drives;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.drive_registrations;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- ====================================================================
-- 8. RPC: publish_drive (Admin Only, Security Definer)
-- ====================================================================
CREATE OR REPLACE FUNCTION public.publish_drive(p_drive_id uuid, p_schema jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  d public.drives;
  v int := 1;
  first_publish boolean;
  new_slug text;
  n int := 0;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT * INTO d FROM public.drives WHERE id = p_drive_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  IF d.status = 'closed' THEN
    RAISE EXCEPTION 'DRIVE_CLOSED';
  END IF;

  first_publish := d.published_at IS NULL;
  new_slug := d.slug;
  WHILE new_slug IS NULL LOOP
    new_slug := substr(encode(gen_random_bytes(8), 'hex'), 1, 10);
    IF EXISTS (SELECT 1 FROM public.drives WHERE slug = new_slug) THEN
      new_slug := NULL;
    END IF;
  END LOOP;

  IF d.registration_enabled THEN
    -- Delete existing draft form if present
    DELETE FROM public.drive_forms WHERE drive_id = d.id AND published_at IS NULL;
    
    -- Calculate next form version
    SELECT coalesce(max(version), 0) + 1 INTO v FROM public.drive_forms WHERE drive_id = d.id;
    
    -- Insert new published form version
    INSERT INTO public.drive_forms (drive_id, version, schema, published_at)
    VALUES (d.id, v, coalesce(p_schema, '[]'::jsonb), now());
  END IF;

  -- Update drive state
  UPDATE public.drives
     SET slug = new_slug,
         status = 'published',
         published_at = coalesce(published_at, now()),
         updated_at = now()
   WHERE id = d.id;

  -- Create in-app notifications on first publish for eligible students
  IF first_publish THEN
    INSERT INTO public.notifications (student_id, drive_id, title, body)
    SELECT s.id, d.id, d.title, left(coalesce(d.description, 'New campus drive or event announcement.'), 140)
      FROM public.students s
     WHERE (d.eligible_branches IS NULL OR coalesce(s.department, s.course) = ANY(d.eligible_branches));
    GET DIAGNOSTICS n = row_count;
  END IF;

  RETURN jsonb_build_object(
    'slug', new_slug,
    'form_version', v,
    'notified', n
  );
END;
$$;

-- ====================================================================
-- 9. RPC: register_for_drive (Student Only, Security Definer)
-- ====================================================================
CREATE OR REPLACE FUNCTION public.register_for_drive(p_slug text, p_answers jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sid uuid;
  s public.students;
  d public.drives;
  f uuid;
  reg uuid;
BEGIN
  sid := public.current_student_id();
  IF sid IS NULL THEN
    RAISE EXCEPTION 'NOT_A_STUDENT';
  END IF;

  SELECT * INTO s FROM public.students WHERE id = sid;
  
  -- Row lock serializes capacity checks
  SELECT * INTO d FROM public.drives WHERE slug = p_slug FOR UPDATE;
  IF NOT FOUND OR d.status = 'draft' THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  IF d.status = 'closed' OR NOT d.registration_enabled OR (d.deadline IS NOT NULL AND now() > d.deadline) THEN
    RAISE EXCEPTION 'REGISTRATION_CLOSED';
  END IF;

  IF (d.eligible_branches IS NOT NULL AND NOT coalesce(coalesce(s.department, s.course) = ANY(d.eligible_branches), false)) THEN
    RAISE EXCEPTION 'NOT_ELIGIBLE';
  END IF;

  IF d.max_registrations IS NOT NULL AND (
    SELECT count(*) FROM public.drive_registrations WHERE drive_id = d.id::text
  ) >= d.max_registrations THEN
    RAISE EXCEPTION 'DRIVE_FULL';
  END IF;

  -- Check if already registered
  IF EXISTS (
    SELECT 1 FROM public.drive_registrations 
    WHERE drive_id = d.id::text AND (student_id = sid OR roll_no = coalesce(s.roll_number, s.roll_no))
  ) THEN
    RAISE EXCEPTION 'ALREADY_REGISTERED';
  END IF;

  -- Get latest published form
  SELECT id INTO f FROM public.drive_forms
   WHERE drive_id = d.id AND published_at IS NOT NULL
   ORDER BY version DESC LIMIT 1;

  INSERT INTO public.drive_registrations (
    drive_id,
    form_id,
    student_id,
    student_name,
    roll_no,
    email,
    phone,
    department,
    semester,
    answers,
    registration_source,
    status
  ) VALUES (
    d.id::text,
    f,
    sid,
    coalesce(s.full_name, s.name, 'Student'),
    coalesce(s.roll_number, s.roll_no, 'UNSPECIFIED'),
    s.email,
    s.phone,
    coalesce(s.department, s.course, 'General'),
    coalesce(s.year_semester, s.semester, s.batch, '1st Sem'),
    coalesce(p_answers, '{}'::jsonb),
    'mobile_app',
    'REGISTERED'
  ) RETURNING id INTO reg;

  RETURN jsonb_build_object('registration_id', reg);
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'ALREADY_REGISTERED';
END;
$$;

-- ====================================================================
-- 10. GRANTS
-- ====================================================================
REVOKE ALL ON FUNCTION public.publish_drive(uuid, jsonb) FROM public;
REVOKE ALL ON FUNCTION public.register_for_drive(text, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.publish_drive(uuid, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.register_for_drive(text, jsonb) TO authenticated, service_role;
