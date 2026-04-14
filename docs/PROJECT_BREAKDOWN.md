# Project Brief — Structured Breakdown

Extraction from the full project brief (`docs/PROJECT_PROMPT.md`).

Historical context only: do not use this file as the primary implementation source for current work.

Current implementation precedence:

1. `CLAUDE.md`
2. `AGENTS.md`
3. `README.md`
4. Focused docs (for example `docs/DASHBOARD.md`, `docs/DATA_MODEL.md`, and deploy docs)

---

## 1. Project Summary

**What the system does (plain English):**

- Users open a **web dashboard** (optionally after logging in).
- They enter an **n8n webhook URL** and a **Google Sheet URL**. The sheet contains rows of recipients (e.g. Name, Email) and a column **"Email Sent"** that the system will update.
- They **load the sheet columns** so the dashboard shows available merge fields (e.g. `{{Name}}`, `{{Email}}`) and a sample row.
- They write an **email subject** and **rich-text body** using those merge fields.
- They click **Start Sending Emails**. The dashboard sends one request to n8n; n8n **responds immediately** then, in the background, reads the sheet, filters to rows not yet sent, and **sends one email every 5 minutes**, updating "Email Sent" to "Sent" or "Error" per row.
- Users can **check sending status** (how many sent, how many pending, last row sent, next row to send). After starting a send, the dashboard can **auto-refresh** this status every 60 seconds until they stop it or until there are no more pending rows.
- Optional: **Login** (Supabase + Netlify Functions), **QR code** generator, **admin** user management (add/list/reset/delete users).

In short: **Bulk email from a Google Sheet, one every 5 minutes, with merge fields and a dashboard to configure and monitor it.**

---

## 2. Tech Stack

| Category | Technology / Service | Role |
|----------|----------------------|------|
| **Automation** | n8n (self-hosted or cloud) | Single workflow: Webhook → branch by action → Google Sheets read/update, Code, Filter, Split In Batches, SMTP, Wait, Set, Respond. |
| **Dashboard UI** | HTML | Single page: login screen + app (header, tabs, step cards). |
| **Dashboard styling** | CSS | Variables, layout, cards, buttons, status grid, editor, preview. No preprocessor. |
| **Dashboard logic** | Vanilla JavaScript (ES modules) | Entry `dashboard/js/app.js` imports feature modules (`operations`, `finance`, `training`, `campaigns`, `admin`, `nav`, `shared`, `config`). Auth, webhook fetch calls, Quill init, Finance charts (Chart.js CDN), status polling, localStorage. |
| **Rich text** | Quill | Email body editor (toolbar + RTL/LTR + merge-field insert). |
| **Hosting (static)** | Netlify | Serves `dashboard/` as site root. |
| **Auth DB** | Supabase | Table `app_users` (username, password_hash, role). |
| **Auth API** | Netlify Functions | login, create-user, list-users, reset-password, delete-user, seed. |
| **Auth tokens** | JWT | Signed with JWT_SECRET; stored in localStorage; sent as `Authorization: Bearer <token>`. |
| **Password hashing** | bcrypt (e.g. bcryptjs) | Used in Netlify Functions when creating/resetting passwords. |
| **Sheet** | Google Sheets | Data source; read (preview, status, send) and update ("Email Sent" column). |
| **Email** | SMTP (e.g. Hostinger) | Configured in n8n; one email per batch item. |
| **QR** | External API (e.g. api.qrserver.com) | Generate QR image from URL/text; dashboard shows image + download. |

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│  User browser                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  Dashboard (HTML/CSS/JS) — Netlify static (/)                        │  │
│  │  • Settings (webhook URL, sheet URL)                                 │  │
│  │  • Load columns / Start sending / Check status                      │  │
│  │  • Subject + Body (Quill) + Preview                                  │  │
│  └───────────────┬─────────────────────────────┬───────────────────────┘  │
│                  │                             │                           │
│                  │ POST (action, sheetUrl, …)   │ POST (login, user mgmt)   │
│                  ▼                             ▼                           │
└─────────────────────────────────────────────────────────────────────────┘
                   │                             │
                   │                             │
     ┌─────────────▼─────────────┐    ┌──────────▼──────────┐
     │  n8n (Webhook)            │    │  Netlify Functions  │
     │  • preview → Read sheet   │    │  • login            │
     │  • status  → Read + count │    │  • create-user      │
     │  • send    → Respond then │    │  • list-users       │
     │    run send loop          │    │  • reset-password   │
     └─────────────┬─────────────┘    │  • delete-user     │
                   │                  │  • seed             │
                   │                  └──────────┬──────────┘
                   │                             │
                   │                  ┌──────────▼──────────┐
                   │                  │  Supabase            │
                   │                  │  app_users           │
                   │                  └─────────────────────┘
                   │
     ┌─────────────▼─────────────┐    ┌─────────────────────┐
     │  Google Sheets            │    │  SMTP (e.g.         │
     │  • Read rows              │    │  Hostinger)         │
     │  • Update "Email Sent"    │    │  • Send email       │
     │    per row                │◄───┤    per batch item   │
     └──────────────────────────┘    └─────────────────────┘
