# Sendmails SBS

Dashboard + n8n automation for sending bulk emails from a Google Sheet (one email every 5 minutes). Merge fields in subject/body (e.g. `{{Name}}`, `{{Email}}`). Sheet column "Email Sent" is updated after each send.

---

## Contents

| Path | Description |
|------|-------------|
| `automation/` | n8n workflow (webhook → read sheet → filter → send email → update row). Import `workflow.json` and activate. |
| `dashboard/` | Web UI: webhook URL, sheet URL, subject/body editor, Load columns, Start sending, Sending status (with auto-refresh). Deploy as static site (e.g. Netlify publish dir: **dashboard**). |
| `netlify/functions/` | Serverless auth and user management (Supabase). See `SUPABASE_SETUP.md` for env vars. |
| `DASHBOARD.md` | Brief on dashboard layout, design, and behaviour. |

---

## Quick start

1. **n8n**: Import `automation/workflow.json`, add Google Sheets + SMTP credentials, activate workflow, copy the webhook URL.
2. **Dashboard**: Open `dashboard/index.html` (or deploy `dashboard/` to Netlify). Enter webhook URL and Google Sheet URL.
3. **Sheet**: Include columns e.g. Email, Name, and **Email Sent** (filled with "Sent" by the workflow). Optional: **Row** (e.g. `=ROW()`) for correct row updates.
4. **Send**: Set subject and body (use `{{Name}}`, `{{Email}}`, etc.), click **Start sending emails**. Use **Check status** (or the auto-update after start) to see Sent / Pending and where sending stopped.

---

## Deploy (GitHub → Netlify)

1. Push repo to GitHub.
2. Netlify: Add site → Import from GitHub → select repo → **Publish directory: `dashboard`** → Deploy.
3. Set environment variables (see `SUPABASE_SETUP.md`) for login.

---

## Notes

- n8n needs **Google Sheets** and **SMTP** (e.g. Hostinger) credentials.
- Emails from the sheet are trimmed (leading/trailing spaces removed) to avoid SMTP errors.
- Webhook actions: `preview` (columns + sample row), `send` (start sending), `status` (sent/pending/row counts).
