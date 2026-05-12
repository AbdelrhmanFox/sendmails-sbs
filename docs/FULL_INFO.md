# SBS Staff Dashboard — FULL_INFO handoff

**Purpose:** Single exportable overview of the **Sendmails SBS** internal dashboard repository for external design or code tools (e.g. Lovable, Figma-first workflows, or agency onboarding). This file **summarizes and links**; deep behavior lives in the linked docs.

**Product:** Internal **SBS** (education / training services) staff dashboard plus limited **public** flows (session join, classroom token, credential learner links). Deployed SPA path: **`/spa/`** (see [Build and deploy](#build-and-deploy)).

---

## 1. Purpose and audience

| Audience | Typical use |
| --- | --- |
| **Admin** | Full operations, training, finance, email campaigns, user admin. |
| **Trainer** | Training area (sessions, classroom, assignments, assessments, LMS views as exposed). |
| **Staff** | Operations (workbook entities, import) and email campaigns per `ROLE_AREAS`. |
| **Accountant** | Finance area. |
| **Trainee** | Single portal route: courses, classroom materials, assignments, password. |
| **Public (unauthenticated)** | URLs with query keys `session`, `group`, `classroom`, `credential`, `learner` (see [Public routes](#public-routes)). |

---

## 2. Hard constraints for redesign or greenfield UI tools

1. **English-only product UI** — All user-visible strings in the shipped app must stay **English** (see [`CLAUDE.md`](../CLAUDE.md)). Arabic or other locales are out of scope for this repo phase.
2. **React SPA basename** — Client router uses **`basename="/spa"`**; canonical URLs are under **`/spa/...`** (see [`dashboard-ui/src/app/App.tsx`](../dashboard-ui/src/app/App.tsx)).
3. **Workbook-driven data model** — Schema and CRUD semantics follow the workbook / Supabase baseline. Do **not** invent new core tables or REST shapes without aligning [`docs/DATA_MODEL.md`](DATA_MODEL.md) and migrations.
4. **No secrets in documentation** — Never paste tokens, service-role keys, or `.env` values. Refer only to **variable names** and the [`deploy/`](deploy/) documentation folder for where they are used.
5. **Serverless contract** — Browser calls **`/.netlify/functions/<name>`** (Vercel rewrites to **`/api/<name>`**). Renaming functions breaks the SPA unless both are updated.

---

## 3. Repository map (short)

| Path | Role |
| --- | --- |
| [`dashboard-ui/`](../dashboard-ui/) | **Source** React app (Vite, TypeScript). |
| [`dashboard/spa/`](../dashboard/spa/) | **Built** static assets (`npm run build` from `dashboard-ui`). |
| [`dashboard/index.html`](../dashboard/index.html) | Root redirect into `/spa/` (preserves query for public links). |
| [`netlify/functions/`](../netlify/functions/) | Serverless API handlers (Node). |
| [`api/[name].js`](../api/[name].js) | Vercel dispatcher to shared handlers. |
| [`netlify.toml`](../netlify.toml), [`vercel.json`](../vercel.json) | Deploy routing and build. |
| [`supabase/schema.sql`](../supabase/schema.sql), [`supabase/migrations/`](../supabase/migrations/) | Database baseline and ordered changes. |
| [`automation/workflow.json`](../automation/workflow.json) | n8n email campaign workflow (import into n8n). |
| [`brand/`](../brand/) | Official palette, logos, PDFs. |
| [`docs/`](../docs/) | Domain and deploy documentation (this file included). |

---

## 4. Tech stack (frontend)

| Layer | Details |
| --- | --- |
| **Runtime** | React **18**, Vite **6**, TypeScript. |
| **Routing** | React Router **7** (`BrowserRouter` with `/spa` basename). |
| **Styling** | Tailwind **4** + CSS variables in [`dashboard-ui/src/styles/theme.css`](../dashboard-ui/src/styles/theme.css); `@theme inline` maps tokens. |
| **Theme switching** | `next-themes` (`ThemeProvider` in [`dashboard-ui/src/main.tsx`](../dashboard-ui/src/main.tsx)); light tokens under `html.light`. |
| **Design system** | Custom components under [`dashboard-ui/src/app/components/design-system/`](../dashboard-ui/src/app/components/design-system/) (Button, Card, Input, Table, Badge, etc.). |
| **Primitives** | Radix-based shadcn-style under [`dashboard-ui/src/app/components/ui/`](../dashboard-ui/src/app/components/ui/). |
| **Other UI libs** | MUI + Emotion in dependencies (used alongside Tailwind in places); **Recharts** for charts; **Sonner** toasts; **lucide-react** icons; **motion** for light transitions. |
| **Forms** | `react-hook-form` where adopted; many forms use controlled local state. |
| **Auth** | JWT in `localStorage` (see [Auth and client storage](#auth-and-client-storage)). |

---

## 5. Roles and navigation rules

Source of truth: [`dashboard-ui/src/lib/roleAccess.ts`](../dashboard-ui/src/lib/roleAccess.ts).

**`ROLE_AREAS` (high level)**

| Role | Allowed top-level areas (`path` first segment) |
| --- | --- |
| `admin` | `operations`, `training`, `finance`, `automation`, `admin` |
| `staff` | `operations`, `automation` |
| `trainer` | `training` |
| `trainee` | **Only** `/trainee/portal` (and account password); sidebar hidden. |
| `user` | `automation` |
| `accountant` | `finance` |

**Enforcement**

- [`dashboard-ui/src/app/components/AreaGuard.tsx`](../dashboard-ui/src/app/components/AreaGuard.tsx) blocks unauthorized areas.
- [`dashboard-ui/src/lib/routeMeta.ts`](../dashboard-ui/src/lib/routeMeta.ts) supplies TopBar title/subtitle copy per path.

**Default landing path**

- Implemented in `defaultPathForRole()` (e.g. trainee → `/trainee/portal`, staff with operations → `/operations/overview`).

---

## 6. Route map (authoritative SPA paths)

Paths below are **without** the `/spa` URL prefix (router-internal). Full URL: `https://<host>/spa<path>`.

### Auth and account

| Path | Page / behavior |
| --- | --- |
| `/login` | [`LoginPage`](../dashboard-ui/src/app/pages/LoginPage.tsx) — staff vs trainee login. |
| `/account/password` | Change password (protected). |

### Staff / trainer / admin (sidebar layout)

| Path | Description |
| --- | --- |
| `/` | `RootEntry` — redirects by role / token. |
| `/dashboard` | Home dashboard KPIs, sessions snapshot, pending submissions queue (role-dependent). |

**Operations** (`OperationsLayout` + nested routes)

| Path | Description |
| --- | --- |
| `/operations` | Redirects to `/operations/overview`. |
| `/operations/overview` | KPI tiles. |
| `/operations/trainees` | Entity list tab (`OperationsPage` tab `trainees`). |
| `/operations/courses` | Tab `courses`. |
| `/operations/batches` | Tab `batches`. |
| `/operations/enrollments` | Tab `enrollments`. |
| `/operations/import` | Excel import. |
| `/operations/insights` | Insights. |
| `/operations/integration-events` | Integration events. |
| `/operations/lms-admin` | Full LMS admin CRUD (`lms-admin-data`). |
| `/operations/trainees/:traineeId` | Trainee profile. |

**Training** (`TrainingLayout` + outlet)

| Path | Description |
| --- | --- |
| `/training` | Redirects to `/training/overview`. |
| `/training/overview` | Training overview. |
| `/training/sessions` | Live sessions / groups. |
| `/training/presenter` | Presenter tools. |
| `/training/classroom` | Classroom tools. |
| `/training/assignments` | Staff assignments + submissions (`?batch=` supported). |
| `/training/assessments` | Assessments (`assessment-data`). |
| `/training/materials` | Attendance and materials. |
| `/training/lms-analytics` | LMS analytics. |
| `/training/lms-catalog` | Read-only LMS catalog (`lms-admin-data` GET). |
| `/training/library` | Course library. |
| `/training/credentials` | Credentials. |

**Other areas**

| Path | Description |
| --- | --- |
| `/finance` | Finance KPIs, charts, ledger, invoices. |
| `/automation` | Email campaigns (n8n webhook from browser). |
| `/admin` | Users, reset flows. |

### Trainee

| Path | Description |
| --- | --- |
| `/trainee/portal` | Single scroll portal + subnav hashes (`#trainee-*`). |

### Public routes

Handled when [`hasPublicQuery()`](../dashboard-ui/src/app/pages/public/PublicQueryRouter.tsx) is true **before** auth redirect (see `RootEntry` in App).

| Query keys (any one triggers public shell) | Purpose |
| --- | --- |
| `session`, `group` | Public session / group join. |
| `classroom` | Public classroom by token. |
| `credential`, `learner` | Public credential learner flow. |

Implementation: [`PublicQueryRouter.tsx`](../dashboard-ui/src/app/pages/public/PublicQueryRouter.tsx), [`PublicShell`](../dashboard-ui/src/app/pages/public/PublicShell.tsx).

---

## 7. Layout shell

- **Staff layout:** [`ProtectedLayout`](../dashboard-ui/src/app/App.tsx) — [`Sidebar`](../dashboard-ui/src/app/components/layout/Sidebar.tsx), [`TopBar`](../dashboard-ui/src/app/components/layout/TopBar.tsx) (theme toggle, WhatsApp support link when configured, sign out), scrollable `main` + [`PageScaffold`](../dashboard-ui/src/app/components/layout/PageScaffold.tsx).
- **Trainee layout:** No sidebar; [`TraineeSubNav`](../dashboard-ui/src/app/components/layout/TraineeSubNav.tsx) for in-page section anchors on `/trainee/portal`.
- **Prior UX notes:** [`docs/LMS_UX_AUDIT_AND_DESIGN_SYSTEM.md`](LMS_UX_AUDIT_AND_DESIGN_SYSTEM.md).

---

## 8. Auth and client storage

| Key | Purpose |
| --- | --- |
| `sbs_token` | JWT (`AUTH_TOKEN` in [`api.ts`](../dashboard-ui/src/lib/api.ts)). |
| `sbs_role` | Role string. |
| `sbs_username` | Display / audit username. |
| `sbs_sendmails_webhook` | n8n webhook URL for campaigns (see [`docs/DASHBOARD_UI.md`](DASHBOARD_UI.md)). |
| `sbs_sendmails_sheet_url` | Google Sheet URL for campaigns (same doc). |

`clearAuthSession()` removes token, role, user, and webhook (see `api.ts`); campaign sheet URL behavior is documented in DASHBOARD_UI.

**401 handling:** `jsonFetch` clears session and redirects to `/spa/login` when not already on login.

---

## 9. APIs (high level)

**Client pattern:** `functionsBase()` → `/.netlify/functions` + `getAuthHeaders()` + `jsonFetch()` in [`dashboard-ui/src/lib/api.ts`](../dashboard-ui/src/lib/api.ts).

**Server entrypoints:** One file per function under [`netlify/functions/`](../netlify/functions/) (40 handlers). Vercel uses [`api/[name].js`](../api/[name].js) to dispatch to the same implementation.

**Grouped function list (filenames)**

| Group | Functions |
| --- | --- |
| **Auth / users** | `login.js`, `trainee-login.js`, `change-password.js`, `reset-password.js`, `list-users.js`, `create-user.js`, `delete-user.js` |
| **Trainee portal** | `trainee-me.js`, `trainee-courses.js`, `trainee-classroom.js`, `trainee-submissions.js`, `trainee-submission-upload.js`, `trainee-change-password.js`, `trainee-admin-reset.js` |
| **Operations** | `operations-data.js` |
| **Training realtime / legacy data** | `training-sessions.js`, `training-data.js`, `training-join.js`, `training-messages.js`, `public-training-session.js` |
| **Classroom / assignments** | `classroom-data.js`, `classroom-assignment-upload.js`, `classroom-material-upload.js`, `public-classroom.js`, `public-classroom-submit.js`, `public-classroom-upload.js`, `public-classroom-review.js` |
| **Course library / credentials** | `course-library-data.js`, `course-library-upload.js`, `credential-center.js`, `credential-public.js` |
| **LMS** | `lms-admin-data.js`, `lms-analytics.js` |
| **Assessments** | `assessment-data.js` |
| **Finance** | `finance-data.js` |
| **Integration / health / demo** | `integration-events.js`, `health-supabase.js`, `demo-support-config.js`, `public-config.js` |
| **Maintenance** | `seed.js` |

For **resource query parameters** and HTTP verbs per handler, inspect the corresponding `.js` file or the React page that calls it (see [`docs/DASHBOARD_UI.md`](DASHBOARD_UI.md) for a narrative map).

---

## 10. Data and automation

| Asset | Link |
| --- | --- |
| **Schema + RLS** | [`supabase/schema.sql`](../supabase/schema.sql) |
| **Migrations** | [`supabase/migrations/`](../supabase/migrations/) — policy: [`supabase/migrations/README.md`](../supabase/migrations/README.md) |
| **Workbook / CSV model** | [`docs/DATA_MODEL.md`](DATA_MODEL.md), [`docs/WORKBOOK_SOURCE.md`](WORKBOOK_SOURCE.md) |
| **Excel import** | [`docs/sample-import/README.md`](sample-import/README.md) |
| **n8n workflow** | [`automation/workflow.json`](../automation/workflow.json) |

---

## 11. Brand and visual identity

| Asset | Location |
| --- | --- |
| **Official palette (JSON)** | [`brand/palette.json`](../brand/palette.json) |
| **Brand README** | [`brand/README.md`](../brand/README.md) |
| **Runtime CSS tokens** | [`dashboard-ui/src/styles/theme.css`](../dashboard-ui/src/styles/theme.css) — `--brand-*`, light mode under `html.light` |
| **Logo (built site)** | `dashboard/assets/logo.png` (referenced from SPA as `/assets/logo.png` with Vite base) |
| **Typography** | Inter (UI), Montserrat (`.font-brand` headings) — see `theme.css` header import |

---

## 12. Build and deploy

**Local dev (SPA only)**

```bash
cd dashboard-ui
npm install
npm run dev
```

**Production build**

```bash
cd dashboard-ui
npm run build
```

Output: [`dashboard/spa/`](../dashboard/spa/) (and root `dashboard/index.html` redirect).

**Full-stack local (optional):** `netlify dev` from repo root for same-origin `/.netlify/functions`.

**Deploy guides**

- [`docs/deploy/VERCEL_DEPLOY.md`](deploy/VERCEL_DEPLOY.md)
- [`docs/deploy/NETLIFY_SUPABASE.md`](deploy/NETLIFY_SUPABASE.md)
- [`docs/deploy/SUPABASE_SETUP.md`](deploy/SUPABASE_SETUP.md)

---

## 13. Design handoff — open goals (neutral)

Use this list when briefing a visual redesign partner; it does not replace user research.

- **Information architecture:** Clearer separation between “delivery” vs “catalog” vs “admin” mental models under Training and Operations.
- **Dashboard home:** Richer at-a-glance analytics and drill-down paths (Recharts is already a dependency).
- **Email campaigns:** Step-by-step (wizard) flow instead of a single dense surface.
- **Forms:** Consistent validation messaging and field grouping across Operations and Training.
- **Density / responsive:** Tablet and small-desktop layouts for data-heavy tables.
- **Onboarding:** In-app map of “what to do first” for new staff roles.

---

## 14. Documentation index (read next)

| Document | Why open it |
| --- | --- |
| [`README.md`](../README.md) | Architecture, scripts, env index, repo map. |
| [`AGENTS.md`](../AGENTS.md) | Agent workflow and safety. |
| [`CLAUDE.md`](../CLAUDE.md) | Hard product and language rules. |
| [`docs/DASHBOARD_UI.md`](DASHBOARD_UI.md) | SPA routing, APIs, campaigns, deploy notes. |
| [`docs/DASHBOARD.md`](DASHBOARD.md) | Legacy layout context where still referenced. |
| [`docs/DATA_MODEL.md`](DATA_MODEL.md) | Entities and workbook columns. |
| [`docs/LMS_UX_AUDIT_AND_DESIGN_SYSTEM.md`](LMS_UX_AUDIT_AND_DESIGN_SYSTEM.md) | LMS UX audit notes. |
| [`docs/dashboard-ui-smoke-checklist.md`](dashboard-ui-smoke-checklist.md) | Manual smoke checklist. |
| [`docs/deploy/VERCEL_DEPLOY.md`](deploy/VERCEL_DEPLOY.md) | Vercel env names and routing. |
| [`docs/sample-import/README.md`](sample-import/README.md) | Import columns. |
| [`supabase/migrations/README.md`](../supabase/migrations/README.md) | Migration order policy. |

---

**Document version:** Generated as repo handoff `FULL_INFO`. Update this file when major routes or function inventories change.
