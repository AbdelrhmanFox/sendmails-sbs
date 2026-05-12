import { useCallback, useEffect, useState } from 'react';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { Input } from '../../components/design-system/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/design-system/Table';
import { functionsBase, getAuthHeaders, jsonFetch } from '../../../lib/api';
import { fmtFull } from './_shared';
import { EnrollmentPicker } from './EnrollmentPicker';

type LedgerRow = {
  id: string; amount: number; currency: string; method: string | null;
  received_at: string; reference: string | null; status: string; notes: string | null;
  created_by: string; enrollment_uuid: string;
  enrollments?: { enrollment_id: string; trainee_id: string; batch_id: string } | { enrollment_id: string; trainee_id: string; batch_id: string }[] | null;
};

export function FinanceLedgerPage() {
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const [filterEnrollment, setFilterEnrollment] = useState('');
  const [filterMethod, setFilterMethod] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const load = useCallback(async (pg = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ resource: 'ledger', page: String(pg), pageSize: '30' });
      if (filterEnrollment.trim()) params.set('enrollment_id', filterEnrollment.trim());
      if (filterMethod.trim()) params.set('method', filterMethod.trim());
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);
      const d = await jsonFetch<{ items: LedgerRow[]; total: number }>(
        `${functionsBase()}/finance-data?${params.toString()}`, { headers: getAuthHeaders() },
      );
      setRows(d.items || []);
      setTotal(d.total || 0);
      setPage(pg);
    } catch (_) { setRows([]); }
    finally { setLoading(false); }
  }, [filterEnrollment, filterMethod, fromDate, toDate]);

  useEffect(() => { void load(1); }, [load]);

  const pageSize = 30;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <h3 className="mb-3 text-sm font-semibold text-[var(--brand-text)]">Filter Ledger</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <EnrollmentPicker
            label="Enrollment"
            value={filterEnrollment}
            onChange={(id) => setFilterEnrollment(id)}
            optional
          />
          <Input label="Method" value={filterMethod} onChange={(e) => setFilterMethod(e.target.value)} placeholder="cash, card…" />
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--brand-muted)]">From</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
              className="w-full rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-sm text-[var(--brand-text)]" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--brand-muted)]">To</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
              className="w-full rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-sm text-[var(--brand-text)]" />
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <Button type="button" size="sm" onClick={() => void load(1)}>Apply</Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => { setFilterEnrollment(''); setFilterMethod(''); setFromDate(''); setToDate(''); }}>
            Clear
          </Button>
        </div>
      </Card>

      {/* Table */}
      <Card noPadding>
        <div className="flex items-center justify-between border-b border-[var(--brand-border)] px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-[var(--brand-text)]">Payment Ledger</h3>
            <p className="text-xs text-[var(--brand-muted)]">{total} records · page {page} of {totalPages || 1}</p>
          </div>
        </div>
        {loading ? (
          <div className="space-y-2 p-4">
            {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-10 animate-pulse rounded bg-[var(--brand-surface-2)]" />)}
          </div>
        ) : rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-[var(--brand-muted)]">No transactions found.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Enrollment</TableHead>
                <TableHead>Trainee</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const en = Array.isArray(r.enrollments) ? r.enrollments[0] : r.enrollments;
                return (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs text-[var(--brand-muted)]">{r.received_at?.slice(0, 10)}</TableCell>
                    <TableCell className="font-mono text-xs text-[var(--brand-text)]">{en?.enrollment_id ?? '—'}</TableCell>
                    <TableCell className="text-xs text-[var(--brand-muted)]">{en?.trainee_id ?? '—'}</TableCell>
                    <TableCell className="font-mono text-xs text-[var(--brand-muted)]">{en?.batch_id ?? '—'}</TableCell>
                    <TableCell className="text-xs capitalize text-[var(--brand-muted)]">{r.method ?? '—'}</TableCell>
                    <TableCell className="text-xs text-[var(--brand-muted)]">{r.reference ?? '—'}</TableCell>
                    <TableCell className="text-right text-sm font-semibold">
                      <span className={r.amount < 0 ? 'text-[var(--brand-danger)]' : 'text-[var(--brand-success)]'}>
                        {fmtFull(r.amount)}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-[var(--brand-muted)]">{r.created_by}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-end gap-2 border-t border-[var(--brand-border)] px-4 py-3">
            <Button type="button" size="sm" variant="secondary" disabled={page <= 1} onClick={() => void load(page - 1)}>Previous</Button>
            <span className="text-xs text-[var(--brand-muted)]">Page {page} / {totalPages}</span>
            <Button type="button" size="sm" variant="secondary" disabled={page >= totalPages} onClick={() => void load(page + 1)}>Next</Button>
          </div>
        )}
      </Card>
    </div>
  );
}
