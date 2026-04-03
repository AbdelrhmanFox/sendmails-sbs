# SBS Company Dashboard

Internal staff dashboard for **SBS** (educational and training services). The app is a static frontend with serverless APIs backed by **Supabase**. All product UI and repository documentation are **English-only**.

## What’s in the product

| Area | Description |
| --- | --- |
| **Operations Data** | Workbook-driven CRUD for trainees, courses, batches, and enrollments; **Excel (.xlsx) import** in the UI and bulk upsert via `operations-data` (see below). |
| **Email Campaigns** | n8n-powered preview, send, and status; webhook + Google Sheets integration. |
| **Live Session Groups** | Trainers create sessions and groups; participants join with links; realtime chat (Supabase). |
| **User management** | Admin flows for listing, creating, resetting, and deleting users. |
| **Authentication** | JWT-based login; same contracts for Netlify Functions and Vercel. |

## Tech stack

- **Frontend:** Static HTML/CSS/JS under `dashboard/` (Montserrat + design tokens).
- **Backend:** Node serverless handlers in `netlify/functions/` (shared by Netlify and Vercel).
- **Vercel entry:** Single dispatcher `api/[name].js` (stays within the Hobby **12-function** limit).
- **Database & auth storage:** Supabase (schema and RLS in `supabase/schema.sql`).
- **Automation:** n8n workflow in `automation/workflow.json`.

---

## Repository map

| Path | Purpose |
| --- | --- |
| `dashboard/` | Staff UI: login, home, operations, campaigns, training, admin. |
| `dashboard/css/tokens.css` | Theme variables; keep aligned with `brand/palette.json`. |
| `dashboard/assets/` | Runtime assets: `logo.png`, `stickers/sticker-*.jpg`. |
| `netlify/functions/` | API handlers (login, seed, operations-data, training-*, users, public-config, health-supabase, …). |
| `netlify/lib/` | Shared server code (not deployed as its own function). |
| `api/[name].js` | Vercel router: maps `/api/<name>` to the matching Netlify handler. |
| `vercel.json` | Static output `dashboard/`, rewrites `/.netlify/functions/:name` → `/api/:name`. |
| `netlify.toml` | Netlify build (publish `dashboard`), functions bundler, security headers. |
| `supabase/schema.sql` | Tables, policies, and training realtime setup. |
| `supabase/` | One-off SQL helpers (e.g. `fix-login-database-error.sql`) as needed. |
| `scripts/` | Seed, workbook export/import, data model build. |
| `automation/workflow.json` | n8n campaign workflow (import into your n8n instance). |
| `docs/` | Long-form docs, workbook source notes, CSV exports under `docs/excel-export/`. |
| `brand/` | Brand README, `palette.json`, `Main Logo/`, `Color Palette/ColorPalette.pdf`, `exports/logo.png`. |
| `CLAUDE.md` | Cursor/agent rules for this repo. |

---

## Brand and UI

