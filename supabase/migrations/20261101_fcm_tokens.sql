-- ====================================================================
-- RIMT UNIVERSITY: FCM PUSH NOTIFICATION TOKEN STORAGE
-- Migration: 20261101_fcm_tokens
-- Stores device FCM registration tokens for real-time push delivery
-- ====================================================================

-- 1. FCM Device Tokens Table
CREATE TABLE IF NOT EXISTS public.fcm_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roll_no TEXT NOT NULL,
  token TEXT NOT NULL,
  device_platform TEXT DEFAULT 'android' CHECK (device_platform IN ('android', 'ios', 'web')),
  token_type TEXT DEFAULT 'fcm' CHECK (token_type IN ('fcm', 'expo')),
  is_active BOOLEAN DEFAULT true,
  last_refreshed_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Unique constraint: one token per device per student
CREATE UNIQUE INDEX IF NOT EXISTS idx_fcm_tokens_roll_token
  ON public.fcm_tokens (upper(trim(roll_no)), token);

-- Fast lookup by roll number for targeted notifications
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_roll_no
  ON public.fcm_tokens (upper(trim(roll_no)));

-- Fast lookup for active tokens only
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_active
  ON public.fcm_tokens (is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.fcm_tokens ENABLE ROW LEVEL SECURITY;

-- Allow read/write for all roles (tokens are non-sensitive device identifiers)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'fcm_tokens' AND policyname = 'FCM tokens read access'
  ) THEN
    CREATE POLICY "FCM tokens read access" ON public.fcm_tokens
      FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'fcm_tokens' AND policyname = 'FCM tokens write access'
  ) THEN
    CREATE POLICY "FCM tokens write access" ON public.fcm_tokens
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Grant permissions
GRANT ALL ON TABLE public.fcm_tokens TO anon, authenticated, service_role;

-- 2. Add fcm_tokens to Supabase Realtime publication (optional, for admin monitoring)
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.fcm_tokens;
