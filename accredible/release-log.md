# Release Log - Accredible Parity

## Slice 1 (implemented)
- Added phase6 migration for credential templates, public verification logs, learner profiles, pathways, spotlight, and analytics view.
- Added staff backend API: `netlify/functions/credential-center.js`.
- Added public backend API: `netlify/functions/credential-public.js`.
- Added credential center UI, public verification UI, and learner wallet UI in dashboard.
- Added implementation and operation docs under `accredible/`.

## Risks
- CSV parser is intentionally simple; quoted comma support is not implemented yet.
- Public share telemetry uses best-effort logging and is non-blocking.
- Pathway progress automation is not yet connected to completion events.
- MFA/SSO integration remains a next slice tied to auth provider decisions.

## Next actions
1. Add robust CSV parser with row-level error export.
2. Add template visual editor and advanced metadata mapping.
3. Connect pathway enrollment progress to `transcript_entries` completion changes.
4. Implement MFA challenge flow in login and add SSO integration.
5. Add optional blockchain notarization for enterprise plans.
