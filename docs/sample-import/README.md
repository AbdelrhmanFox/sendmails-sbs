# Operations import: Excel column reference

Use **`.xlsx`** files where **row 1** is the header row. Column names should match the workbook export (same names as `docs/excel-export/*.csv`) or **snake_case** equivalents (e.g. `trainee_id`, `Trainee_ID`).

In **Operations Data**, select the **entity** (trainees, courses, batches, enrollments), then import. The app picks a sheet whose **name** matches the entity (case-insensitive) or uses the **first sheet**.

## Required columns (must be present and non-empty)

| Entity | Required columns |
| --- | --- |
| **trainees** | `Trainee_ID` (or `trainee_id`) |
| **courses** | `Course_ID`, `Course_Name` |
| **batches** | `Batch_ID` |
| **enrollments** | `Enrollment_ID`, `Trainee_ID`, `Batch_ID` |

## Recommended header row (per sheet)

Use these names so imports match the locked workbook and `npm run import:workbook`.

### Sheet: `trainees`

| Column | Required | Notes |
| --- | --- | --- |
| `Trainee_ID` | Yes | Unique business key |
| `Full_Name` | No | |
| `Phone` | No | |
| `Email` | No | |
| `Type` | No | Maps to trainee type (same as `trainee_type`) |
| `Company_Name` | No | |
| `Job_Title` | No | |
| `University` | No | |
| `Specialty` | No | |
| `City` | No | |
| `Created_Date` | No | Date: `YYYY-MM-DD`, `MM/DD/YYYY`, or Excel date |
| `Status` | No | Defaults to `Active` |
| `Notes` | No | |

### Sheet: `courses`

| Column | Required | Notes |
| --- | --- | --- |
| `Course_ID` | Yes | Unique business key |
| `Course_Name` | Yes | |
| `Category` | No | |
| `Target_Audience` | No | |
| `Duration_Hours` | No | Number |
| `Delivery_Type` | No | e.g. `Online`, `Offline`, `Hybrid` (must match DB check if set) |
| `Price` | No | Number |
| `Description` | No | |
| `Status` | No | Defaults to `Active` |

### Sheet: `batches`

| Column | Required | Notes |
| --- | --- | --- |
| `Batch_ID` | Yes | Unique business key |
| `Course_ID` | No | Link to course |
| `Batch_Name` | No | |
| `Start_Date` | No | Date |
| `End_Date` | No | Date |
| `Trainer` | No | |
| `Location` | No | |
| `Capacity` | No | Integer |

### Sheet: `enrollments`

| Column | Required | Notes |
| --- | --- | --- |
| `Enrollment_ID` | Yes | Unique business key |
| `Trainee_ID` | Yes | Must exist as trainee |
| `Batch_ID` | Yes | Must exist as batch |
| `Enrollment_Status` | No | Default `Registered`. Allowed: `Registered`, `Attended`, `Cancelled`, `Completed` |
| `Payment_Status` | No | Default `Pending`. Allowed: `Pending`, `Paid`, `Waived` |
| `Amount_Paid` | No | Number |
| `Certificate_Issued` | No | `Yes` / `No`, `true` / `false`, or Excel boolean |
| `Enroll_Date` | No | Date |
| `Notes` | No | |

## Sample file

[SBS_operations_sample.xlsx](SBS_operations_sample.xlsx) is a minimal workbook with one sheet per entity and example rows. Regenerate it after changing columns:

```bash
npm run sample-import:xlsx
```

See also [DATA_MODEL.md](../DATA_MODEL.md) and [WORKBOOK_SOURCE.md](../WORKBOOK_SOURCE.md).
