# Netlify + Supabase Notes

## Connect Netlify to Supabase (manual — most reliable)

The Netlify **Supabase extension** can fill variables automatically, but if anything is wrong you should set these **by hand** in **Netlify → Site configuration → Environment variables** for **Production**, then **Deploy** again.

Copy values from **Supabase → Project Settings → API** (same project for all of them).

| Netlify variable | Where to copy in Supabase |
|------------------|---------------------------|
| `SUPABASE_URL` | **Project URL** — must be `https://<project-ref>.supabase.co` (no trailing path). |
| `SUPABASE_SERVICE_ROLE_KEY` | **`service_role` `secret`** — long JWT starting with `eyJ…` (role inside payload is `service_role`). **Never** paste the `anon` key here. |
| `SUPABASE_ANON_KEY` | **`anon` `public`** JWT — for training chat / `public-config`. |
| `SUPABASE_JWT_SECRET` | **JWT Secret** (Settings → API) — used by this app to sign dashboard session tokens (can match Supabase’s JWT secret). |
| `JWT_SECRET` | Optional duplicate of `SUPABASE_JWT_SECRET` if you prefer that name. |

**Checks:**

1. All variables use the **same** project ref in the URL and inside both JWTs (decode the middle part of the JWT at [jwt.io](https://jwt.io) — the `ref` field must match).
2. **Production** scope: variables exist for **Production**, not only branch previews.
3. After saving, **trigger a new deploy** (env vars apply on deploy).
4. Open **`https://<your-site>.netlify.app/.netlify/functions/health-supabase`** in the browser. You should see `"ok": true` and REST reachable. If `authHealth` or `restProbe` shows `fetch failed`, see item 9 below (IPv4 / `NODE_OPTIONS`).

## Required environment values

Set these in Netlify project environment variables:

- `SUPABASE_URL` (or `SUPABASE_PROJECT_REF`), **or** rely on `SUPABASE_DATABASE_URL` from the Netlify Supabase extension — that value may be either a `postgresql://…` string **or** the HTTPS project URL `https://<ref>.supabase.co` (both are supported).
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`
- `JWT_SECRET` or `SUPABASE_JWT_SECRET` (the Supabase extension usually provides the latter)
- `SEED_SECRET` (optional)

## First deployment checklist

1. Set publish directory to `dashboard`.
2. Ensure functions are deployed from `netlify/functions`.
3. Run `supabase/schema.sql` in Supabase SQL Editor.
4. Seed admin once via `/.netlify/functions/seed?key=...` or local script.
5. Login and verify all modules:
   - Operations Data (CRUD and optional **Import from Excel** for `.xlsx` aligned with workbook columns)
   - Email Campaigns
   - Live Session Groups
   - Admin (role-based)

## Security reminder

- Never expose `SUPABASE_SERVICE_ROLE_KEY` to frontend.
- `public-config` endpoint only returns public Supabase values needed for realtime.

## Login returns 500 "Database error"

1. **Wrong key in Netlify:** `SUPABASE_SERVICE_ROLE_KEY` must be the **service_role** JWT (legacy `eyJ…` with role `service_role`) or **`sb_secret_…`**. Do **not** put the **anon** JWT there — the app detects `role: anon` in legacy JWTs and returns a clear misconfiguration hint. Do **not** use the publishable key (`sb_publishable_…`) for this variable.
2. **URL:** `SUPABASE_URL` must be exactly `https://<project-ref>.supabase.co` for the same project as the keys.
3. **JWT for the app:** Set `JWT_SECRET` (or `SUPABASE_JWT_SECRET`) to any long random string (used only to sign dashboard session tokens).
4. **RLS on `app_users`:** If login still fails, run `supabase/fix-login-database-error.sql` in the SQL Editor, then redeploy is not required for SQL-only fixes.
5. **Debug:** Set Netlify env `LOGIN_DEBUG=1`, redeploy, try login once, then check the JSON body for `details` (or Netlify function logs). Remove `LOGIN_DEBUG` afterward.
6. **Empty `app_users`:** After the above works, create the admin user with `npm run seed:admin` (local `.env` pointing at the same Supabase project) or insert a bcrypt-hashed password — plain text passwords will not work.

7. **Production vs Preview:** In Netlify → Environment variables, confirm the same Supabase values exist for **Production** (not only Deploy previews).

8. **Shared code location:** Function helpers live in `netlify/lib/_shared.js` (not under `netlify/functions/`) so Netlify does not deploy them as a fake `/_shared` function.

9. **`Database error — TypeError: fetch failed`:** Usually outbound HTTPS from Netlify to Supabase failing at DNS/TCP (IPv6 vs IPv4). The repo sets `dns.setDefaultResultOrder('ipv4first')` in `netlify/lib/_shared.js` and `NODE_OPTIONS=--dns-result-order=ipv4first` in `netlify.toml`. Redeploy; if it persists, add the same `NODE_OPTIONS` under **Site configuration → Environment variables** for Production.
