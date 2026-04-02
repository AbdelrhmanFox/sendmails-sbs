const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'docs', 'excel-export');
const CANDIDATES = [
  path.join(ROOT, 'DataBase(SBS)v01.xlsm'),
  path.join(ROOT, 'docs', 'DataBase(SBS)v01.xlsm'),
];

function sanitizeName(name) {
  return String(name || 'sheet')
    .trim()
    .replace(/[^\w\-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function main() {
  const workbookPath = CANDIDATES.find((p) => fs.existsSync(p));
  if (!workbookPath) {
    console.error('No XLSM workbook found. Expected one of:');
    CANDIDATES.forEach((p) => console.error(`- ${p}`));
    process.exit(1);
  }

  ensureDir(OUT_DIR);
  const wb = XLSX.readFile(workbookPath, { cellDates: false, raw: false });
  const summary = [];

  wb.SheetNames.forEach((sheetName) => {
    const ws = wb.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(ws, { blankrows: false });
    const fileName = `${sanitizeName(sheetName)}.csv`;
    const outPath = path.join(OUT_DIR, fileName);
    fs.writeFileSync(outPath, csv, 'utf8');
    summary.push({ sheetName, fileName, outPath });
  });

  console.log(`Workbook: ${workbookPath}`);
  console.log(`Exported ${summary.length} sheet(s) to ${OUT_DIR}`);
  summary.forEach((s) => console.log(`- ${s.sheetName} -> ${s.fileName}`));
}

main();
