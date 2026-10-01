-- ====================================================================
-- RIMT UNIVERSITY: GATED ONBOARDING & ADMIN AUTH SCHEMA MIGRATION
-- Shared Schema for Admin Portal and Student App
-- Execute this script directly in the Supabase SQL Editor
-- ====================================================================

-- 1. Enable UUID Extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ====================================================================
-- MODULE 1: STUDENT ONBOARDING TABLE
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT,
  name TEXT,                                  -- Mobile app alias
  roll_number TEXT,
  roll_no TEXT,                               -- Mobile app alias
  department TEXT,
  course TEXT,                                -- Mobile app alias
  year_semester TEXT,
  batch TEXT,                                 -- Mobile app alias
  semester TEXT,                              -- Mobile app alias
  email TEXT,
  password_hash TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'REVOKED')),
  role TEXT NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN')),
  rejection_reason TEXT,
  revocation_reason TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  phone TEXT,
  avatar_url TEXT,
  banner_url TEXT,
  headline TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Unique indexes on roll numbers & emails
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_roll_number_unique 
  ON public.students (upper(trim(coalesce(roll_number, roll_no))))
  WHERE coalesce(roll_number, roll_no) IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_students_status 
  ON public.students (status);

-- ====================================================================
-- MODULE 2: ADMIN AUTHENTICATION TABLE (NEW-FEATURE.md /admin-panel/auth)
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  profile_pic_url TEXT,
  role TEXT NOT NULL DEFAULT 'ADMIN' CHECK (role IN ('ADMIN', 'SUPER_ADMIN')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DISABLED')),
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Case-insensitive unique index on email
CREATE UNIQUE INDEX IF NOT EXISTS idx_admins_email_unique 
  ON public.admins (lower(trim(email)));

-- Fast index for status filtering
CREATE INDEX IF NOT EXISTS idx_admins_status 
  ON public.admins (status);

-- Enable Row Level Security (RLS)
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Allow public/authenticated read & write policies for Admin operations
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'admins' AND policyname = 'Admins read access'
  ) THEN
    CREATE POLICY "Admins read access" ON public.admins
      FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'admins' AND policyname = 'Admins write access'
  ) THEN
    CREATE POLICY "Admins write access" ON public.admins
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Grant API permissions
GRANT ALL ON TABLE public.admins TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.students TO anon, authenticated, service_role;

-- ====================================================================
-- MODULE 3: SEED DEFAULT ADMINISTRATOR ACCOUNT
-- Credentials: dean.tp.rimt@gmail.com / Admin@1234
-- ====================================================================

INSERT INTO public.admins (
  id,
  full_name,
  email,
  password_hash,
  profile_pic_url,
  role,
  status,
  created_at,
  updated_at
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Prof. H. S. Bawa',
  'dean.tp.rimt@gmail.com',
  '3aef4c7fa4360e22467d30f7690623dbe0d10beae0697ad9226162391ce4f52d', -- PBKDF2 hash of Admin@1234
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBuJFov-8nCrBTs3RZdR6gNnHPK7-OqoZWkaainCk_EWKXLPDEEfEf9bygbDF3S9aYJ8SHx8bU3-gRahDOd_evx6Hv2jJEihZSIMMILC3smv0WefgvgIJrx5v93zacLG7J_TrJYrFZWKRGyYpjxE3ZyPe9zi5sTpBJk7vSkJ938d2J3lbJBHjC3mUpvfzYyoJICWKWfLuPD4KXEDQJ7ewtQlfUI7JOFLivTiFHSEjqgCEkLhlHPAVqP',
  'ADMIN',
  'ACTIVE',
  timezone('utc'::text, now()),
  timezone('utc'::text, now())
) ON CONFLICT (email) DO UPDATE SET
  status = 'ACTIVE',
  role = 'ADMIN',
  updated_at = timezone('utc'::text, now());
