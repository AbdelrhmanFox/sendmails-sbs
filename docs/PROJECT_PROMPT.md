# SBS Company Dashboard — Project Prompt

Use this prompt to maintain or rebuild the current product.

## Product intent

Build an internal staff dashboard for SBS (educational/training services), with a clear English-only UX and three operational modules:

1. **Operations Data** (workbook-driven database entries)
2. **Email Campaigns** (optional n8n sendmail flow)
3. **Live Session Groups** (trainer creates groups, participants join with links and chat)

## Language rule

- Shipped UI, errors, hints, and docs are English-only.
- User-entered content can be any language.

## Stack

- Frontend: static `dashboard/` (HTML/CSS/JS + Quill)
- Backend: Netlify functions (`netlify/functions/`)
- Data/Auth: Supabase
- Automation: n8n (`automation/workflow.json`)

## Database requirements

Use `supabase/schema.sql` as source of truth. Core tables:

- `app_users`
- `enrollments`
- `training_sessions`
- `training_groups`
- `training_participants`
- `training_messages`

Workbook exports under `docs/excel-export/` drive the data model (`docs/DATA_MODEL.md`).

## API surface

### Auth/admin

- `/.netlify/functions/login`
- `/.netlify/functions/create-user`
- `/.netlify/functions/list-users`
- `/.netlify/functions/reset-password`
- `/.netlify/functions/delete-user`
- `/.netlify/functions/seed`

### Operations data

- `/.netlify/functions/operations-data?entity=<name>` (GET, POST, PUT, DELETE)
  - supported entities: `trainees`, `courses`, `batches`, `enrollments`

### Training

- `/.netlify/functions/training-sessions` (GET, POST)
- `/.netlify/functions/training-join` (GET, POST with `token`)
- `/.netlify/functions/training-messages` (GET, POST)
- `/.netlify/functions/public-config` (GET: public Supabase config for realtime)

### Campaigns (n8n webhook)

Dashboard sends:

- `{ action: "preview", sheetUrl }`
- `{ action: "send", sheetUrl, subject, bodyHtml }`
- `{ action: "status", sheetUrl }`

## UX requirements

- Sidebar shell with role-aware navigation
- Home orientation card set for staff
- Clear modules and action grouping
- Campaign module disabled/hidden by role where needed
- Admin module visible only to admins
- Training join flow supports public `?group=<token>` link

## Delivery rules

1. Keep changes focused and avoid unrelated refactors.
2. Never commit secrets or `.env`.
3. Use non-interactive command patterns where possible.
4. End each coherent implementation with:
   - validation checks,
   - English commit message,
   - push to GitHub.

## Workbook sync commands

```bash
npm run workbook:export
npm run data-model:build
npm run import:workbook
```
