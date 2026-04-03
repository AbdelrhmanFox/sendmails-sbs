# SBS Data Model (Workbook Driven)

This document is generated from workbook source and exported CSV sheets.

## Source lock

- Locked workbook source: `docs/DataBase(SBS)v01.xlsm` (fallback: `DataBase(SBS)v01.xlsm` at repo root)
- CSV export folder: `docs/excel-export`
- Dashboard **Operations Data** can import **`.xlsx`** files with the same column headers (see [`sample-import/README.md`](sample-import/README.md) for required columns and [`sample-import/SBS_operations_sample.xlsx`](sample-import/SBS_operations_sample.xlsx)).

## Workbook Inventory

### `batches.csv`

| Column | Inferred type |
| --- | --- |
| `Batch_ID` | text (identifier) |
| `Course_ID` | text (identifier) |
| `Batch_Name` | text |
| `Start_Date` | date |
| `End_Date` | date |
| `Trainer` | text |
| `Location` | text |
| `Capacity` | text |

### `courses.csv`

| Column | Inferred type |
| --- | --- |
| `Course_ID` | text (identifier) |
| `Course_Name` | text |
| `Category` | text |
| `Target_Audience` | text |
| `Duration_Hours` | text |
| `Delivery_Type` | enum/text |
| `Price` | numeric |
| `Description` | text |
| `Status` | enum/text |

### `enrollments.csv`

| Column | Inferred type |
| --- | --- |
| `Enrollment_ID` | text (identifier) |
| `Trainee_ID` | text (identifier) |
| `Batch_ID` | text (identifier) |
| `Enrollment_Status` | enum/text |
| `Payment_Status` | enum/text |
| `Amount_Paid` | numeric |
| `Certificate_Issued` | boolean |
| `Enroll_Date` | date |
| `Notes` | text |

### `input_form.csv`

| Column | Inferred type |
| --- | --- |
| `Smart Input Form (Use dropdowns. VBA will: Save + Auto Serial + Auto-fill IDs)` | text |

### `lists.csv`

| Column | Inferred type |
| --- | --- |
| `Trainee_Name` | text |
| `Trainee_ID` | text (identifier) |
| `Batch_Name` | text |
| `Batch_ID` | text (identifier) |

### `reference.csv`

| Column | Inferred type |
| --- | --- |
| `List Name` | text |
| `Values (one per row)` | text |

### `trainees.csv`

| Column | Inferred type |
| --- | --- |
| `Trainee_ID` | text (identifier) |
| `Full_Name` | text |
| `Phone` | text |
| `Email` | text |
| `Type` | enum/text |
| `Company_Name` | text |
| `Job_Title` | text |
| `University` | text |
| `Specialty` | text |
| `City` | text |
| `Created_Date` | date |

## Rules

1. The workbook remains the source of truth for schema and constraints.
2. New sheet exports must be generated from the workbook using `npm run workbook:export`.
3. Database tables and API endpoints must map to these sheet columns.
4. All UI labels and docs remain English-only.

---

## Database tables (Supabase) — extensions beyond workbook export

These tables are defined in `supabase/schema.sql` (and migrations under `supabase/migrations/`). Operations entities remain workbook-driven; the following add **finance**, **B2B**, **audit**, and **training tools**.

### `app_users`

- `role`: `admin`, `staff`, `trainer`, `user`, `accountant` (JWT includes `role` for menu visibility).

### `companies` (B2B)

- `id` (uuid), `name`, optional `billing_email`, `tax_id`, timestamps.

### `trainees` (extension)

- Optional `company_id` → `companies(id)` for B2B linkage. Import column: `Company_ID` / `company_id` (uuid string).

### `payments` (cash ledger)

- `enrollment_uuid` → `enrollments(id)` (internal uuid, not the business `enrollment_id` text).
- `amount`, `currency` (default EGP), `method`, `received_at`, `reference`, `status`, `notes`, `created_by`.
- **Refunds / adjustments:** negative `amount` allowed when `method` is exactly `refund` (validated in API). Prefer ledger sums over legacy `enrollments.amount_paid` for revenue KPIs.

### `invoices`, `invoice_lines`

- Invoice header: `company_id`, `invoice_number`, dates, `status`, totals, `currency`.
- Lines: `invoice_id`, optional `enrollment_uuid`, line amounts and description.

### `finance_audit_log`

- Append-only: `actor`, `action`, `entity`, `entity_id`, `payload` (jsonb), `created_at`. Written from `finance-data` on payment and invoice mutations.

### Training (existing + extensions)

- `training_sessions`, `training_groups`, `training_participants`, `training_messages` — live chat; `groups_count` may be 1–12 (student share link is session-scoped `?session=`; each group has its own `join_token`).
- `session_attendance` — per `group_id`, participant name, date, status.
- `training_materials` — optional `session_id` or `group_id`, title, url.

### Reporting consistency

- **Cash / revenue KPIs** should use **`payments`** as the source of truth. `enrollments.amount_paid` may remain as legacy; avoid double-counting in dashboards.
- **Finance tab charts** (static dashboard, Chart.js from CDN) call read-only `finance-data` routes: `chart-revenue-trend` (monthly payment totals), `chart-payment-methods` (totals by payment method over a rolling period), and `ar-aging` (same aging buckets as the AR card).

### Security (RLS)

- Operations and finance tables use **RLS deny-all** for `anon`/`authenticated`; the dashboard **never** uses the service key in the browser. All CRUD goes through Netlify/Vercel functions with the **service role** server-side only.


