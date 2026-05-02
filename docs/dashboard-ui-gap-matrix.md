# Dashboard Legacy-to-React Gap Matrix

This matrix tracks parity between the legacy dashboard in `dashboard/` and the React dashboard in `dashboard-ui/`.

## Access And Entry Flows

- Staff login: **Complete**
- Trainee login: **Complete**
- Role-based default landing: **Complete** (now redirects to first allowed workspace route)
- Unauthorized route handling by role: **Complete** (redirect to role home instead of generic root)
- Trainee shell behavior: **Complete** (dedicated trainee portal route at `/spa/trainee/portal` with trainee-only workspace)

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

## Support And Session Utilities

- Demo WhatsApp support CTA in app chrome: **Complete**
- Change password route/screen: **Complete**

## Legacy Live Session Room (Classic HTML vs React)

- In-page Jitsi voice (External API, same tab): **Complete** (`PublicSessionJoinPage`, `dashboard-ui/src/lib/jitsiVoice.ts`)
- Whiteboard tools (pen / line / text / eraser, color, stroke) + broadcast sync: **Complete**
- Group poll (broadcast-only, ephemeral): **Complete**
- Session-ended detection (poll `public-training-session`) + teardown: **Complete**
- Presence “sticker” columns (left/right on large screens): **Complete**
- Mobile Chat / Board tabs: **Complete**
- Presenter tools (QR from URL, script TTS, teleprompter): **Complete** (`TrainingPresenterPage` + `presenter/PresenterToolsPanel.tsx`)

## Remaining Known Gaps

None tracked for the legacy live-session parity slice above. Older `dashboard/classic/js/app.js` bundles (if any) are not in-repo; behavior is aligned to `dashboard/classic/index.html` structure and these React implementations.
