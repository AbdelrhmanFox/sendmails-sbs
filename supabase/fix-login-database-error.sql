-- Run in Supabase SQL Editor if /.netlify/functions/login returns 500 "Database error"
-- (after verifying Netlify uses the SECRET key for SUPABASE_SERVICE_ROLE_KEY, not the publishable key).

-- Ensure app_users is readable by the API when using the service role (RLS off for this table).
ALTER TABLE public.app_users DISABLE ROW LEVEL SECURITY;

-- If the table was created manually without this column, add it (matches schema.sql).
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
