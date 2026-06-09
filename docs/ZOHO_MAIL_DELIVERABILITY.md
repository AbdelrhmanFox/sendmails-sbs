# Zoho Mail deliverability and anti-spam plan

**Domain:** `sbsolutions-eg.com`  
**Organization (zoid):** `926508569`  
**Primary sender:** `info@sbsolutions-eg.com`  
**Campaign workflow:** `automation/workflow.json` (n8n)

This document is the single source of truth for keeping SBS outbound mail out of spam folders. It combines a live Zoho Admin audit (via **SBS-Mail MCP**), Zoho official guidance (via **Context7**), and concrete tasks for DNS, n8n, and content.

---

## MCP reference servers (for agents and staff)

Use these MCP servers in Cursor when implementing or auditing deliverability. Do not commit secrets (MCP URLs, API keys) into git.

| MCP | Scope | Purpose |
| --- | --- | --- |
| **SBS-Mail** (`user-SBS-Mail`) | Global `~/.cursor/mcp.json` | Official Zoho MCP — live org/domain/policy audit, DKIM/SPF verify |
| **context7** | Project `.cursor/mcp.json` + global | Up-to-date Zoho Mail and n8n documentation lookup |

### Useful SBS-Mail tools

| Tool | Use |
| --- | --- |
| `ZohoMail_fetchAllDomains` | List domains and SPF/DKIM/MX flags |
| `ZohoMail_fetchSpecificDomain` | DKIM selector details, verification status |
| `ZohoMail_VerifySpfRecord` | Re-check SPF after DNS edits |
| `ZohoMail_verifyDkimKey` | Re-check DKIM after DNS edits |
| `ZohoMail_fetchOrgUsersDetails` | Mailbox count and roles |
| `ZohoMail_getAllPolicies` | Outgoing rate limits and SMTP access |
| `ZohoMail_getMailAccounts` | Authenticated account + org id |

### Context7 library IDs

| Library | ID | Topics |
| --- | --- | --- |
| Zoho Mail help | `/websites/zoho_pt-br_mail_help` | SPF, DKIM, DMARC, spam guidelines |
| Zoho Mail API | `/websites/zoho_mail_help_api` | Admin API behavior |
| n8n docs | `/n8n-io/n8n-docs` | Send Email (SMTP) node limits |

---

## Current audit snapshot (2026-06-09)

Pulled via **SBS-Mail MCP** after OAuth connect.

### Domain authentication (Zoho Admin)

| Check | Status | Notes |
| --- | --- | --- |
| Domain verified | ✅ | `sbsolutions-eg.com` |
| SPF (Zoho view) | ✅ | `spfstatus: true` |
| DKIM (Zoho view) | ✅ | Selector `zmail`, default, verified |
| MX hosting | ✅ | `mxstatus: enabled` |
| Primary domain | ✅ | |

### Organization mailboxes (5 active)

| Email | Role |
| --- | --- |
| `info@sbsolutions-eg.com` | super_admin |
| `accounting@sbsolutions-eg.com` | member |
| `ahmed.saied@sbsolutions-eg.com` | member |
| `ibraheem.elashy@sbsolutions-eg.com` | member |
| `marwa.wael@sbsolutions-eg.com` | member |

### Business Policy (default)

| Setting | Value |
| --- | --- |
| Policy name | Business Policy |
| Users on policy | 5 |
| SMTP access | Enabled |
| Incoming max mail rate | 50 / period |
| Incoming max mail size | 25 MB |

### Public DNS audit (2026-06-09)

| Record | Current value | Status |
| --- | --- | --- |
| SPF (`@`) | `v=spf1 include:zohomail.com include:_spf.mail.hostinger.com ~all` | ⚠️ Dual senders — remove Hostinger after n8n migrates |
| DMARC (`_dmarc`) | `v=DMARC1; p=none` | ⚠️ Exists but no `rua` reporting |
| DKIM (`zmail._domainkey`) | Present (matches Zoho selector `zmail`) | ✅ |

### Gaps found (action required)

| # | Gap | Risk | Priority | Repo / ops status |
| --- | --- | --- | --- | --- |
| 1 | **n8n credential still Hostinger in live instance** | SPF/DKIM alignment fail → spam | **P0** | Workflow updated — see `docs/N8N_ZOHO_SMTP_SETUP.md` |
| 2 | **DMARC minimal** (no `rua`) | No reporting | **P1** | DNS edit in Hostinger |
| 3 | **SPF includes Hostinger** | Conflicting send paths | **P1** | DNS edit after Zoho SMTP works |
| 4 | **Zoho send-mail validation incomplete** on `info@` | Outbound may look suspicious | **P1** | Manual in Zoho Admin |
| 5 | **No List-Unsubscribe header** (n8n limitation) | Bulk spam score penalty | **P2** | Footer + reply opt-out added in workflow |

