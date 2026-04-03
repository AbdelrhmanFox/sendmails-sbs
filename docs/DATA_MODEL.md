# SBS Data Model (Workbook Driven)

This document is generated from workbook source and exported CSV sheets.

## Source lock

- Locked workbook source: `docs/DataBase(SBS)v01.xlsm` (fallback: `DataBase(SBS)v01.xlsm` at repo root)
- CSV export folder: `docs/excel-export`
- Dashboard **Operations Data** can import **`.xlsx`** files with the same column headers (see repository `README.md`).

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

