# Sendmails SBS – Dashboard + Automation

## Contents

- **`automation/`** – n8n workflow triggered from the dashboard (Webhook).
- **`dashboard/`** – Dashboard UI (open `dashboard/index.html` in browser or deploy to Netlify; see `netlify.toml`).
- **`netlify/functions/`** – Serverless functions for login and user management (Supabase).
- **`SUPABASE_SETUP.md`** – Supabase and Netlify env setup for login (username/password from any device, admin can create users).

### Deploy to GitHub then Netlify
1. In project folder: `git init`, `git add .`, `git commit -m "Initial"`
2. On GitHub: create a new repo (e.g. `sendmails-sbs`) without README.
3. `git remote add origin https://github.com/YOUR_USERNAME/sendmails-sbs.git`, then `git branch -M main`, then `git push -u origin main`
4. In Netlify: Add new site → Import from GitHub → choose repo → Publish directory: **dashboard** → Deploy.

---

## Usage

1. **Run the workflow in n8n**
   - Import `automation/workflow.json` in n8n.
   - Activate the workflow and copy the **Webhook URL** (e.g. `https://your-n8n.com/webhook/sendmails-sbs`).

2. **Open the dashboard**
   - Open `dashboard/index.html` in the browser (or use a local server).

3. **In the dashboard**
   - **Settings:** paste the Webhook URL.
   - **Sheet:** paste the Google Sheet URL (columns: Email, Name, Row, Email Sent, optional: Certificate).
   - **Subject:** email subject; use `{{Name}}` etc. for merge.
   - **Body:** email body with formatting. Use `{{Name}}`, `{{Email}}`, `{{Certificate}}` for merge.

4. **Preview**
   - The preview section shows subject and body with sample data.

5. **Start sending**
   - Click **Start sending emails**. The request goes to n8n; the workflow responds and then reads the sheet and sends one email every 5 minutes.

## Notes

- n8n must have **Google Sheets** and **SMTP** (e.g. Hostinger) credentials configured.
- The **Row** column in the sheet must exist (e.g. `=ROW()`) so the correct row is updated after sending.
