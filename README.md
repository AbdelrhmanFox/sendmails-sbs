# SBS Company Dashboard

Internal staff dashboard for an educational services company.  
This project now includes:

- **Operations Data** (workbook-driven database UI for trainees, courses, batches, enrollments)
- **Email Campaigns** (existing n8n sendmail automation, feature-gated by role)
- **Live Session Groups** (trainer creates groups, participants join with links, chat)
- **Auth + user management** (Supabase + Netlify Functions or Vercel — see `VERCEL_DEPLOY.md`)

All shipped UI and docs are English-only.

---

## Repository map

| Path | Purpose |
| --- | --- |
| `dashboard/` | Static frontend app (staff shell, data module, campaigns, training, admin). |
| `netlify/functions/` | API endpoints for auth, user management, operations data CRUD, training sessions/chat, public config. |
| `api/[name].js` | Single Vercel Serverless entry (Hobby-friendly); dispatches to `netlify/functions/*`. |
| `vercel.json` | Vercel build output (`dashboard/`) and `/.netlify/functions/*` → `/api/*` rewrites. |
| `supabase/schema.sql` | Supabase schema (users, enrollments, training tables, RLS policies). |
| `automation/workflow.json` | n8n workflow for campaign preview/send/status. |
| `docs/excel-export/` | Workbook exports (CSV source of truth for data model). |
| `docs/DATA_MODEL.md` | Workbook inventory and mapping decisions. |
| `CLAUDE.md` | Agent rules for this codebase. |

### Documentation index

| Document | Description |
| --- | --- |
| [`docs/DASHBOARD.md`](docs/DASHBOARD.md) | Dashboard layout, behaviour, and key files. |
| [`docs/PROJECT_BREAKDOWN.md`](docs/PROJECT_BREAKDOWN.md) | Structured extraction from the project brief for implementation and review. |
| [`docs/PROJECT_PROMPT.md`](docs/PROJECT_PROMPT.md) | Full project brief (source for the breakdown). |
| [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) | Workbook-driven data model and CSV mapping. |
| [`docs/WORKBOOK_SOURCE.md`](docs/WORKBOOK_SOURCE.md) | Where the locked workbook lives and export commands. |

---

## Quick start

### 1) Install dependencies

```bash
npm install
```

### 2) Configure Supabase

Run `supabase/schema.sql` in Supabase SQL Editor.

Set Netlify environment variables:

- `SUPABASE_URL` (or `SUPABASE_PROJECT_REF`)
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY` (required for Realtime subscription in group chat)
- `JWT_SECRET` (or `SUPABASE_JWT_SECRET`)
- `SEED_SECRET` (optional for one-time seed endpoint)

### 3) Seed admin user

Local:

```bash
npm run seed:admin
```

or Netlify:

```text
/.netlify/functions/seed?key=YOUR_SEED_SECRET
```

### 4) Import workbook sample data (optional)

```bash
npm run workbook:export
npm run data-model:build
npm run import:workbook
```

### 5) Configure n8n campaigns

Import `automation/workflow.json`, set Google Sheets + SMTP credentials, activate the workflow, then copy the webhook URL into the dashboard Campaigns module.

---

## Deployment

- **Netlify publish directory:** `dashboard`
- **Functions directory:** `netlify/functions`
- Push to GitHub, deploy from GitHub, then verify:
  - Login works
  - Operations entities CRUD works (trainees/courses/batches/enrollments)
  - Training group link + chat works
  - Campaign preview/send/status works with n8n webhook

---

## Security notes

- Do not commit `.env` or secret keys.
- `training_*` tables are configured for public join/chat behavior with generated group tokens; keep links private during sessions.
- Service-role keys must stay server-side only (Netlify functions).
