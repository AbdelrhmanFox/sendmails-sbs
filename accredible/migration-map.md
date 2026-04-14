# Migration Map

## Apply order
1. `supabase/schema.sql` (baseline for fresh databases)
2. Existing migrations in chronological order up to `20260417_*`
3. `supabase/migrations/20260418_phase6_accredible_parity.sql`

## New objects introduced in phase6
- Tables:
  - `credential_templates`
  - `credential_events`
  - `verification_logs`
  - `learner_profiles`
  - `pathways`
  - `pathway_steps`
  - `pathway_enrollments`
  - `spotlight_profiles`
- Altered table:
  - `certificates` (added `template_id`, `learner_slug`, `shared_at`, `revoked_at`)
- View:
  - `mv_credential_funnel`

## Rollback notes
- Safe rollback sequence:
  1. Drop view `mv_credential_funnel`
  2. Drop newly added tables (reverse dependency order)
  3. Remove added columns from `certificates` only if no data is needed
- Preferred rollback for production:
  - Keep columns/tables and disable feature flags in UI/API.
  - Avoid destructive rollback when credential links are public.

## Data backfill plan
- For existing certificates:
  - `learner_slug` backfill from `trainee_id` (slugified).
  - `template_id` remains null until template assignment.
- For learner wallet:
  - Create `learner_profiles` for high-activity trainees first.
- For analytics:
  - `verification_logs` and `credential_events` start from deployment time.
