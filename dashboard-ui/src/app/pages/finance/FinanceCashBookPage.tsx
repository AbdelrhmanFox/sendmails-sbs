import { useCallback, useEffect, useState } from 'react';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/design-system/Table';
import { functionsBase, getAuthHeaders, jsonFetch } from '../../../lib/api';
import { expenseDatePending, fmtFull, type BatchRow, type ExpenseRow, type IncomeRow } from './_shared';

export function FinanceCashBookPage() {
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [income, setIncome] = useState<IncomeRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    jsonFetch<{ items: BatchRow[] }>(`${functionsBase()}/finance-data?resource=my-batches`, { headers: getAuthHeaders() })
      .then((d) => setBatches(d.items || []))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ resource: 'cashbook' });
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);
      if (selectedBatch) params.set('batch_id', selectedBatch);
      const d = await jsonFetch<{ income: IncomeRow[]; expenses: ExpenseRow[] }>(
        `${functionsBase()}/finance-data?${params.toString()}`, { headers: getAuthHeaders() },
      );
      setIncome(d.income || []);
      setExpenses(d.expenses || []);
    } catch (_) { setIncome([]); setExpenses([]); }
    finally { setLoading(false); }
  }, [fromDate, toDate, selectedBatch]);

  useEffect(() => { void load(); }, [load]);

  const totalIncome = income.reduce((s, r) => s + r.amount, 0);
  const totalExpenses = expenses.reduce((s, r) => s + r.amount, 0);
  const net = totalIncome - totalExpenses;

  const skeleton = (
    <div className="space-y-2 p-3">
      {[1, 2, 3].map((i) => <div key={i} className="h-8 animate-pulse rounded bg-[var(--brand-surface-2)]" />)}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--brand-muted)]">From:</span>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
            className="rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[var(--brand-surface)] px-2 py-1.5 text-sm text-[var(--brand-text)]" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--brand-muted)]">To:</span>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
            className="rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[var(--brand-surface)] px-2 py-1.5 text-sm text-[var(--brand-text)]" />
        </div>
        {batches.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--brand-muted)]">Batch:</span>
            <select value={selectedBatch} onChange={(e) => setSelectedBatch(e.target.value)}
              className="rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[var(--brand-surface)] px-2 py-1.5 text-sm text-[var(--brand-text)]">
              <option value="">All</option>
              {batches.map((b) => <option key={b.batch_id} value={b.batch_id}>{b.batch_name || b.batch_id}</option>)}
            </select>
          </div>
        )}
        <Button type="button" size="sm" variant="secondary" onClick={() => void load()}>Refresh</Button>
      </div>

      {/* Net summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Income', value: fmtFull(totalIncome), color: 'text-[var(--brand-success)]' },
          { label: 'Total Expenses', value: fmtFull(totalExpenses), color: 'text-[var(--brand-danger)]' },
          { label: 'Net Balance', value: fmtFull(net), color: net >= 0 ? 'text-[var(--brand-success)]' : 'text-[var(--brand-danger)]' },
        ].map((s) => (
          <div key={s.label} className="rounded-[var(--brand-radius)] border border-[var(--brand-border)] bg-[var(--brand-surface)] p-3 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--brand-dim)]">{s.label}</p>
            <p className={`mt-1 text-lg font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Two columns: income / expenses */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Income */}
        <Card noPadding>
          <div className="flex items-center justify-between border-b border-[var(--brand-border)] px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold text-[var(--brand-text)]">Income</h3>
              <p className="text-xs text-[var(--brand-muted)]">{income.length} entries · {fmtFull(totalIncome)}</p>
            </div>
            <span className="rounded-full bg-[var(--brand-success)]/10 px-2 py-0.5 text-[11px] font-semibold text-[var(--brand-success)]">IN</span>
          </div>
          {loading ? skeleton : income.length === 0 ? (
            <p className="py-6 text-center text-sm text-[var(--brand-muted)]">No income entries.</p>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {income.map((r) => (
                    <TableRow key={r.payment_id}>
                      <TableCell className="text-xs text-[var(--brand-dim)]">{r.serial}</TableCell>
                      <TableCell className="text-xs text-[var(--brand-muted)]">{r.date?.slice(0, 10) ?? '—'}</TableCell>
                      <TableCell className="text-sm text-[var(--brand-text)]" dir="auto">{r.description}</TableCell>
                      <TableCell className="text-right text-sm font-medium text-[var(--brand-success)]">{fmtFull(r.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>

        {/* Expenses */}
        <Card noPadding>
          <div className="flex items-center justify-between border-b border-[var(--brand-border)] px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold text-[var(--brand-text)]">Expenses</h3>
              <p className="text-xs text-[var(--brand-muted)]">{expenses.length} entries · {fmtFull(totalExpenses)}</p>
            </div>
            <span className="rounded-full bg-[var(--brand-danger)]/10 px-2 py-0.5 text-[11px] font-semibold text-[var(--brand-danger)]">OUT</span>
          </div>
          {loading ? skeleton : expenses.length === 0 ? (
            <p className="py-6 text-center text-sm text-[var(--brand-muted)]">No expenses.</p>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs text-[var(--brand-dim)]">{r.serial}</TableCell>
                      <TableCell className="text-xs text-[var(--brand-muted)]">
                        {expenseDatePending(r) ? <span className="font-medium text-[var(--brand-warning)]">Pending</span> : (r.date?.slice(0, 10) ?? '—')}
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-[var(--brand-text)]" dir="auto">{r.description}</p>
                        {r.funding_source && <p className="text-xs text-[var(--brand-muted)]">{r.funding_source}</p>}
                        {expenseDatePending(r) && (
                          <p className="text-[10px] text-[var(--brand-warning)]">Incomplete — set date in Expenses</p>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium text-[var(--brand-danger)]">{fmtFull(r.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
