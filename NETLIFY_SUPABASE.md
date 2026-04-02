# Netlify + Supabase Notes

## Required environment values

Set these in Netlify project environment variables:

- `SUPABASE_URL` (or `SUPABASE_PROJECT_REF`)
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`
- `JWT_SECRET` (or rely on `SUPABASE_JWT_SECRET`)
- `SEED_SECRET` (optional)

## First deployment checklist

1. Set publish directory to `dashboard`.
2. Ensure functions are deployed from `netlify/functions`.
3. Run `supabase/schema.sql` in Supabase SQL Editor.
4. Seed admin once via `/.netlify/functions/seed?key=...` or local script.
5. Login and verify all modules:
   - Operations Data
   - Email Campaigns
   - Live Session Groups
   - Admin (role-based)

## Security reminder

- Never expose `SUPABASE_SERVICE_ROLE_KEY` to frontend.
- `public-config` endpoint only returns public Supabase values needed for realtime.