```

**Flow summary:**

- **Dashboard → n8n Webhook:** All sheet-related actions (preview, status, send) go to one POST webhook URL with `action` and `sheetUrl` (and for send: `subject`, `bodyHtml`).
- **Dashboard → Netlify Functions:** Login and admin actions go to `/.netlify/functions/<name>`; auth uses JWT in localStorage and `Authorization` header.
- **n8n → Google Sheets:** Read all rows (or first row for preview); update "Email Sent" and row identifier after each send/fail.
- **n8n → SMTP:** One email per item from Split In Batches; then Wait 5 min, then next item.

---

## 4. n8n Workflow — Node-by-Node

**Entry:** One Webhook node, POST, `responseMode: responseNode`. Body: `sheetUrl`, `action`, and for send `subject`, `bodyHtml`.

---

### Branch: `action === 'preview'`

| # | Node | Purpose | Inputs | Outputs |
|---|------|---------|--------|--------|
| 1 | **IF** | `body.action === 'preview'` | Webhook payload | true → next node |
| 2 | **Google Sheets** | Read rows (documentId from `body.sheetUrl`, sheet e.g. gid=0) | — | All rows (or first N) |
| 3 | **Code** | From first item: `columns = Object.keys(first)`, `sampleRow = { ...first }` | Sheet rows | `{ columns, sampleRow }` or `{ columns: [], sampleRow: {}, error: 'No data' }` |
| 4 | **Respond to Webhook** | Respond with JSON | Code output | HTTP 200, JSON body |

---

### Branch: `action === 'status'`

| # | Node | Purpose | Inputs | Outputs |
|---|------|---------|--------|--------|
| 1 | **IF** | `body.action === 'status'` | Webhook payload | true → next node |
| 2 | **Google Sheets** | Read all rows (documentId from `body.sheetUrl`) | — | All rows |
| 3 | **Code** | For each row: detect "Email Sent" column (e.g. `/email\s*sent/i`); count `sent` (value "Sent"), `pending` (has email, not sent); `lastSentRow` = max row number among sent; `nextRowToSend` = lastSentRow + 1 or 2 | Sheet rows | `{ ok: true, sent, pending, lastSentRow, nextRowToSend }` |
| 4 | **Respond to Webhook** | Respond with JSON | Code output | HTTP 200, JSON body |

---

### Branch: `action === 'send'` (or default)

| # | Node | Purpose | Inputs | Outputs |
|---|------|---------|--------|--------|
| 1 | **IF** | `body.action !== 'preview'` and `body.action !== 'status'` (or default branch) | Webhook payload | → Respond + Read |
| 2 | **Respond to Webhook** | Immediate response | — | `{ ok: true, message: "Sending started" }` |
| 3 | **Google Sheets** | Read all rows (documentId from `body.sheetUrl`) | Webhook body | All rows |
| 4 | **Code (Only Rows Not Yet Sent)** | Trim all string values in each row. Exclude rows where "Email Sent" (or key matching `/email\s*sent/i`) equals "Sent" (case-insensitive). Set Row = row_number or Row column or (2 + index). | Sheet rows | Items for rows not yet sent |
| 5 | **Filter (Has Email)** | Keep only rows where `(Email ?? email).trim()` is not empty | Code output | Rows with valid email |
| 6 | **Split In Batches** | Batch size 1 | Filter output | One item per batch; loop back after each batch |
| 7 | **Code (Prepare Email Body)** | From webhook: subject, bodyHtml. From current row: all keys. Replace every `{{Key}}` in subject and body with row[Key]. Output `{ ...row, _subject, _html }`. | Webhook body + current item | One item with _subject, _html |
| 8 | **Send Email (SMTP)** | to = `(Email || email).trim()`, subject = _subject, html = _html | Prepared item | Success or error |
| 9 | **IF (Send OK?)** | No error (e.g. $run.error empty) | Send result | true → Wait; false → Mark Error |
| 10 | **Wait** | 5 minutes | — | Resume |
| 11 | **Set (Mark Email Sent)** | "Email Sent" = "Sent" | Wait output | Item with Email Sent set |
| 12 | **Set (Mark Email Error)** | "Email Sent" = "Error" | Send OK? false branch | Item with Email Sent set |
| 13 | **Google Sheets (Update Row)** | Update one row: match by row identifier (e.g. row_number or Row); set "Email Sent" column | Set output + sheetUrl from Webhook | — |
| 14 | **Back to Split In Batches** | Next batch | Update output | Loop to step 6 until no more items |

**Sheet column detection:** "Email Sent" column: by key matching `/email\s*sent/i` (e.g. "Email Sent", "Email  Sent"). Row identifier: `row_number` from Sheets node if present, else `Row` column, else index-based (e.g. 2 + i).

---

## 5. Dashboard UI — Screens, Tabs, Steps, Components

### 5.1 Global

- **Login screen:** Shown when no valid token/role in localStorage. Form: Username, Password, Log in. Error message area. Optional hint (e.g. local/local fallback).
- **App shell (after login):** Header + tabs + one visible tab pane.

### 5.2 Header

- **App title:** e.g. "SBS Sendmails".
- **Subtitle:** One line (e.g. choose sheet, set subject/body, trigger sending).
- **Logged-in username:** Right side.
- **Log out:** Minimal text link, right-aligned (not a heavy button). Click clears token/role/user from localStorage and reloads.

### 5.3 Tabs

- **Pill-style** tab bar.
- **Tabs:** "Send emails" (default), "QR Code", "Manage users" (visible only if role === 'admin').
- **Interaction:** Click switches active tab and visible pane; no URL routing.

### 5.4 Tab: Send emails — Step cards (1–7)

| Step | Card title | Components | Button / state | Placement / behaviour |
|------|-------------|------------|----------------|------------------------|
| **1. Settings** | Settings | Label "n8n Webhook URL" | — | — |
| | | URL input (flex) | — | Same row as button |
| | | **Save** button | Small, inline, secondary | Same row, right. On click: save URL to localStorage, show "Saved." |
| | | Hint text | — | Below row. Prefill input from localStorage on load. |
| **2. Choose action** | Choose action | Hint text | — | Above buttons |
| | | **Load Sheet Columns** | Outline/secondary | Left of two buttons, same row |
| | | **Start Sending Emails** | Filled primary (green), slightly larger | Right. **Disabled** until at least one successful Load columns (from step 2 or 4). |
| | | Message area | Success/error | Below buttons |
| **3. Sending status** | Sending status | **Check status** button | Secondary | **Top** of card |
| | | Hint text | — | Below button |
| | | Status result (when loaded) | 2×2 grid | Sent, Pending, Last sent row, Next row to send |
| | | Next-run line | Text | e.g. "Next run will send from row X (Y left)." |
| | | Stopped hint | Text (optional) | "If sending stopped, click Start sending again." |
| | | **Progress bar** | Thin animated bar | **Bottom** of card, only when auto-refresh on |
| | | Auto-update text | "Auto-updating every 1 min" | Below bar |
| | | Last updated | Time | Below bar |
| | | **Stop auto-update** | Red **text link** (not button) | Below progress/updated. Click stops polling, hides bar and link. |
| | | Last sending started | From localStorage | Optional, below stop link |
| | | Loading / error | — | Shown during fetch or on error |
| **4. Sheet** | Sheet (data source) | Label "Google Sheet URL" | — | — |
| | | Sheet URL input | Full width | Own row |
| | | **Load Columns** button | Secondary | **Below** input (not inline) |
| | | Hint | — | Below button |
| | | Column chips | Teal pills | After load success |
| | | Sample row table | Table | After load |
| | | Loading / error | — | During load or on error |
| **5. Email subject** | Email subject | Single text input | Full width, placeholder "Use {{Name}}, {{Email}} for merge fields" | No button |
| **6. Email body** | Email body | **Insert merge field** | Dropdown + Insert button | **Above** editor, **left** (outside Quill) |
| | | **RTL / LTR** toggle | Two buttons | **Top-right** of card (outside Quill) |
| | | Quill toolbar | Bold, lists, etc. | Directly above editor |
| | | Quill editor | Rich text | Below toolbar |
| | | Collapsible help | "How to use the editor" | Optional, below editor |
| **7. Preview** | Preview | Hint | — | — |
| | | **Subject** label | — | Row with copy icon on **right** |
| | | **Copy** icon (Subject) | Small button | Right of "Subject" label. Copies subject text to clipboard. |
| | | Subject preview box | Text | Placeholders replaced with sample |
| | | **Body** label | — | Row with copy icon on **right** |
| | | **Copy** icon (Body) | Small button | Right of "Body" label. Copies body text. |
| | | Body preview box | HTML/text | Placeholders replaced with sample. Display only, no buttons. |

### 5.5 Tab: QR Code

- Input: URL or text.
- **Generate** button (primary).
- QR image (from external API).
- **Download** link for image.
- Error message area.

### 5.6 Tab: Manage users (admin only)

- Form: New username, Password, **Add user** (primary).
- Success/error message.
- Table: Username, Role, Actions (Reset password, Delete). Delete not allowed for self or last admin.

### 5.7 Design tokens

- **Theme:** Dark (dark background, light text).
- **Accent:** Green for primary actions and key numbers.
- **Cards:** Rounded, border, step number in small circle (e.g. top-left).
- **Font:** e.g. Cairo; copy via i18n (e.g. English).
- **Buttons:** Primary = filled green; secondary = outline. Disabled state for "Start Sending Emails" until columns loaded.

---

## 6. API Contract — Webhook

**Base:** Single n8n webhook URL. All requests: **POST**, **Content-Type: application/json**.

### Request body (shared)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sheetUrl` | string | Yes | Full Google Sheet URL (used to derive document ID). |
| `action` | string | Yes | `"preview"` \| `"send"` \| `"status"`. |
| `subject` | string | For send | Email subject (merge fields allowed). |
| `bodyHtml` | string | For send | Email body HTML (merge fields allowed). |