- **Colors:** Defined in `brand/palette.json` (aligned with `brand/Color Palette/ColorPalette.pdf` RGB swatches) and applied in `dashboard/css/tokens.css`.
- **Typography:** [Montserrat](https://fonts.google.com/specimen/Montserrat) (Google Fonts) for UI text.
- **Logo:** `dashboard/assets/logo.png` (white-text mark for dark chrome).
- **Stickers:** Decorative JPGs in `dashboard/assets/stickers/` on the login screen and each main view header (purely visual; `alt=""`).

For asset layout and syncing rules, see [`brand/README.md`](brand/README.md).

---

## Documentation index

| Document | Description |
| --- | --- |
| [`docs/DASHBOARD.md`](docs/DASHBOARD.md) | Dashboard layout, behaviour, and key files. |
| [`docs/PROJECT_BREAKDOWN.md`](docs/PROJECT_BREAKDOWN.md) | Structured extraction from the project brief. |
| [`docs/PROJECT_PROMPT.md`](docs/PROJECT_PROMPT.md) | Full project brief. |
| [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) | Workbook-driven data model and CSV mapping. |
| [`docs/WORKBOOK_SOURCE.md`](docs/WORKBOOK_SOURCE.md) | Canonical workbook path and export commands. |
| [`VERCEL_DEPLOY.md`](VERCEL_DEPLOY.md) | Vercel project settings, env vars, and `/api/*` behaviour. |
| [`NETLIFY_SUPABASE.md`](NETLIFY_SUPABASE.md) | Netlify + Supabase integration notes. |
| [`SUPABASE_SETUP.md`](SUPABASE_SETUP.md) | Schema overview and optional workbook import. |
| [`CLAUDE.md`](CLAUDE.md) | Agent and delivery rules for this codebase. |

---

## Environment variables

Set these on **Netlify** and/or **Vercel** (same names; configure per platform). Do **not** commit real secrets.

| Variable | Purpose |
| --- | --- |
| `SUPABASE_URL` | `https://<project-ref>.supabase.co` (optional if derived from DB URL). |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role secret (server-only CRUD). |
| `SUPABASE_ANON_KEY` | Publishable key (e.g. Realtime for training chat, `public-config`). |
| `JWT_SECRET` or `SUPABASE_JWT_SECRET` | Sign and verify dashboard login tokens. |
| `SUPABASE_DATABASE_URL` | Optional; some Netlify Supabase integrations expose Postgres URL first. |
| `SEED_SECRET` | Optional; protects the `seed` function. |
| `NODE_OPTIONS` | Optional; e.g. `--dns-result-order=ipv4first` if Supabase fetch fails (see `netlify.toml` / `VERCEL_DEPLOY.md`). |

Redeploy after changing variables.

---

## NPM scripts

| Script | Command |
| --- | --- |
| Local Netlify stack | `npm run dev` |
| Local Vercel + static site | `npm run vercel:dev` |
| Seed admin (local script) | `npm run seed:admin` |
| Export workbook → CSV | `npm run workbook:export` |
| Regenerate data model doc | `npm run data-model:build` |
| Import CSV sample data | `npm run import:workbook` |
| Legacy enrollments CSV import | `npm run import:enrollments` |

---

## Quick start

### 1) Install

```bash
npm install
```

### 2) Supabase

1. Run `supabase/schema.sql` in the Supabase SQL Editor.
2. Add the environment variables listed above to your host (Netlify/Vercel).

### 3) Seed admin (optional)

```bash
npm run seed:admin
```

Or call the deployed `seed` function with `SEED_SECRET` as documented in `SUPABASE_SETUP.md`.

### 4) Workbook pipeline (optional)

Canonical workbook: `docs/DataBase(SBS)v01.xlsm` (see `docs/WORKBOOK_SOURCE.md`).

```bash
npm run workbook:export
npm run data-model:build
npm run import:workbook
```

### 5) n8n campaigns

Import `automation/workflow.json`, attach Google Sheets + SMTP credentials, activate the workflow, then paste the webhook URL into the dashboard **Email Campaigns** module.

---

## Operations Data: Excel import (dashboard)

In **Operations Data**, choose the entity (trainees, courses, batches, enrollments), then use **Import from Excel** and select a `.xlsx` file:

- The **first row** must be column headers. Headers can match the **workbook export** (e.g. `Trainee_ID`, `Full_Name`) or snake_case field names; see [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) and [`docs/excel-export/`](docs/excel-export/) for the expected columns per sheet.
- The importer picks a sheet whose name matches the selected entity (case-insensitive), or **falls back to the first sheet**.
- Rows are **upserted** on the business key (`trainee_id`, `course_id`, `batch_id`, or `enrollment_id`), same as `npm run import:workbook` for CSV.
- The browser loads [SheetJS](https://sheetjs.com/) from a CDN; the API accepts `POST` with query `bulk=1` and body `{ "items": [ ... ] }` (see API section).

CLI import from exported CSV remains: `npm run import:workbook`.

---

## API surface (single Vercel function)

`api/[name].js` exposes names that mirror Netlify function names, for example:

`login`, `seed`, `operations-data`, `training-sessions`, `training-join`, `training-messages`, `create-user`, `list-users`, `public-config`, `delete-user`, `reset-password`, `health-supabase`.

- **Netlify:** `/.netlify/functions/<name>`
- **Vercel:** `/api/<name>` (and rewrites from `/.netlify/functions/<name>` for compatibility)

Health check: `GET /api/health-supabase` on your deployed origin.

**Bulk operations import:** `POST` `/.netlify/functions/operations-data?entity=<trainees|courses|batches|enrollments>&bulk=1` with JSON body `{ "items": [ { ... }, ... ] }`. Each object is coerced from workbook-style column names then upserted. Requires `Authorization: Bearer <JWT>`.

---

## Deployment

### Netlify

- **Publish directory:** `dashboard`
- **Functions:** `netlify/functions`
- Connect the repo, set env vars, deploy, then verify login, operations CRUD, training links/chat, and campaigns against your n8n webhook.

### Vercel

- **Root:** repository root  
- **Build:** `echo Build complete` (or as in `vercel.json`)  
- **Output:** `dashboard`  
- Details: [`VERCEL_DEPLOY.md`](VERCEL_DEPLOY.md)

Use **one** primary production domain per environment to avoid confusion; env vars are **not** shared between Netlify and Vercel.

---

## Security notes

- Never commit `.env`, tokens, or service-role keys.
- `training_*` flows use scoped tokens for join/chat; treat live session links as sensitive during active sessions.
- Service-role keys must only run in serverless functions, never in the static dashboard bundle.

---

## License / usage

Private internal project; follow your organisation’s policies for forks and distribution.
