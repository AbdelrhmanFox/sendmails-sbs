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

## Login returns 500 "Database error"

1. **Wrong key in Netlify:** `SUPABASE_SERVICE_ROLE_KEY` must be the **secret** key (`sb_secret_…` or legacy **service_role** JWT). Do **not** put the publishable / anon key there; the login function will reject keys that start with `sb_publishable_`.
2. **URL:** `SUPABASE_URL` must be exactly `https://<project-ref>.supabase.co` for the same project as the keys.
3. **JWT for the app:** Set `JWT_SECRET` (or `SUPABASE_JWT_SECRET`) to any long random string (used only to sign dashboard session tokens).
4. **RLS on `app_users`:** If login still fails, run `supabase/fix-login-database-error.sql` in the SQL Editor, then redeploy is not required for SQL-only fixes.
5. **Debug:** Set Netlify env `LOGIN_DEBUG=1`, redeploy, try login once, then check the JSON body for `details` (or Netlify function logs). Remove `LOGIN_DEBUG` afterward.
6. **Empty `app_users`:** After the above works, create the admin user with `npm run seed:admin` (local `.env` pointing at the same Supabase project) or insert a bcrypt-hashed password — plain text passwords will not work.
