# LMS UI/UX Baseline IA

## Current shell map (before restructure)
- App shell: `dashboard/index.html` with `view-*` sections.
- Navigation engine: `dashboard/js/nav.js`.
- Boot and mode entry: `dashboard/js/app.js`.
- Role mapping: `dashboard/js/shared.js` (`ROLE_AREAS`).

## Target role-first experience map
- `admin`: operations, training, finance, automation, admin controls.
- `staff`: operations and automation.
- `trainer`: training delivery, classroom, library, credentials.
- `accountant`: finance workspace only.
- `trainee`: dedicated portal and course/classroom journey.
- `public`: join/classroom/credential verification routes.

## UX cutover decisions
1. Keep static architecture and endpoint contracts unchanged.
2. Introduce route-based state (`#/<area>/<view>`) with history-safe behavior.
3. Add shell-level context row (breadcrumb + role workspace title + quick actions).
4. Split style system into modular CSS layers while preserving existing tokens.
5. Move module ownership to domain folders with compatibility adapters.

## Primary JTBD per role
- Admin: monitor system, perform cross-area actions, manage users/config.
- Staff: manage operational records and campaign execution.
- Trainer: run sessions/classrooms and publish/grade learning work.
- Accountant: track finance KPIs, ledger, and invoice lifecycle.
- Trainee: access assigned batches, submit assignments, manage account password.
- Public: access join links and verify credentials quickly.