### Response: `action === 'preview'`

- **Success:** `200`, body `{ columns: string[], sampleRow: object }`.
- **Error:** body may include `{ error: string }` or similar.

### Response: `action === 'status'`

- **Success:** `200`, body `{ ok: true, sent: number, pending: number, lastSentRow: number, nextRowToSend: number }`.
- **Error:** body may include `{ error: string }`.

### Response: `action === 'send'`

- **Accepted:** `200`, body `{ ok: true, message: "Sending started" }`. Workflow then continues in background; no further HTTP response for the send loop.

---

## 7. Auth System — Supabase + Netlify Functions

### 7.1 Data model (Supabase)

- **Table:** `app_users`.
- **Columns:** `username` (unique), `password_hash`, `role` ('admin' | 'user').

### 7.2 Flow

1. User submits username + password on login form.
2. Dashboard POSTs to `/.netlify/functions/login` with `{ username, password }`.
3. **If** env has local fallback and credentials match: return JWT with role admin (no DB).
4. **Else** Supabase: fetch user by username; bcrypt compare password to `password_hash`; if valid, sign JWT with `JWT_SECRET` (payload e.g. `{ username, role }`, expiry e.g. 7d).
5. Response: `{ token, role, username }`. Dashboard stores token, role, username in localStorage and reloads or shows app.
6. For admin endpoints: dashboard sends `Authorization: Bearer <token>`. Functions verify JWT and check role.

