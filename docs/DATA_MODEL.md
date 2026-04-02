# SBS Data Model (Workbook Driven)

This data model is generated from workbook exports. The current repository includes one exported sheet:

- `docs/excel-export/enrollments.csv`

## Workbook Inventory (Current)

### `enrollments.csv`

| Column | Type | Notes |
| --- | --- | --- |
| `Enrollment_ID` | text | Primary business ID, format like `EN-00001`. |
| `Trainee_ID` | text | Trainee reference ID (`TR-...`). |
| `Batch_ID` | text | Batch reference ID (`BA-...` or numeric in current sample). |
| `Enrollment_Status` | text | Enum candidate: `Registered`, `Attended`. |
| `Payment_Status` | text | Enum candidate: `Pending`, `Paid`. |
| `Amount_Paid` | numeric | Nullable amount. |
| `Certificate_Issued` | text/boolean | Current values include empty and `No`; normalized to boolean in app. |
| `Enroll_Date` | date | Mixed formats in source (`MM/DD/YYYY`, `DD-MM-YYYY`). |
| `Notes` | text | Optional free text. |

## Normalized Entities

- `enrollments`
- `trainees` (inferred relation from `Trainee_ID`; waiting for source export)
- `batches` (inferred relation from `Batch_ID`; waiting for source export)

## Data Rules

1. The workbook remains the source of truth for fields and relationships.
2. New CSV exports should be placed under `docs/excel-export/`.
3. IDs are stored as text keys to avoid mixed-format issues from spreadsheets.
4. Dates are normalized to `YYYY-MM-DD` in API logic before write.
5. Enums are constrained in database where source values are stable.
