
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ====================================================================
-- TABLE 1: EVENTS (Universal event registry)
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Core Info
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'PLACEMENT' CHECK (category IN (
    'PLACEMENT', 'CULTURAL', 'TECHNICAL', 'WORKSHOP',
    'SEMINAR', 'SPORTS', 'CUSTOM'
  )),
  event_type TEXT,                                       -- Admin-definable sub-label (e.g. "Hackathon", "Poetry Slam")

  -- Placement-specific (nullable for non-placement events)
  company_name TEXT,
  role_title TEXT,
  package_min_lpa DECIMAL(6,2),
  package_max_lpa DECIMAL(6,2),

  -- Logistics
  mode TEXT NOT NULL DEFAULT 'On-campus' CHECK (mode IN ('On-campus', 'Off-campus', 'Online', 'Hybrid')),
  venue TEXT,
  meeting_url TEXT,
  cover_image_url TEXT,

  -- Schedule
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  registration_deadline TIMESTAMPTZ,

  -- Eligibility
  eligibility JSONB NOT NULL DEFAULT '{}'::jsonb,        -- { departments[], batches[], minCgpa, maxBacklogs, notes }

  -- Recruitment pipeline (placement drives)
  rounds JSONB NOT NULL DEFAULT '[]'::jsonb,             -- [{ name, date }]

  -- SPOC / Liaison
  spoc JSONB NOT NULL DEFAULT '{}'::jsonb,               -- { name, email, phone, organisation }

  -- Status & Lifecycle
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'COMPLETED', 'CANCELLED')),
  cancellation_reason TEXT,

  -- Custom Registration Form
  form_slug TEXT UNIQUE,                                  -- Shareable URL slug: /register/<form_slug>
  form_schema JSONB NOT NULL DEFAULT '[]'::jsonb,         -- [{ id, type, label, placeholder, required, options[] }]
  form_settings JSONB NOT NULL DEFAULT '{}'::jsonb,       -- { allowMultiple, requireAuth, maxRegistrations, customSuccessMessage }

  -- Tags & Metadata
  tags TEXT[] DEFAULT '{}',

  -- Registration links (legacy compat)
  registration_links JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Announcements
  announcements JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Results (placement)
  results JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Notification log
  notifications JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Audit
  created_by TEXT DEFAULT 'T&P Administration',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for events
CREATE INDEX IF NOT EXISTS idx_events_category ON public.events (category);
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events (status);
CREATE INDEX IF NOT EXISTS idx_events_starts_at ON public.events (starts_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_form_slug ON public.events (form_slug);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON public.events (created_at DESC);

-- RLS for events
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read published events" ON public.events;
CREATE POLICY "Public read published events"
  ON public.events
  FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Admins full access on events" ON public.events;
CREATE POLICY "Admins full access on events"
  ON public.events
  FOR ALL
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- ====================================================================
-- TABLE 2: EVENT REGISTRATIONS (Student form submissions)
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.event_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Event reference
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,

  -- Student core info
  student_roll_no TEXT NOT NULL,
  student_name TEXT NOT NULL,
  student_email TEXT,
  student_phone TEXT,
  department TEXT,
  semester TEXT,

  -- Dynamic form responses
  form_responses JSONB NOT NULL DEFAULT '{}'::jsonb,     -- { field_id: value }

  -- Status
  status TEXT NOT NULL DEFAULT 'REGISTERED' CHECK (status IN (
    'REGISTERED', 'CONFIRMED', 'REJECTED', 'WAITLISTED', 'ATTENDED'
  )),

  -- Audit
  registered_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  -- Prevent duplicate registrations
  CONSTRAINT unq_event_student_registration UNIQUE (event_id, student_roll_no)
);