### 7.3 Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/.netlify/functions/login` | No | Body: `username`, `password`. Returns `token`, `role`, `username` or error. |
| POST | `/.netlify/functions/create-user` | Admin | Body: `username`, `password`. Hash password, insert into `app_users`. |
| GET | `/.netlify/functions/list-users` | Admin | Returns list of users (e.g. `{ users: [...] }`). |
| POST | `/.netlify/functions/reset-password` | Admin or self | Body: `username`, `newPassword`. Update `password_hash`. |
| POST | `/.netlify/functions/delete-user` | Admin | Body: `username`. Do not allow delete self or last admin. |
| GET | `/.netlify/functions/seed?key=SECRET` | Query key | Optional: create first admin; key from env (e.g. `SEED_SECRET_KEY`). |

### 7.4 JWT usage

- **Stored:** localStorage (e.g. keys: token, role, username).
- **Sent:** Header `Authorization: Bearer <token>` on all admin (and optionally reset-password) requests.
- **Verified:** In each protected function: decode JWT with `JWT_SECRET`; reject if invalid or expired; enforce admin where required.

### 7.5 Admin rules

- **Create user, list users, delete user:** Admin only.
- **Reset password:** Admin can reset any user; user can reset own (if implemented).
- **Delete:** Cannot delete self; cannot delete last admin (if enforced).
- **Admin tab:** Shown only when `role === 'admin'`.

