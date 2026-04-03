# Dashboard Overview

`dashboard/` is a static staff-facing web app with **area-based navigation** (primary tabs) and **role-based visibility**. All server access uses Netlify Functions (or the Vercel single entry `api/[name].js` that dispatches to the same handlers).

## Information architecture

Top-level areas (sidebar):

| Area | Typical roles | Notes |
| --- | --- | --- |
| **Operations** | admin, staff | Overview, Operations Data (CRUD + Excel import), Pipeline, Capacity, Data quality |
| **Training** | admin, trainer | Live Session Groups (single share link per session), Attendance and materials |
| **Finance** | admin, accountant | KPIs, payments ledger, AR aging, invoices, CSV export; staff may have read-only access where configured |
| **Automation** | admin, staff, user | Email Campaigns (n8n webhook + Google Sheets) |
| **Admin** | admin | Users, backend config hints, finance audit log (admin only) |

Role-to-areas mapping is defined in `dashboard/js/app.js` (`ROLE_AREAS`): e.g. `accountant` sees Finance only; `trainer` sees Training only; `user` sees Automation only.

## Modules (detail)

1. **Operations — Data**  
   Workbook-entity CRUD via `/.netlify/functions/operations-data?entity=trainees|courses|batches|enrollments`.  
   Bulk Excel import: `POST .../operations-data?entity=...&bulk=1`.

2. **Operations — Insights**  
   Read-only: `?resource=pipeline`, `capacity`, `data-quality` on the same function.

3. **Operations — Bulk (enrollments)**  
   Status updates for multiple enrollment business IDs via `operations-data` bulk endpoint (see implementation).

4. **Finance**  
   `/.netlify/functions/finance-data?resource=kpis|ledger|payment|ar-aging|invoices|companies|audit` (exact routes depend on method and query).  
   Scheduled snapshot for n8n: `POST finance-data?resource=n8n-report` with header `X-N8n-Secret` matching `N8N_FINANCE_WEBHOOK_SECRET` (see `docs/N8N_FINANCE.md`).

5. **Training — Live sessions**  
   Trainers create sessions; **one student share URL** is shown (first group’s join token). Participants open `?group=<token>`: landing screen, then display name, then chat (`training-join`, `training-messages`, optional Realtime).

6. **Training — Tools**  
   `/.netlify/functions/training-data?resource=attendance|materials` for attendance rows and material links.

7. **Automation**  
   n8n webhook: `preview`, `send`, `status` (unchanged contract).

8. **Admin**  
   User management via `create-user`, `list-users`, `reset-password`, `delete-user`. Finance audit log viewer for admins.

## Frontend files

- `dashboard/index.html`
- `dashboard/css/tokens.css`, `dashboard/css/main.css`
- `dashboard/js/app.js`

## Key behavior

- English-only UI.
- JWT in `localStorage`: `sbs_token`, `sbs_role`, `sbs_username`.
- No Supabase service keys in the browser; functions use the service role server-side only.
- Environment variables (Netlify/Vercel): see `.env.example` (e.g. `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET` or `SUPABASE_JWT_SECRET`, optional `N8N_FINANCE_WEBHOOK_SECRET`).  
- n8n finance snapshot: [`docs/N8N_FINANCE.md`](N8N_FINANCE.md) and [`automation/finance-report-trigger.json`](../automation/finance-report-trigger.json).
