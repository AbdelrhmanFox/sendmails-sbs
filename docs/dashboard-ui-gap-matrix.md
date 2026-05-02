# Dashboard Legacy-to-React Gap Matrix

This matrix tracks parity between the legacy dashboard in `dashboard/` and the React dashboard in `dashboard-ui/`.

## Access And Entry Flows

- Staff login: **Complete**
- Trainee login: **Complete**
- Role-based default landing: **Complete** (now redirects to first allowed workspace route)
- Unauthorized route handling by role: **Complete** (redirect to role home instead of generic root)
- Trainee shell behavior: **Complete** (dedicated trainee portal route at `/spa/trainee/portal` with trainee-only workspace)
- Trainee route isolation: **Complete** (`canAccessPath` restricts trainees to `/trainee/portal` and `/account/password`)


## Public Query Flows

- `?session=` and `?group=` join flow: **Complete**
- `?classroom=` public classroom flow: **Complete**
- `?credential=` and `?learner=` credential flow: **Complete**
- Deterministic query precedence and one-flow rendering: **Complete**

## Training Materials And Classroom

- Batch materials CRUD component: **Complete**
- Integrate materials manager in batch edit modal: **Complete**
- Integrate materials manager in training classroom page: **Complete**
- Course library empty/loading states: **Complete**

## Operations Workspace

- Entity tabs (`trainees/courses/batches/enrollments`): **Complete**
- CRUD modal flows: **Complete**
- Insights and import routes: **Complete**
- Client-side table filter and sorting controls: **Complete**
- Trainee profile deep-link page parity: **Complete** (`/spa/operations/trainees/:traineeId`)
- Integration events (list + mark processed): **Complete** (`/spa/operations/integration-events`, `integration-events` function)
- LMS admin CRUD (programs, cohorts, cohort enrollments, rubrics, certificates, transcripts): **Complete** (`/spa/operations/lms-admin`, `lms-admin-data`)

## Support And Session Utilities

- Demo WhatsApp support CTA in app chrome: **Complete**
- Change password route/screen: **Complete**

## LMS And Assessments (Backend APIs In React)

- LMS analytics overview + completion-by-course: **Complete** (`/spa/training/lms-analytics`, `lms-analytics`)
- LMS catalog read-only (programs, cohorts, enrollments, rubrics, certificates, transcripts): **Complete** (`/spa/training/lms-catalog`, `lms-admin-data` GET)
- Assessments (list/create, questions, attempts, progress patch for trainers/admins): **Complete** (`/spa/training/assessments`, `assessment-data`)

## Legacy Live Session Room (Classic HTML vs React)

- In-page Jitsi voice (External API, same tab): **Complete** (`PublicSessionJoinPage`, `dashboard-ui/src/lib/jitsiVoice.ts`)
- Whiteboard tools (pen / line / text / eraser, color, stroke) + broadcast sync: **Complete**
- Group poll (broadcast-only, ephemeral): **Complete**
- Session-ended detection (poll `public-training-session`) + teardown: **Complete**
- Presence “sticker” columns (left/right on large screens): **Complete**
- Mobile Chat / Board tabs: **Complete**
- Presenter tools (QR from URL, script TTS, teleprompter): **Complete** (`TrainingPresenterPage` + `presenter/PresenterToolsPanel.tsx`)

## Remaining Known Gaps

None tracked for the legacy live-session parity slice above. Older `dashboard/classic/js/app.js` bundles (if any) are not in-repo; behavior is aligned to these React implementations.