---

## 8. JS Behaviour — Client-Side Actions

| Action | Trigger | What happens |
|--------|---------|--------------|
| **Load columns** | Click "Load Sheet Columns" or "Load Columns" (step 4) | POST webhook `{ action: 'preview', sheetUrl }`. On success: fill column chips and sample table; **enable** "Start Sending Emails". On error: show error in message/error area. |
| **Start sending** | Click "Start Sending Emails" | POST webhook `{ action: 'send', sheetUrl, subject, bodyHtml }`. On success: show "Sending started"; set `localStorage.sbs_sendmails_last_start` = now; call `startAutoStatus()`. On error: show in message area. |
| **Check status** | Click "Check status" | POST webhook `{ action: 'status', sheetUrl }`. On success: render 2×2 grid (sent, pending, lastSentRow, nextRowToSend); set "Last updated" time; if pending === 0, call `stopAutoStatus()`. On error: show in status error area. |
| **Start auto-refresh** | After successful Start sending | Set interval ~60 s for status poll; first poll ~10 s. Show progress bar and "Stop auto-update" link. Store interval id to clear later. |
| **Stop auto-update** | Click "Stop auto-update" link | Clear interval; hide progress bar and stop link. |
| **Save webhook** | Click "Save" (step 1) | Write `webhookUrl` to `localStorage` (e.g. `sbs_sendmails_webhook`); show "Saved." message. |
| **Prefill webhook** | Page load | Read `localStorage.sbs_sendmails_webhook`; if present, set webhook URL input value. |
| **Last sending started** | Page load / after start | Read `localStorage.sbs_sendmails_last_start`; if present, show "Last sending started: &lt;date&gt;" in status card. |
| **Copy (preview)** | Click copy icon next to Subject or Body | `navigator.clipboard.writeText(previewSubject.textContent)` or body text. No visible feedback specified (could add toast). |
| **Login** | Submit login form | POST `/.netlify/functions/login` with `username`, `password`. On success: store token, role, username in localStorage; reload. On error: show in login error area. |
| **Logout** | Click Log out | Remove token, role, username from localStorage; reload. |
| **Add user** | Submit add-user form (admin) | POST `/.netlify/functions/create-user` with auth header and body; on success refresh user list. |
| **Reset password** | Click Reset (admin tab) | Prompt for new password; POST `/.netlify/functions/reset-password` with auth header. |
| **Delete user** | Click Delete (admin tab) | Confirm; POST `/.netlify/functions/delete-user` with auth header; refresh list. |
| **RTL/LTR** | Click RTL or LTR | Set editor direction; persist in localStorage (e.g. `sbs_sendmails_editor_dir`); apply to Quill root and toggle button active state. |
| **Insert merge field** | Select field + Click Insert | Insert selected placeholder (e.g. `{{Name}}`) at current Quill selection. |
| **Preview update** | Input/change in subject or body | Replace `{{key}}` in subject and body with sample values; update preview Subject and Body DOM. |
| **Apply i18n** | Page load | Set document language and dir; replace `[data-i18n]` and placeholder texts from i18n object. |

