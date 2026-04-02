# Deploy on Vercel (with Supabase)

This repo ships **Netlify Functions** under `netlify/functions/`. On Vercel, thin wrappers in `api/` reuse the same handlers so you do **not** duplicate business logic.

## One-time setup

1. Push the repo to GitHub/GitLab/Bitbucket (or use Vercel CLI).
2. **Import project** in [Vercel](https://vercel.com) → New Project → select the repo.
3. **Framework Preset:** Other (or leave default).
4. **Root directory:** repository root (`.`).
5. **Build Command:** `echo Build complete` (or leave empty if the dashboard is static and needs no build).
6. **Output Directory:** `dashboard`  
   (This matches `vercel.json` — static files are served from `dashboard/`.)
7. **Install Command:** `npm install`

## Environment variables

In **Vercel → Project → Settings → Environment Variables**, add the **same** names as for Netlify (Production + Preview as needed):

| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` | `https://<ref>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role secret (server only) |
| `SUPABASE_ANON_KEY` | Anon / publishable key |
| `JWT_SECRET` or `SUPABASE_JWT_SECRET` | App login token signing |
| `SUPABASE_DATABASE_URL` | Optional; HTTPS or Postgres URL (see `NETLIFY_SUPABASE.md`) |
| `SEED_SECRET` | Optional; for `seed` function |
| `NODE_OPTIONS` | Optional; `--dns-result-order=ipv4first` if you see `fetch failed` to Supabase |

Redeploy after changing env vars.

## API routes

- **Native Vercel paths:** `/api/login`, `/api/list-users`, etc.
- **Dashboard compatibility:** Requests to `/.netlify/functions/login` are **rewritten** to `/api/login` (see `vercel.json`), so the existing `dashboard/js/app.js` does not need changes.

## Local preview (optional)

```bash
npx vercel@latest login
npx vercel@latest dev
```

Or install the CLI globally: `npm install -g vercel`.  
`vercel dev` serves static output from `dashboard` and runs `api/*` functions.

## Health check

After deploy, open:

`https://<your-domain>.vercel.app/api/health-supabase`

Same behavior as the Netlify `health-supabase` function.

## Netlify vs Vercel

You can keep **both** connected to the same Git repo; only connect **one** production domain to avoid confusion. Environment variables must be set **per platform**.
