import { useCallback, useEffect, useState } from 'react';
import { Card } from '../../components/design-system/Card';
import { Badge } from '../../components/design-system/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/design-system/Table';
import { functionsBase, getAuthHeaders, jsonFetch } from '../../../lib/api';
import { fmt, fmtFull, type BatchRow, type ReceivableRow } from './_shared';

const STATUS_COLORS: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  paid: 'success', partial: 'warning', pending: 'neutral', overdue: 'danger',
};

export function FinanceReceivablesPage() {
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [rows, setRows] = useState<ReceivableRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    jsonFetch<{ items: BatchRow[] }>(`${functionsBase()}/finance-data?resource=my-batches`, { headers: getAuthHeaders() })
      .then((d) => setBatches(d.items || []))
      .catch(() => {});
  }, []);

  const load = useCallback(async (batchId: string) => {
    setLoading(true);
    try {
      const qs = batchId ? `&batch_id=${encodeURIComponent(batchId)}` : '';
      const d = await jsonFetch<{ items: ReceivableRow[] }>(`${functionsBase()}/finance-data?resource=receivables${qs}`, { headers: getAuthHeaders() });
      setRows(d.items || []);
    } catch (_) { setRows([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(selectedBatch); }, [selectedBatch, load]);

  const totalFee = rows.reduce((s, r) => s + (r.fee_due ?? 0), 0);
  const totalPaid = rows.reduce((s, r) => s + r.total_paid, 0);
  const totalBalance = rows.reduce((s, r) => s + (r.balance ?? 0), 0);

  return (
    <div className="space-y-4">
      {/* Header + batch filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--brand-text)]">Receivables</h2>
          <p className="text-xs text-[var(--brand-muted)]">Student balances and installment history</p>
        </div>
        {batches.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--brand-muted)]">Batch:</span>
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[var(--brand-surface)] px-2 py-1.5 text-sm text-[var(--brand-text)]"
            >
              <option value="">All batches</option>
              {batches.map((b) => <option key={b.batch_id} value={b.batch_id}>{b.batch_name || b.batch_id}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Fee Due', value: fmtFull(totalFee), color: 'text-[var(--brand-text)]' },
          { label: 'Total Collected', value: fmtFull(totalPaid), color: 'text-[var(--brand-success)]' },
          { label: 'Outstanding Balance', value: fmtFull(totalBalance), color: totalBalance > 0 ? 'text-[var(--brand-warning)]' : 'text-[var(--brand-success)]' },
        ].map((s) => (
          <div key={s.label} className="rounded-[var(--brand-radius)] border border-[var(--brand-border)] bg-[var(--brand-surface)] p-3 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--brand-dim)]">{s.label}</p>
            <p className={`mt-1 text-lg font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <Card noPadding>
        {loading ? (
          <div className="space-y-2 p-4">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-[var(--brand-surface-2)]" />)}
          </div>
        ) : rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-[var(--brand-muted)]">No receivables found.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Fee Due</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Installments</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.enrollment_id}>
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium text-[var(--brand-text)]" dir="auto">{r.trainee_name || r.trainee_id}</p>
                      <p className="text-xs text-[var(--brand-muted)]">{r.enrollment_id}</p>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-[var(--brand-muted)]">{r.batch_id}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_COLORS[r.payment_status?.toLowerCase()] ?? 'neutral'}>
                      {r.payment_status || '—'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm">{r.fee_due != null ? fmtFull(r.fee_due) : '—'}</TableCell>
                  <TableCell className="text-right text-sm text-[var(--brand-success)]">{fmtFull(r.total_paid)}</TableCell>
                  <TableCell className="text-right text-sm font-semibold">
                    <span className={(r.balance ?? 0) > 0 ? 'text-[var(--brand-warning)]' : 'text-[var(--brand-success)]'}>
                      {r.balance != null ? fmtFull(r.balance) : '—'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {r.installments.length === 0 ? (
                        <span className="text-xs text-[var(--brand-dim)]">—</span>
                      ) : r.installments.map((inst, i) => (
                        <span key={i} className="inline-block rounded bg-[var(--brand-surface-2)] px-1.5 py-0.5 text-[10px] text-[var(--brand-muted)]" title={`${inst.date?.slice(0,10)} · ${inst.method}`}>
                          {fmt(inst.amount)}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