-- Indexes for registrations
CREATE INDEX IF NOT EXISTS idx_event_registrations_event ON public.event_registrations (event_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_roll ON public.event_registrations (upper(trim(student_roll_no)));
CREATE INDEX IF NOT EXISTS idx_event_registrations_status ON public.event_registrations (status);
CREATE INDEX IF NOT EXISTS idx_event_registrations_date ON public.event_registrations (registered_at DESC);

-- RLS for registrations
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read registrations" ON public.event_registrations;
CREATE POLICY "Public read registrations"
  ON public.event_registrations
  FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Public insert registrations" ON public.event_registrations;
CREATE POLICY "Public insert registrations"
  ON public.event_registrations
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins full access on registrations" ON public.event_registrations;
CREATE POLICY "Admins full access on registrations"
  ON public.event_registrations
  FOR ALL
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- ====================================================================
-- REALTIME PUBLICATION
-- ====================================================================

ALTER TABLE public.events REPLICA IDENTITY FULL;
ALTER TABLE public.event_registrations REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.event_registrations;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ====================================================================
-- TRIGGER: Auto-generate form_slug on event insert
-- ====================================================================

CREATE OR REPLACE FUNCTION public.fn_generate_event_form_slug()
RETURNS TRIGGER AS $$
DECLARE
  v_base_slug TEXT;
  v_suffix TEXT;
BEGIN
  -- Generate base slug from title
  v_base_slug := lower(regexp_replace(
    regexp_replace(NEW.title, '[^a-zA-Z0-9\s]', '', 'g'),
    '\s+', '-', 'g'
  ));
  
  -- Truncate to 40 chars and append random suffix
  v_base_slug := left(v_base_slug, 40);
  v_suffix := substr(md5(gen_random_uuid()::text), 1, 6);
  
  NEW.form_slug := v_base_slug || '-' || v_suffix;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_event_slug ON public.events;
CREATE TRIGGER trg_auto_event_slug
  BEFORE INSERT ON public.events
  FOR EACH ROW
  WHEN (NEW.form_slug IS NULL)
  EXECUTE FUNCTION public.fn_generate_event_form_slug();

-- ====================================================================
-- TRIGGER: Auto-update updated_at timestamp
-- ====================================================================

CREATE OR REPLACE FUNCTION public.fn_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_events_updated_at ON public.events;
CREATE TRIGGER trg_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_events_updated_at();

DROP TRIGGER IF EXISTS trg_registrations_updated_at ON public.event_registrations;
CREATE TRIGGER trg_registrations_updated_at
  BEFORE UPDATE ON public.event_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_events_updated_at();


-- ====================================================================
-- TRIGGER: Auto-create notification when event is published
-- ====================================================================

CREATE OR REPLACE FUNCTION public.fn_notify_on_event_published()
RETURNS TRIGGER AS $$
DECLARE
  v_category_label TEXT;
  v_details TEXT;
BEGIN
  -- Only trigger when status changes to PUBLISHED
  IF NEW.status = 'PUBLISHED' AND (OLD.status IS NULL OR OLD.status != 'PUBLISHED') THEN
    
    -- Map category to readable label
    v_category_label := CASE NEW.category
      WHEN 'PLACEMENT' THEN 'Placement Drive'
      WHEN 'CULTURAL' THEN 'Cultural Event'
      WHEN 'TECHNICAL' THEN 'Technical Event'
      WHEN 'WORKSHOP' THEN 'Workshop'
      WHEN 'SEMINAR' THEN 'Seminar'
      WHEN 'SPORTS' THEN 'Sports Event'
      ELSE 'Event'
    END;

    v_details := coalesce(NEW.company_name, '') || 
      CASE WHEN NEW.venue IS NOT NULL THEN ' • Venue: ' || NEW.venue ELSE '' END ||
      CASE WHEN NEW.starts_at IS NOT NULL THEN ' • Date: ' || to_char(NEW.starts_at, 'DD Mon YYYY, HH12:MI AM') ELSE '' END;

    INSERT INTO public.notifications (
      title,
      message,
      type,
      priority,
      target_type,
      target_id,
      data,
      action_route,
      created_by
    ) VALUES (
      v_category_label || ': ' || NEW.title,
      'A new ' || lower(v_category_label) || ' has been announced — ' || NEW.title || '. ' || v_details || '. Register now through the student portal.',
      CASE WHEN NEW.category = 'PLACEMENT' THEN 'drive' ELSE 'announcement' END,
      'HIGH',
      'all',
      NULL,
      jsonb_build_object(
        'event_id', NEW.id,
        'category', NEW.category,
        'form_slug', NEW.form_slug,
        'company_name', coalesce(NEW.company_name, ''),
        'starts_at', NEW.starts_at,
        'registration_deadline', NEW.registration_deadline
      ),
      'placement',
      coalesce(NEW.created_by, 'T&P Administration')
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_event_published ON public.events;
CREATE TRIGGER trg_notify_event_published
  AFTER INSERT OR UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_notify_on_event_published();