---

## 9. Edge Cases & Robustness

| Edge case | Handling |
|-----------|----------|
| **Leading/trailing spaces in sheet (e.g. email)** | In n8n Code node, trim all string values of each row before filtering/sending. Prevents SMTP errors. |
| **Empty email** | Filter node keeps only rows where `(Email ?? email).trim()` is not empty. Rows with blank or whitespace-only email are skipped. |
| **"Email Sent" column name varies** | Detect by key matching regex `/email\s*sent/i` (e.g. "Email Sent", "Email  Sent", "email sent"). |
| **Row identifier** | Prefer `row_number` from n8n Google Sheets node; else `Row` column; else index-based (e.g. 2 + i for first data row). |
| **Status when no row sent yet** | `lastSentRow` 0 or null; `nextRowToSend` = 2 (first data row). |
| **CORS** | Dashboard and webhook on different origins: n8n/webhook must allow dashboard origin (or serve dashboard and webhook same domain). |
| **No columns / empty sheet (preview)** | Code returns e.g. `{ columns: [], sampleRow: {}, error: 'No data' }`; dashboard can show error or empty state. |
| **Start sending disabled** | "Start Sending Emails" disabled until at least one successful Load columns (step 2 or 4). |
| **Auto-refresh stop** | When `pending === 0` or user clicks "Stop auto-update": clear interval, hide progress bar and link. |
| **Auth: DB down** | Optional local fallback (e.g. LOCAL_FALLBACK_USER / LOCAL_FALLBACK_PASSWORD) returns admin JWT without Supabase. |
| **Auth: first admin** | Optional seed endpoint with secret key creates first admin in DB. |
| **Delete self / last admin** | delete-user must not allow deleting current user or last admin (if specified). |

---

## 10. File Structure

The implementation has grown past the original brief (sidebar shell, workbook operations, training groups, brand assets, Vercel router). **Authoritative layout:** [README.md](../README.md).

Current shape (summary):

```
project/
├── automation/workflow.json   # n8n: campaigns (preview, send, status); see also finance-report-trigger.json
├── api/[name].js              # Vercel: dispatches to netlify/functions handlers (via netlify/lib/vercel-adapter.js)
├── dashboard/                 # Static UI: login, Home, Operations (CRUD + Excel import), Campaigns, Training, Admin
├── dashboard/js/              # app.js (entry) + shared, nav, config, operations, finance, training, campaigns, admin
├── netlify/functions/         # login, operations-data, finance-data, training-*, users, public-config, public-training-session, seed, …
├── netlify/lib/               # _shared.js, vercel-adapter.js, operations-import-map.js (not deployed as standalone functions)
├── supabase/schema.sql        # full baseline for new projects
├── supabase/migrations/       # ordered SQL patches for existing databases
├── docs/                      # DATA_MODEL, WORKBOOK_SOURCE, DASHBOARD, N8N_FINANCE, this file, …
├── brand/                     # palette, logo exports, visual-identity kit
├── vercel.json, netlify.toml
└── README.md
```

Earlier subsections in this document (e.g. seven-step wizard, QR, RTL/i18n) describe the **original** brief; where they conflict with the live app, trust `README.md` and `docs/DASHBOARD.md`.

---

## 11. Deployment Steps

### 11.1 n8n setup

1. Install/access n8n (self-hosted or cloud).
2. Import `automation/workflow.json` into n8n.
3. Configure credentials in n8n:
   - **Google Sheets:** OAuth or service account with access to the target sheet.
   - **SMTP:** Host, port, user, password (e.g. Hostinger).
4. Set Webhook path (e.g. `/sendmails-sbs` or as in workflow).
5. Activate the workflow.
6. Copy the full webhook URL (e.g. `https://your-n8n.com/webhook/sendmails-sbs`).

### 11.2 Netlify config

1. Connect repository to Netlify (e.g. GitHub).
2. **Build settings:**
   - **Publish directory:** `dashboard`.
   - **Build command:** `echo Build complete` (or leave empty).
   - **Base directory:** (default, repo root).
