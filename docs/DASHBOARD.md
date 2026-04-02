# Dashboard Overview

`dashboard/` is a static staff-facing web app with a left sidebar and role-aware modules.

## Modules

1. **Home**  
   Short orientation for staff users.

2. **Operations Data**  
   Workbook-entity CRUD UI backed by `/.netlify/functions/operations-data?entity=...`:
   - trainees
   - courses
   - batches
   - enrollments

3. **Email Campaigns** (optional by role)  
   Uses existing n8n webhook for:
   - `preview` (load sheet columns/sample row)
   - `send` (start sending loop)
   - `status` (sent/pending counters)

4. **Live Session Groups**  
   - Trainer creates a session and group links.
   - Participant opens `?group=<token>`, joins with display name, and uses chat.
   - Realtime: Supabase channel subscription if public config includes `SUPABASE_ANON_KEY`; polling fallback remains active.

5. **Manage Users** (admin only)  
   Existing user CRUD flows through Netlify functions.

## Frontend files

- `dashboard/index.html`
- `dashboard/css/tokens.css`
- `dashboard/css/main.css`
- `dashboard/js/app.js`

## Key behavior

- English-only UI.
- JWT auth in localStorage (`sbs_token`, `sbs_role`, `sbs_username`).
- Role-based menu visibility:
  - admin: all modules
  - trainer: training + operations
  - staff/user: operations + campaigns
- Campaigns module preserves existing n8n workflow contract.
