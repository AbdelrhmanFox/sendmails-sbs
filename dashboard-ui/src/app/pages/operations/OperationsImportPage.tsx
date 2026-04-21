import { useState } from 'react';
import { Card } from '../../components/design-system/Card';
import { functionsBase, getAuthHeaders, jsonFetch } from '../../../lib/api';
import { OPERATIONS_BULK_CHUNK, parseExcelToRows } from '../../../lib/operationsExcelImport';

type Entity = 'trainees' | 'courses' | 'batches' | 'enrollments';

const ENTITIES: { value: Entity; label: string }[] = [
  { value: 'trainees', label: 'Trainees' },
  { value: 'courses', label: 'Courses' },
  { value: 'batches', label: 'Batches' },
  { value: 'enrollments', label: 'Enrollments' },
];

type BulkResult = {
  ok?: boolean;
  imported?: number;
  failed?: number;
  skippedBlank?: number;
  errors?: { index: number; message: string }[];
};

export function OperationsImportPage() {
  const [entity, setEntity] = useState<Entity>('enrollments');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const runImport = async (file: File) => {
    setBusy(true);
    setMsg('Reading file…');
    try {
      const buf = await file.arrayBuffer();
      const rows = parseExcelToRows(buf, entity);
      if (!rows.length) {
        setMsg('No data rows found.');
        return;
      }
      let imported = 0;
      let failed = 0;
      const samples: string[] = [];
      for (let offset = 0; offset < rows.length; offset += OPERATIONS_BULK_CHUNK) {
        const chunk = rows.slice(offset, offset + OPERATIONS_BULK_CHUNK);
        setMsg(`Importing rows ${offset + 1}–${offset + chunk.length} of ${rows.length}…`);
        const data = await jsonFetch<BulkResult>(
          `${functionsBase()}/operations-data?entity=${encodeURIComponent(entity)}&bulk=1`,
          {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ items: chunk }),
          },
        );
        imported += data.imported ?? 0;
        failed += data.failed ?? 0;
        if (Array.isArray(data.errors)) {
          for (const er of data.errors) {
            if (samples.length < 8) samples.push(`row ${offset + er.index + 1}: ${er.message}`);
          }
        }
      }
      let text = `Imported ${imported} row(s).`;
      if (failed) text += ` ${failed} validation error(s).`;
      if (samples.length) text += ` Examples: ${samples.join('; ')}`;
      setMsg(text);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Import failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--brand-muted)]">
        Upload an Excel workbook (.xlsx). Column headers should match operations exports (see server mapping in{' '}
        <code className="text-xs text-[var(--brand-text)]">operations-import-map</code>). Rows are sent in chunks of {OPERATIONS_BULK_CHUNK}{' '}
        to <code className="text-xs text-[var(--brand-text)]">operations-data?bulk=1</code>.
      </p>
      <Card className="space-y-4 p-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--brand-text)]">Entity</label>
          <select
            className="w-full max-w-md rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2"
            value={entity}
            disabled={busy}
            onChange={(e) => setEntity(e.target.value as Entity)}
          >
            {ENTITIES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--brand-text)]">Excel file</label>
          <input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) void runImport(f);
            }}
            className="text-sm text-[var(--brand-text)] file:mr-3 file:rounded-[var(--brand-radius-dense)] file:border-0 file:bg-[var(--brand-primary)] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white"
          />
        </div>
        {msg ? <p className="text-sm text-[var(--brand-muted)]">{msg}</p> : null}
      </Card>
    </div>
  );
}
