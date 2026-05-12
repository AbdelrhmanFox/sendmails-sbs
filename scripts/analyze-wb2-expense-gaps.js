/**
 * Offline analysis: compare WB2 Sheet1 expense-side rows vs import-excel-data.js filters.
 * Usage: node scripts/analyze-wb2-expense-gaps.js [path-to-xlsx]
 */
const path = require('path');
const xlsx = require('xlsx');

const WB2_DEFAULT = 'C:/Users/abdelrahmanahmed/Downloads/مصاريف SBS (2) (2) (1) (1).xlsx';

/** Matches import-excel-data.js egpCellAmount (localized EGP strings in col12). */
function egpCellAmount(v) {
  if (v == null || v === '') return 0;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const s = String(v)
    .replace(/\u200f|\u200e/g, '')
    .replace(/ج\.م\.?/gi, '')
    .replace(/EGP/gi, '')
    .replace(/,/g, '')
    .replace(/\s+/g, '')
    .trim();
  const m = s.match(/([\d.]+)/);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Legacy: Number() only — failed on "330.00 ج.م." style cells. */
function numAmountOnly(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function main() {
  const wb2Path = process.argv[2] || WB2_DEFAULT;
  const wb2 = xlsx.readFile(wb2Path);
  const sheet1 = xlsx.utils.sheet_to_json(wb2.Sheets['Sheet1'], { header: 1, defval: '' });
  const dataRows = sheet1.slice(2);

  const expensePreFilter = (r) => r[9] && r[10] && egpCellAmount(r[12]) > 0;
  const expenseOldFilter = (r) => r[9] && r[10] && numAmountOnly(r[12]) > 0;
  const hasExpenseSide = (r) => [9, 10, 11, 12, 13, 14].some((i) => String(r[i] ?? '').trim() !== '');

  const expenseRows = dataRows.filter(expensePreFilter);
  const expenseRowsLegacy = dataRows.filter(expenseOldFilter);
  const candidates = dataRows.filter(hasExpenseSide);
  const skippedPre = candidates.filter((r) => !expensePreFilter(r));

  /** Rows that the OLD import skipped only because col12 was a string (historical gap). */
  const droppedByLegacyAmountOnly = [];
  for (let i = 0; i < dataRows.length; i += 1) {
    const r = dataRows[i];
    if (!r[9] || !r[10]) continue;
    if (numAmountOnly(r[12]) > 0) continue;
    const parsed = egpCellAmount(r[12]);
    if (parsed > 0) {
      droppedByLegacyAmountOnly.push({
        excelRow: i + 3,
        serial: r[9],
        date: r[10],
        description: String(r[11] || '').trim().slice(0, 80),
        amountEgp: parsed,
        col12Sample: String(r[12]).slice(0, 40),
      });
    }
  }

  const noDateButData = [];
  for (let i = 0; i < dataRows.length; i += 1) {
    const r = dataRows[i];
    if (!r[9] || r[10]) continue;
    if (!String(r[11] || '').trim() && !String(r[12] || '').trim()) continue;
    noDateButData.push({
      excelRow: i + 3,
      serial: r[9],
      description: String(r[11] || '').trim().slice(0, 80),
      amountEgp: egpCellAmount(r[12]),
      col12Sample: String(r[12]).slice(0, 40),
    });
  }

  console.log(JSON.stringify({
    file: path.basename(wb2Path),
    totalDataRows: dataRows.length,
    expenseRows_afterLocalizedAmountFix: expenseRows.length,
    expenseRows_legacyNumberOnlyImport: expenseRowsLegacy.length,
    rowsWithAnyExpenseCols9to14: candidates.length,
    skippedByPreFilter_expenseSide: skippedPre.length,
    historical_gap_rows_stringCol12NowFixed: droppedByLegacyAmountOnly.length,
    sumHistoricalGapEgp: droppedByLegacyAmountOnly.reduce((s, x) => s + x.amountEgp, 0),
    rows_missingCol10_dateButHasOtherData: noDateButData.length,
    sampleHistoricalGap: droppedByLegacyAmountOnly.slice(0, 12),
    sampleNoDate: noDateButData.slice(0, 8),
  }, null, 2));
}

main();
