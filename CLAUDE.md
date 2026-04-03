# SBS Dashboard Agent Rules

## Product Scope

- This repository is for the internal SBS staff dashboard.
- SBS is an educational/training services company.
- Public users only access explicit training group join links when enabled.

## Language Rules

- Ship English-only UI text.
- Keep comments, docs, commit messages, and migration notes in English.
- Do not add Arabic locale/UI in this phase.

## Engineering Rules

- Respect workbook-driven schema design: implement what is in exported sheets.
- Keep changes focused; do not refactor unrelated code.
- Never commit secrets (`.env`, tokens, keys, service-role values).
- Prefer non-interactive commands for scripts and CI-like flows.

## Architecture Rules

- Frontend remains a static dashboard in `dashboard/` (ES module entry `dashboard/js/app.js` and feature modules under `dashboard/js/`).
- Server functions remain under `netlify/functions/` (Vercel uses `api/[name].js` + `netlify/lib/vercel-adapter.js`).
- Database schema and RLS: baseline in `supabase/schema.sql`; apply `supabase/migrations/*.sql` in order when evolving existing databases.
- n8n workflow file remains in `automation/workflow.json`.

## Delivery Rules

- At the end of each coherent implementation slice:
  1. Verify changed files.
  2. Run smoke checks.
  3. Commit with an English message.
  4. Push to GitHub remote.
