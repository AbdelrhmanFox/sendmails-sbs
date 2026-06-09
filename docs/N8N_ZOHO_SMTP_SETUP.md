# n8n Zoho SMTP setup (manual steps)

Complete these steps in the **n8n UI** after pulling the latest `automation/workflow.json` from this repo. Credentials are never stored in git.

**Related:** [`ZOHO_MAIL_DELIVERABILITY.md`](ZOHO_MAIL_DELIVERABILITY.md)

> **Rate limits:** Zoho may block `info@` if sends are too fast or bounces are high. The workflow waits **20 minutes** between emails. If you see **Mail rate exceeded limit**, stop the workflow, unblock via [UnblockMe](https://mail.zoho.com/UnblockMe), then resume — or increase the wait (see §5).

---

## 1. Zoho App Password

1. Sign in as `info@sbsolutions-eg.com`
2. Go to [Zoho Account Security](https://accounts.zoho.com/home#security/security_pwd)
3. **App Passwords** → Generate → name it `n8n SBS campaigns`
4. Copy the password once (you will not see it again)

---

## 2. Create SMTP credential in n8n

1. n8n → **Credentials** → **Add credential** → **SMTP**
2. Name: `Zoho SMTP (info@sbsolutions-eg.com)`
3. Values:

| Field | Value |
| --- | --- |
| Host | `smtp.zoho.com` |
| Port | `465` |
| SSL/TLS | On (SSL) |
| User | `info@sbsolutions-eg.com` |
| Password | Zoho **App Password** from step 1 |

4. **Save** and use **Test** if available

**Alternative (STARTTLS):** Port `587`, enable STARTTLS.

---

## 3. Re-import workflow

1. n8n → **Workflows** → open the sendmails workflow (or import `automation/workflow.json`)
2. Open node **Send Email (Zoho SMTP)**
3. **Credential:** select `Zoho SMTP (info@sbsolutions-eg.com)`
4. Confirm:
   - From: `SBS – Sustainable Business Solutions <info@sbsolutions-eg.com>`
   - Email format: **Both** (HTML + plain text)
   - Reply-To: `info@sbsolutions-eg.com`
   - Append attribution: **off**
5. **Save** workflow and **Activate**

---

## 4. DNS (Hostinger / registrar)

Add or update these records for `sbsolutions-eg.com`:

### SPF (TXT on `@`)

**Current (2026-06-09):**

```txt
v=spf1 include:zohomail.com include:_spf.mail.hostinger.com ~all
```

**Target after n8n uses Zoho only** (replace the existing SPF TXT — keep only one SPF record):

```txt
v=spf1 include:zohomail.com ~all
```

### DMARC (TXT on `_dmarc`)

**Current:**

```txt
v=DMARC1; p=none
```

**Target** (update the existing `_dmarc` TXT):

```txt
v=DMARC1; p=none; rua=mailto:dmarc-reports@sbsolutions-eg.com; fo=1; adkim=s; aspf=s
```

### DKIM

Already active in Zoho (selector `zmail`). Do not change unless Zoho Admin shows a failure.

After DNS edits, verify in [Zoho Mail Admin](https://mailadmin.zoho.com) → Domains → `sbsolutions-eg.com`.

---

## 5. Send interval (Zoho SMTP)

The workflow waits **20 minutes** between each email (~**3/hour**, ~**24/day** over 8 hours).

| Wait | Per hour | Per day (8 h) | Notes |
| --- | --- | --- | --- |
| 5 min (old) | 12 | ~96 | Triggered block at ~50 emails |
| **20 min (current)** | **3** | **~24** | Safer for `info@` after unblock |
| 30 min | 2 | ~16 | Use if blocked again |

**Before resuming after a block:**

1. Unblock `info@` ([§ Unblock](#unblock-info-after-rate-limit)).
2. Clean bad emails from the sheet (invalid addresses cause bounces and faster blocks).
3. Re-import `automation/workflow.json` or set the **Wait** node to **20 minutes** in n8n.
4. Start with a **small batch** (10–15 rows) the first day; scale up if no errors.

If `550 5.4.6` or **Mail rate exceeded limit** returns, stop immediately and try **30 minutes** wait.

---

## 6. Smoke test

1. Dashboard → **Email Campaigns** → configure webhook + sheet
2. Add a **Send Error** column to the Google Sheet (workflow writes SMTP failures there)
3. Send **one** test row to your personal inbox
4. Optional: send to [mail-tester.com](https://www.mail-tester.com) address — target score **≥ 8/10**
5. In n8n execution log, confirm node **Send Email (Zoho SMTP)** succeeds
6. Click **Check status** — the dashboard shows **Errors** count and a red alert if Zoho returns a rate-limit message (`lastError`, `rateLimitHit` from the status webhook)

---

## 7. Retire Hostinger SMTP

When Zoho sends work reliably:

- Remove Hostinger from SPF if it was included
- Delete or disable the old n8n `SMTP account` (Hostinger) credential

---

## Campaign sending — free solutions ($0)

Your dashboard sends **automated, personalized mail from a Google Sheet** (~1 email every 5 minutes). **Zoho Mail cannot do this** — even slowly. Use one of these **free** paths instead (no credit card on the free tiers).

### Option A — Brevo free SMTP (recommended — keeps n8n + dashboard)

**Cost: $0 forever.** [Brevo free plan](https://www.brevo.com/pricing/): **300 emails/day**, unlimited contacts, SMTP included. Matches your original ~288/day at 5-minute intervals.

1. Sign up at [brevo.com](https://www.brevo.com) (no credit card).
2. **Senders & Domains** → verify `sbsolutions-eg.com` (add their SPF/DKIM TXT records in Hostinger).
3. n8n → **Credentials** → **SMTP**:
   - Host: `smtp-relay.brevo.com`
   - Port: `587` (TLS)
   - User: SMTP login from Brevo (e.g. `…@smtp-brevo.com`)
   - Password: Brevo **SMTP key** (Settings → SMTP & API)
4. Workflow **Send Email** node → Brevo credential; From: `info@sbsolutions-eg.com`.
5. Set **Wait** to **5 minutes** again.
6. Never use Zoho Mail SMTP for this workflow.

If you hit 300 in a day, sending pauses until the next day (quota resets daily).

### Option B — Zoho Campaigns free (100% Zoho, $0)

**Cost: $0 forever.** [Zoho Campaigns free](https://www.zoho.com/campaigns/pricing.html): **6,000 emails/month**, up to **2,000 contacts**, 5 users.

- Good if lists stay under 2,000 and ~200 emails/day average is enough.
- Import contacts from Google Sheets (Campaigns UI, Zoho Flow, or Zapier).
- Use merge tags for `{{Name}}`, etc.
- **Does not** plug into the current n8n row loop + dashboard composer without rebuilding that flow.

### Option C — Gmail SMTP (only if you already use Google)

**Cost: $0** with a personal Gmail account; **500 emails/day** limit. Google Workspace (if you already pay for it): up to **2,000/day**.

- Works with n8n SMTP (`smtp.gmail.com`, App Password).
- Sending as `info@sbsolutions-eg.com` needs extra “Send mail as” / domain setup.
- Google discourages bulk marketing; fine for small opted-in lists only.

### Do not use for campaigns

| Service | Why |
| --- | --- |
| Zoho Mail `info@` | Policy forbids automated bulk; you already hit rate block |
| Zoho ZeptoMail | Paid credits; transactional only, not marketing bulk |
| Amazon SES | Pay-per-send (cheap but not free) |

### What to do with `info@sbsolutions-eg.com`

| Use | Provider |
| --- | --- |
| Staff reply, 1-to-1 business mail | Zoho Mail (keep as-is) |
| Sheet-driven campaign sends | **Brevo free** or **Zoho Campaigns free** — never Zoho Mail SMTP |

---

## Unblock `info@` after rate limit

If the mailbox shows **Mail rate exceeded limit**:

1. **Stop** the n8n campaign workflow immediately (dashboard **Stop** or deactivate workflow).
2. Open [mail.zoho.com/UnblockMe](https://mail.zoho.com/UnblockMe) while signed in as `info@` (or ask super admin).
3. Admin Console → **Security & Compliance** → **Blocked Accounts** → **Temporarily Blocked** → unblock `info@sbsolutions-eg.com`.
4. Wait up to **1 hour** — many rate blocks auto-lift.
5. If the block persists or repeats: email **support@zohomail.com** and explain campaigns will move off Zoho Mail SMTP.
6. Do **not** resume bulk sends via `smtp.zoho.com` — you will be blocked again.

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `535 Authentication failed` | Use App Password, not login password |
| `Sender address rejected` | From must be `info@sbsolutions-eg.com` |
| `550 5.4.6` / **Mail rate exceeded limit** | Unblock `info@`; migrate campaigns to **Brevo free** or **Zoho Campaigns free** |
| Mail lands in spam | Complete DNS (DMARC), run mail-tester, check SPF/DKIM in Zoho Admin |
| `Invalid recipient` skipped | Sheet email must match `user@domain.tld` (workflow validates format) |

Use **SBS-Mail MCP** in Cursor to re-audit: `ZohoMail_VerifySpfRecord`, `ZohoMail_verifyDkimKey`, `ZohoMail_fetchSpecificDomain`.