3. **Environment variables** (Site settings → Environment variables):
   - `SUPABASE_URL` — Supabase project URL.
   - `SUPABASE_SERVICE_ROLE_KEY` — Service role key.
   - `JWT_SECRET` (or `SUPABASE_JWT_SECRET`) — Secret for JWT sign/verify.
   - Optional: `LOCAL_FALLBACK_USER`, `LOCAL_FALLBACK_PASSWORD`, `SEED_SECRET_KEY`.
4. **Node version:** In build environment, set `NODE_VERSION = 18` (or desired; e.g. in `netlify.toml`).
5. Deploy. Confirm `https://<site>/.netlify/functions/login` is reachable (e.g. POST returns 400 for missing body, not 404).

### 11.3 netlify.toml (optional but recommended)

- `[build]`: `command = "echo Build complete"`, `publish = "dashboard"`.
- `[build.environment]`: `NODE_VERSION = "18"`.
- `[[headers]]` for `/*`: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`.

### 11.4 Sheet setup

1. Create a Google Sheet with at least: **Email** (or email), **Email Sent**. Optional: **Name**, **Row** (e.g. `=ROW()`), and any merge columns.
2. Share the sheet with the Google account used by n8n (OAuth or service account email) with edit access.
3. In the dashboard, paste the sheet URL and use "Load Columns" to verify connection.

### 11.5 Post-deploy

1. Optional: Call `/.netlify/functions/seed?key=<SEED_SECRET_KEY>` once to create first admin.
2. Log in to the dashboard; paste n8n webhook URL and sheet URL; load columns, compose, then start sending if desired.
3. If dashboard and n8n are on different origins, ensure n8n webhook/CORS allows the Netlify origin.

---

## 12. Risks & Gaps

### 12.1 What could go wrong

- **n8n down or webhook URL wrong:** All dashboard actions (preview, status, send) fail; user sees network or 404/500 errors. No retry logic specified.
- **Sheet permissions:** If n8n credentials cannot read/write the sheet, preview and send fail; "Email Sent" updates may fail per row.
- **SMTP limits/blocking:** Provider may throttle or block; workflow may stop with errors; dashboard does not show per-email errors, only status counts.
- **Long-running send:** n8n run may timeout or be killed if run takes very long (many rows × 5 min). No resume token or checkpoint specified beyond "Email Sent" column.
- **CORS:** If webhook does not allow dashboard origin, browser blocks requests. Brief says “ensure n8n allows dashboard origin” but does not specify n8n CORS config.
- **JWT expiry:** Token expires (e.g. 7d); user must log in again. No refresh token flow specified.
- **Local fallback:** If LOCAL_FALLBACK_USER/PASSWORD are set, anyone who knows them gets admin; should only be used for dev or emergency.
- **Seed key in URL:** If SEED_SECRET_KEY is weak or leaked, anyone can create admin; use once then disable or rotate.

### 12.2 What is not fully specified

- **Error response shapes** for webhook: only `{ error: string }` mentioned for preview/status; HTTP status codes and other fields not detailed.
- **Google Sheets node options:** Sheet name/tab (e.g. gid=0), range, or “first row as header” — implied by “read all rows” and “first row as sample” but not explicit.
- **Update row:** Exact matching column(s) for Google Sheets update (e.g. by row number or a unique ID) not fully specified; “match by row or identifier” is high-level.
- **Quill placeholder:** Placeholder text for body (e.g. “Write your email body…”) may be in i18n but not listed in API or contract.
- **i18n keys:** Full list of keys and default strings not enumerated; only examples given.
- **Copy feedback:** No specification for toast or message after copy (e.g. “Copied to clipboard”).
- **Rate limiting:** No rate limit specified for login or webhook; could be abused.
- **Password policy:** Min length (e.g. 4) mentioned for reset; create-user and login policy not fully specified.
- **list-users response shape:** “Return list of users” — exact shape (e.g. `{ users: [{ username, role }] }`) not defined in brief.
- **netlify.toml and functions:** No `[functions]` section specified (e.g. node version for functions); NODE_VERSION in build may or may not apply to functions depending on Netlify version.

This breakdown remains useful for historical intent and gap analysis. For active implementation, follow current canonical docs listed at the top of this file.
