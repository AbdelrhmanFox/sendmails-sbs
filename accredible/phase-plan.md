# Accredible Phase Plan (Execution)

## Phase 0 - Product framing and MVP lock
- Completed parity matrix in `accredible/parity-matrix.md`.
- Locked MVP entities and API surfaces:
  - `credential_templates`
  - `certificates` (extended)
  - `credential_events`
  - `verification_logs`
  - `learner_profiles`
  - `pathways` + `pathway_steps` + `pathway_enrollments`
  - `spotlight_profiles`

## Phase 1 - Core credential engine
- Implemented schema in `supabase/migrations/20260418_phase6_accredible_parity.sql`.
- Implemented staff API in `netlify/functions/credential-center.js`.
- Implemented public verification in `netlify/functions/credential-public.js`.
- Added dashboard view and interactions:
  - `dashboard/index.html` (`view-training-credentials`)
  - `dashboard/js/credentials.js`

## Phase 2 - Batch/API issuance and metadata
- CSV bulk issuance endpoint (`resource=bulk-issue`) supports headers:
  - `trainee_id,course_id,certificate_no,batch_id,template_id,status`
- Webhook issuance endpoint (`resource=webhook-issue`) supports signed payload via `CREDENTIAL_WEBHOOK_SECRET`.
- Metadata captured through `metadata` payload and stored on `certificates`.

## Phase 3 - Sharing and learner wallet
- Public credential view supports one-click share:
  - copy link
  - LinkedIn
  - X
  - Facebook
  - email
- Share telemetry tracked through:
  - `certificates.shared_at`
  - `credential_events` with `event_type='shared'`
- Public learner profile page implemented (`?learner=<slug>`).

## Phase 4 - Pathways, spotlight, analytics
- Pathway schema and create API implemented (`resource=pathways`).
- Spotlight schema and public read endpoint implemented (`resource=spotlight`).
- Analytics summary implemented:
  - materialized view `mv_credential_funnel`
  - dashboard summary card from `resource=analytics`.

## Phase 5 - Security and compliance hardening
- Added verification logs with hashed client IP (`verification_logs`).
- Added immutable credential event stream (`credential_events`).
- Prepared operational checklist and smoke checks in:
  - `accredible/test-smoke-checks.md`
  - `accredible/release-log.md`

## Deferred next increment (post-MVP)
- Drag-and-drop template designer UI.
- Full pathway progress automation from completion events.
- MFA and SSO provider integration in authentication flow.
- Optional blockchain notarization worker for credential hashes.
