# Dashboard UI (React SPA baseline)

This repository ships two staff UI surfaces:

1. **Legacy shell** — static `dashboard/index.html` with ES modules under `dashboard/js/` (unchanged as default entry for existing bookmarks).
2. **React SPA (Figma baseline)** — Vite app under [`dashboard-ui/`](../dashboard-ui/), built to [`dashboard/spa/`](../dashboard/spa/) with base path `/spa/`.

## Design source and Operations tab counts

Visual layout for the React pages is aligned with the Figma/Make export on the developer machine at `c:/Users/abdelrahmanahmed/Downloads/project` (see `src/app/pages/*` and `src/styles/*` there). When updating the SPA, compare those files to `dashboard-ui/src` so tokens and page chrome stay in sync. On **Operations**, tab badges show totals from four lightweight `operations-data` requests (`entity=*&page=1&pageSize=1`) on page load so counts match the prototype pattern; the active tab’s table still loads the full list with search debouncing.

## What the prototype actually implements (code, not marketing docs)

Source was vendored from the Figma/Make export; **do not** treat `REDESIGN_SUMMARY.md` in external folders as shipped scope unless the code exists here.

| Area | Status | Location |
|------|--------|----------|
| Login (staff JWT + optional trainee JWT) | Implemented | `dashboard-ui/src/app/pages/LoginPage.tsx` |
| App shell (sidebar + top bar) | Implemented | `dashboard-ui/src/app/components/layout/` |
| Dashboard home (KPIs from API where available) | Implemented | `dashboard-ui/src/app/pages/DashboardPage.tsx` |
| Operations (trainees / courses / batches / enrollments lists) | Implemented | `dashboard-ui/src/app/pages/OperationsPage.tsx` |
| Training sessions list | Implemented | `dashboard-ui/src/app/pages/TrainingPage.tsx` |
| Design-system primitives | Implemented | `dashboard-ui/src/app/components/design-system/` |
| Classroom, Finance, Email campaigns, Admin | **Placeholder only** in original `App.tsx` | Legacy handoff via hash routes (see below) |

## Auth mapping (compatible with legacy)

Same `localStorage` keys as [`dashboard/js/shared.js`](../dashboard/js/shared.js):

- `sbs_token` — JWT from `POST /.netlify/functions/login` (staff) or `POST /.netlify/functions/trainee-login` (trainee).
- `sbs_role` — role string returned by the function.
- `sbs_username` — username (staff) or email (trainee).

## API helpers

Shared fetch helpers live in `dashboard-ui/src/lib/api.ts` (`jsonFetch`, `getAuthHeaders`, `clearAuthSession`). The top bar **Sign out** action clears the same keys as the legacy dashboard logout.

## URLs and deployment

- **Legacy UI:** `https://<host>/` (existing `dashboard/index.html`).
- **React UI:** `https://<host>/spa/` (static output from Vite, `base: '/spa/'`).
- Netlify SPA fallback: `/spa/*` → `/spa/index.html` (200) so React Router works on refresh (existing files under `/spa/assets/` are still served first).
- Vercel: `vercel.json` includes the same `/spa/:path*` rewrite to `/spa/index.html`; Vercel also prefers real files over rewrites when paths match built assets.

## Legacy module handoff

Routes not yet built in React redirect the browser to the classic hash shell, e.g. Classroom → `/#/training/training-classroom`, Finance → `/#/finance/finance`, Campaigns → `/#/automation/campaigns`, Admin → `/#/admin/admin`.

## Local development

```bash
cd dashboard-ui
npm install
npm run dev
```

Vite dev server defaults to port 5173; API calls use `/.netlify/functions/...` (use `netlify dev` from repo root for a combined origin, or configure a dev proxy later).

## Production build (Netlify)

Root build runs the SPA build first, then publishes the `dashboard/` folder (which includes generated `spa/` assets). See `netlify.toml` `command`.
