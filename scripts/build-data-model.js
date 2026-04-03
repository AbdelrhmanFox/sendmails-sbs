const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const ROOT = process.cwd();
const EXPORT_DIR = path.join(ROOT, 'docs', 'excel-export');
const MODEL_PATH = path.join(ROOT, 'docs', 'DATA_MODEL.md');
const XLSM_CANDIDATES = [
  path.join(ROOT, 'docs', 'workbook', 'DataBase(SBS)v01.xlsm'),
  path.join(ROOT, 'DataBase(SBS)v01.xlsm'),
];

function detectWorkbookPath() {
  return XLSM_CANDIDATES.find((p) => fs.existsSync(p)) || null;
}

function listCsvFiles() {
  if (!fs.existsSync(EXPORT_DIR)) return [];
  return fs
    .readdirSync(EXPORT_DIR)
    .filter((f) => f.toLowerCase().endsWith('.csv'))
    .sort()
    .map((f) => path.join(EXPORT_DIR, f));
}

function parseCsvHeader(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const [headerLine = ''] = raw.split(/\r?\n/);
  return headerLine
    .split(',')
    .map((h) => h.trim())
    .filter(Boolean);
}

function classifyType(col) {
  const c = col.toLowerCase();
  if (c.endsWith('_id') || c === 'id') return 'text (identifier)';
  if (c.includes('date')) return 'date';
  if (c.includes('amount') || c.includes('price') || c.includes('paid')) return 'numeric';
  if (c.startsWith('is_') || c.includes('issued') || c.startsWith('has_')) return 'boolean';
  if (c.includes('status') || c.includes('type')) return 'enum/text';
  return 'text';
}

function buildMarkdown(workbookPath, sheets) {
  const sourceLine = workbookPath
    ? `- Locked workbook source: \`${path.relative(ROOT, workbookPath).replace(/\\/g, '/')}\``
    : '- Locked workbook source: **missing in workspace** (CSV export mode active)';

  const lines = [
    '# SBS Data Model (Workbook Driven)',
    '',
    'This document is generated from workbook source and exported CSV sheets.',
    '',
    '## Source lock',
    '',
    sourceLine,
    `- CSV export folder: \`${path.relative(ROOT, EXPORT_DIR).replace(/\\/g, '/')}\``,
    '',
    '## Workbook Inventory',
    '',
  ];

  if (!sheets.length) {
    lines.push('No CSV sheets found in `docs/excel-export/`.');
  } else {
    sheets.forEach((sheet) => {
      lines.push(`### \`${sheet.fileName}\``);
      lines.push('');
      lines.push('| Column | Inferred type |');
      lines.push('| --- | --- |');
      sheet.columns.forEach((col) => {
        lines.push(`| \`${col}\` | ${classifyType(col)} |`);
      });
      lines.push('');
    });
  }

  lines.push('## Rules');
  lines.push('');
  lines.push('1. The workbook remains the source of truth for schema and constraints.');
  lines.push('2. New sheet exports must be generated from the workbook using `npm run workbook:export`.');
  lines.push('3. Database tables and API endpoints must map to these sheet columns.');
  lines.push('4. All UI labels and docs remain English-only.');
  lines.push('');

  return `${lines.join('\n')}\n`;
}

function main() {
  const workbookPath = detectWorkbookPath();
  const csvFiles = listCsvFiles();
  const sheets = csvFiles.map((p) => ({
    fileName: path.basename(p),
    columns: parseCsvHeader(p),
  }));

  const markdown = buildMarkdown(workbookPath, sheets);
  fs.writeFileSync(MODEL_PATH, markdown, 'utf8');
  console.log(`Wrote data model: ${MODEL_PATH}`);
  console.log(`Workbook source: ${workbookPath || 'not found (CSV mode)'}`);
  console.log(`CSV sheets: ${sheets.length}`);
}

main();
