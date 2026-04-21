import * as XLSX from 'xlsx';

export const OPERATIONS_BULK_CHUNK = 75;

/** Match legacy `dashboard/js/operations.js` `parseExcelToRows` (sheet name heuristic + row cleanup). */
export function parseExcelToRows(arrayBuffer: ArrayBuffer, entity: string): Record<string, unknown>[] {
  const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
  const names = wb.SheetNames;
  if (!names.length) throw new Error('The workbook has no sheets.');
  const want = entity.replace(/_/g, '').toLowerCase();
  let sheetName = names[0];
  const match = names.find((n) => {
    const nl = String(n)
      .replace(/[^a-z0-9]/gi, '')
      .toLowerCase();
    return nl === want || nl.includes(want) || want.includes(nl);
  });
  if (match) sheetName = match;
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false });
  return rows.map((row) => {
    const o: Record<string, unknown> = {};
    Object.keys(row).forEach((k) => {
      let v = row[k];
      if (v instanceof Date && !Number.isNaN(v.getTime())) v = v.toISOString().slice(0, 10);
      o[k] = v === null || v === undefined ? '' : v;
    });
    return o;
  });
}
