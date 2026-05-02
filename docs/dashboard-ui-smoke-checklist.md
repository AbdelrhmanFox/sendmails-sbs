# Dashboard UI Smoke Checklist

Use this checklist after parity changes between `dashboard/` and `dashboard-ui/`.

## By Role

- Admin
  - Can open `operations`, `training`, `finance`, `automation`, and `admin`.
  - Can create/edit/delete operations entities.
  - Can open insights/import and change password.
- Staff
  - Lands on operations area by default.
  - Cannot access restricted areas (training/finance/admin) unless granted.
  - Can use operations CRUD within server-side permissions.
- Trainer
  - Lands on training area by default.
  - Can access training sessions, classroom, materials, library, and credentials.
  - Cannot access finance/admin routes.
- Trainee
  - Can authenticate with trainee account type.
  - Lands on `/spa/trainee/portal` by default.
  - Sees trainee-only layout without sidebar and can sign out.
  - Can load enrolled courses, classroom assignments/materials, and submit assignment text/files.
  - Can update password from trainee portal.
- Accountant
  - Lands on finance by default.
  - Cannot access operations/training/admin routes.

## Private Route Coverage

- `/spa/login` signs in and stores `sbs_token`, `sbs_role`, `sbs_username`.
- `/spa/operations/*` loads tabs and CRUD modal.
- `/spa/operations/trainees/:traineeId` opens trainee profile deep-link page from trainees list.
- `/spa/training/*` loads all nested pages.
- `/spa/trainee/portal` loads trainee-only portal flows.
- `/spa/finance`, `/spa/automation`, `/spa/admin` respect role access.
- Unknown private route redirects to role home.

## Public Query Coverage

- `/?session=<id>` loads group picker then join flow.
- `/?group=<token>` opens direct join flow.
- `/?classroom=<token>` opens public classroom page.
- `/?credential=<token>` verifies a credential.
- `/?learner=<slug>` opens learner profile with credential links.

## Live Session Join (React public page)

- After join: chat sends and optional whiteboard draws sync to a second browser on the same group (Realtime enabled).
- Jitsi voice: embedded meeting loads in-page when `voice_room_url` is a Jitsi URL (default from `training-sessions`); Leave voice disposes the iframe; Rejoin voice remounts.
- Poll: start with two+ choices, vote from second participant, tallies update; End poll clears for others.
- Trainer deletes session in dashboard: within ~20s the public join page should show **Session ended** and disable sending (poll failure on `public-training-session`).

## Presenter Tools (staff)

- `/spa/training/presenter`: table loads; **Presenter tools** section — QR generates and downloads; Script reader plays a short line (browser TTS); Teleprompter scroll and fullscreen work.

## Regression Checks

- Batch material upload/link/delete works in both classroom and batch edit contexts.
- Course library empty state appears when no chapter materials exist.
- Operations filter/sort controls update visible rows and do not break CRUD.
- WhatsApp support button appears only when number is configured.
