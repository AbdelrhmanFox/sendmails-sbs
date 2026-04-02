# Workbook Source Lock

The dashboard database model is workbook-driven.

## Expected workbook file

- `DataBase(SBS)v01.xlsm` (preferred)
- fallback location: `docs/DataBase(SBS)v01.xlsm`

## Current status

- If the `.xlsm` file is present, run:
  - `npm run workbook:export`
  - `npm run data-model:build`
- If `.xlsm` is missing, the project uses CSV export mode from `docs/excel-export/`.

## Commands

```bash
npm run workbook:export
npm run data-model:build
```

These commands keep `docs/excel-export/` and `docs/DATA_MODEL.md` aligned with workbook structure.