---

## Implementation phases

### Phase 0 — Prerequisites (one-time)

- [ ] Zoho Mail admin access (`info@sbsolutions-eg.com` super_admin)
- [ ] DNS access for `sbsolutions-eg.com` (registrar / Hostinger)
- [ ] n8n credential editor access
- [ ] SBS-Mail MCP connected in Cursor (already done)

### Phase 1 — DNS authentication (P0–P1)

**Goal:** Only Zoho may send mail for `@sbsolutions-eg.com`, with DKIM signing and DMARC monitoring.

#### 1.1 SPF (TXT on `@`)

Zoho-only sending (recommended once Hostinger SMTP is retired):

```txt
v=spf1 include:zoho.com ~all
```

If Hostinger webmail must still send temporarily, use a single combined record (then remove Hostinger when fully on Zoho):

```txt
v=spf1 include:zoho.com include:hostinger.com ~all
```

**Rules:**

- Only **one** SPF TXT record on `@`
- After edit, run `ZohoMail_VerifySpfRecord` via MCP or Zoho Admin → Domains → Verify

References: [Zoho spam control guidelines](https://www.zoho.com/mail/help/guidelines-spam-control.html), [SPF setup](https://www.zoho.com/mail/help/adminconsole/spf-configuration.html)

#### 1.2 DKIM (already active in Zoho)

Current selector: **`zmail`**

DNS TXT host (typical):

```txt
Host: zmail._domainkey
Value: (copy full public key from Zoho Admin → Domains → DKIM → Copy button)
```

**Critical:** Publishing DNS is not enough — in Admin Console click **Verify**, then **Enable DKIM** for the selector.

MCP check: `ZohoMail_fetchSpecificDomain` → `dkimDetailList[].isVerified` and `isDefault`.

#### 1.3 DMARC (add if missing)

Start in monitoring mode (phase 1):

```txt
Host: _dmarc
Value: v=DMARC1; p=none; rua=mailto:dmarc-reports@sbsolutions-eg.com; fo=1; adkim=s; aspf=s
```

Progression (after 2–4 weeks of clean reports):

| Phase | Policy | When |
| --- | --- | --- |
| 1 | `p=none` | Now — collect reports |
| 2 | `p=quarantine` | SPF+DKIM pass rate > 95% |
| 3 | `p=reject` | Stable inbound; no legit mail failing |

References: [DMARC policy](https://www.zoho.com/mail/help/adminconsole/dmarc-policy.html)

#### 1.4 MX (receive only — already enabled)

Use values from Zoho Admin → **Tools & Configurations** (data center specific). Do not mix third-party MX with Zoho unless intentional.

---

### Phase 2 — n8n sending path (P0)

**Goal:** Campaign mail exits through **Zoho SMTP** with the same From address Zoho signs (DKIM alignment).

#### 2.1 Create Zoho App Password

1. Zoho Account → **Security** → **App Passwords**
2. Generate password for "n8n SBS campaigns"
3. Store in n8n credentials vault only (never in repo)

#### 2.2 n8n SMTP credential

| Field | Value |
| --- | --- |
| Host | `smtp.zoho.com` |
| Port | `465` (SSL) or `587` (TLS/STARTTLS) |
| User | `info@sbsolutions-eg.com` |
| Password | Zoho **App Password** (not login password) |

#### 2.3 Workflow settings (`automation/workflow.json`)

| Setting | Value |
| --- | --- |
| Node name | `Send Email (Zoho SMTP)` |
| From | `SBS – Sustainable Business Solutions <info@sbsolutions-eg.com>` |
| Reply-To | `info@sbsolutions-eg.com` |
| Batch delay | 5 minutes (keep — good for reputation) |
| `appendAttribution` | `false` |

**Re-import** the workflow in n8n after pulling repo changes, then attach the new SMTP credential to the send node.

#### 2.4 Retire Hostinger SMTP for campaigns

- Remove Hostinger from SPF when no longer sending from it
- Disable or delete old n8n SMTP credential to avoid accidental use

---

### Phase 3 — Content and list hygiene (P1–P2)

#### 3.1 Email body checklist (dashboard / Quill)

- [ ] Clear subject (no ALL CAPS, no "FREE!!!")
- [ ] Balanced text-to-image ratio; avoid image-only bodies
- [ ] Working HTTPS links only (avoid URL shorteners)
- [ ] Physical/org identity in footer (SBS name, contact)
- [ ] Honest preview text matching body
- [ ] Merge fields resolve to real values (no empty `{{Name}}`)

#### 3.2 List hygiene (Google Sheet)

- [ ] Column **Email** trimmed (workflow already normalizes Unicode spaces)
- [ ] Column **Email Sent** tracks `Sent` / `Error`
- [ ] Optional column **Send Error** for debugging
- [ ] Remove hard bounces manually; do not re-send
- [ ] Do not send to purchased lists

#### 3.3 Warm-up for large campaigns

| Day | Suggested volume |
| --- | --- |
| 1–3 | 20–50 emails/day |
| 4–7 | 50–100 |
| 8+ | Scale gradually; keep 5-min gap |

Current workflow: **1 email / 5 minutes** ≈ 288/day max — acceptable if list is opted-in.

#### 3.4 Unsubscribe (P2 — n8n limitation)

The n8n **Send Email (SMTP)** node does **not** support custom headers (`List-Unsubscribe`). Workarounds:

1. **Short term:** Visible unsubscribe line in HTML footer + reply-to `info@`
2. **Medium term:** Switch send node to **Zoho Mail API** or **ZeptoMail API** for `List-Unsubscribe` header support on bulk mail

---

### Phase 4 — Testing and monitoring (ongoing)

#### 4.1 Pre-flight test (every template change)

1. Send test to [mail-tester.com](https://www.mail-tester.com) address
2. Target score **≥ 8/10**
3. Fix SPF/DKIM/DMARC/blacklist issues from report

#### 4.2 MCP re-audit (after DNS or policy changes)

```
Prompt in Cursor (Agent mode):
"Using SBS-Mail MCP, verify SPF and DKIM for sbsolutions-eg.com
and list Business Policy SMTP settings."
```

#### 4.3 DMARC reports

- Create mailbox `dmarc-reports@sbsolutions-eg.com` (or use `info@`)
- Review weekly XML aggregates for fail sources

#### 4.4 Zoho postmaster

- Watch bounce/spam rates in Zoho Admin
- Keep `info@` send-mail validation completed (Admin → user → Send Mail Details → verify)

---

## Task checklist (copy for execution)

### DNS (Hostinger / registrar)

- [ ] Confirm single SPF TXT includes `include:zoho.com`
- [ ] Remove Hostinger from SPF when campaigns use Zoho only
- [ ] Confirm `zmail._domainkey` TXT matches Zoho (full key via Copy button)
- [ ] Add `_dmarc` TXT with `p=none` + `rua=mailto:...`
- [ ] Verify in Zoho Admin (SPF + DKIM buttons green)

### Zoho Admin

- [ ] Complete send-mail verification for `info@sbsolutions-eg.com`
- [ ] Confirm DKIM selector `zmail` is **enabled** (not just verified)
- [ ] Review Business Policy outgoing limits for campaign volume

### n8n

- [ ] Create Zoho App Password
- [ ] New SMTP credential → `smtp.zoho.com`
- [ ] Re-import `automation/workflow.json`
- [ ] Map credential to **Send Email (Zoho SMTP)**
- [ ] Send test row from dashboard preview/send flow

### Content

- [ ] Footer with org name + contact + opt-out line
- [ ] mail-tester score ≥ 8/10 on production template

---

## Architecture (target state)

```text
Dashboard (Campaigns)
    → n8n webhook (send)
        → Google Sheets (recipients)
        → Prepare Email Body (merge + sanitize)
        → Send Email (Zoho SMTP)  ← smtp.zoho.com, info@
            → DKIM sign (zmail selector)
            → SPF pass (include:zoho.com)
            → DMARC align (after _dmarc published)
        → Wait 5 min → mark sheet Sent/Error
```

**Do not send** `info@sbsolutions-eg.com` through Hostinger SMTP while Zoho DKIM is the signing path — receivers see alignment failures and score as spam.

---

## Related files

| File | Role |
| --- | --- |
| `automation/workflow.json` | n8n send pipeline |
| `.cursor/mcp.json` | Project MCP (Context7 reference) |
| `~/.cursor/mcp.json` | Global SBS-Mail Zoho MCP |
| `docs/PROJECT_BREAKDOWN.md` | Campaign architecture overview |

---

## Workflow deliverability changes (in repo)

| Change | File |
| --- | --- |
| Node renamed to **Send Email (Zoho SMTP)** | `automation/workflow.json` |
| `emailFormat: both` (HTML + plain text) | `automation/workflow.json` |
| Compliance footer + `_textPlain` generation | Prepare Email Body code node |
| Recipient regex validation | Has Email filter + Prepare Email Body |
| `replyTo: info@sbsolutions-eg.com` | Send Email node |

---

## Revision log

| Date | Change |
| --- | --- |
| 2026-06-09 | Initial audit via SBS-Mail MCP; plan and n8n rename to Zoho SMTP |
| 2026-06-09 | Public DNS audit; workflow footer/plain-text; `N8N_ZOHO_SMTP_SETUP.md` |
