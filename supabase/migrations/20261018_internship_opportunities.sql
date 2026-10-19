-- Migration: 20261018_internship_opportunities.sql
-- Description: Companies & Internship Opportunities schema, RLS policies, realtime publication, and student_internships extension

CREATE TABLE IF NOT EXISTS public.internship_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT,                                   -- companies.id (nullable for unregistered partners)
  company_name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  required_skills TEXT[] NOT NULL DEFAULT '{}',
  eligible_departments TEXT[] NOT NULL DEFAULT '{}',
  duration_months INT NOT NULL CHECK (duration_months BETWEEN 1 AND 24),
  season TEXT NOT NULL DEFAULT 'any' CHECK (season IN ('winter','summer','spring','autumn','any')),
  compensation_type TEXT NOT NULL CHECK (compensation_type IN ('stipend','non_stipend','paid')),
  stipend_amount NUMERIC(10,2) CHECK (stipend_amount IS NULL OR stipend_amount > 0),
  fee_amount NUMERIC(10,2) CHECK (fee_amount IS NULL OR fee_amount > 0),
  work_mode TEXT NOT NULL DEFAULT 'onsite' CHECK (work_mode IN ('onsite','remote','hybrid')),
  location TEXT,
  seats INT CHECK (seats IS NULL OR seats > 0),
  application_deadline DATE,
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','open','closed','filled')),
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT chk_comp_amounts CHECK (
    (compensation_type = 'stipend'     AND stipend_amount IS NOT NULL AND fee_amount IS NULL) OR
    (compensation_type = 'paid'        AND fee_amount     IS NOT NULL AND stipend_amount IS NULL) OR
    (compensation_type = 'non_stipend' AND stipend_amount IS NULL AND fee_amount IS NULL)
  ),
  CONSTRAINT chk_dates CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_intern_opp_status   ON public.internship_opportunities (status);
CREATE INDEX IF NOT EXISTS idx_intern_opp_season   ON public.internship_opportunities (season);
CREATE INDEX IF NOT EXISTS idx_intern_opp_comp     ON public.internship_opportunities (compensation_type);
CREATE INDEX IF NOT EXISTS idx_intern_opp_skills   ON public.internship_opportunities USING GIN (required_skills);

ALTER TABLE public.internship_opportunities ENABLE ROW LEVEL SECURITY;

-- Admins: full CRUD via public.is_admin()
DROP POLICY IF EXISTS "Admins full access on internship_opportunities" ON public.internship_opportunities;
CREATE POLICY "Admins full access on internship_opportunities"
  ON public.internship_opportunities
  FOR ALL
  TO authenticated, anon
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Students: SELECT only where status = 'open' AND is_visible = true
DROP POLICY IF EXISTS "Students select visible open internship_opportunities" ON public.internship_opportunities;
CREATE POLICY "Students select visible open internship_opportunities"
  ON public.internship_opportunities
  FOR SELECT
  TO authenticated
  USING (status = 'open' AND is_visible = true);

-- Enable Supabase Realtime for internship_opportunities
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.internship_opportunities;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Link existing student internship assignments to the new classification (all nullable, non-breaking):
ALTER TABLE public.student_internships
  ADD COLUMN IF NOT EXISTS opportunity_id UUID REFERENCES public.internship_opportunities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS duration_months INT CHECK (duration_months IS NULL OR duration_months BETWEEN 1 AND 24),
  ADD COLUMN IF NOT EXISTS season TEXT CHECK (season IS NULL OR season IN ('winter','summer','spring','autumn','any')),
  ADD COLUMN IF NOT EXISTS compensation_type TEXT CHECK (compensation_type IS NULL OR compensation_type IN ('stipend','non_stipend','paid')),
  ADD COLUMN IF NOT EXISTS fee_amount NUMERIC(10,2);
