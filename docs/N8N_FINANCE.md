# n8n: scheduled finance snapshot

The dashboard exposes a **serverless endpoint** that returns a small JSON snapshot for automation (no browser JWT). Use it from n8n with a **Schedule** trigger and **HTTP Request** node.

## Endpoint

- **URL:** `POST https://<your-site>/.netlify/functions/finance-data?resource=n8n-report`  
  On Vercel with rewrites: `POST https://<your-site>/api/finance-data?resource=n8n-report` (same handler via [`api/[name].js`](../api/[name].js)).

## Authentication

Send header:

- `X-N8n-Secret: <same value as N8N_FINANCE_WEBHOOK_SECRET>`

Set `N8N_FINANCE_WEBHOOK_SECRET` in Netlify/Vercel environment variables. If unset or wrong, the handler returns `403`.

## Response (example)

```json
{
  "ok": true,
  "generated_at": "2026-04-02T12:00:00.000Z",
  "payments_last_7d_sum": 12345.67,
  "invoice_row_estimate": 42
}
```

Extend the handler in [`netlify/functions/finance-data.js`](../netlify/functions/finance-data.js) if you need richer payloads for email or Sheets.

The **dashboard Finance tab charts** (revenue trend, payment mix, AR aging) use other `finance-data` GET routes (`chart-revenue-trend`, `chart-payment-methods`, `ar-aging`) in the browser with JWT auth; they are unrelated to this `n8n-report` POST.

## Sample workflow

See [`automation/finance-report-trigger.json`](../automation/finance-report-trigger.json) for a minimal n8n workflow you can import (adjust URL and secret).
