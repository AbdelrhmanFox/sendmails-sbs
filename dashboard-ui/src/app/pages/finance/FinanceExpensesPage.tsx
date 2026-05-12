import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { Input } from '../../components/design-system/Input';
import { Badge } from '../../components/design-system/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/design-system/Table';
import { functionsBase, getAuthHeaders, jsonFetch } from '../../../lib/api';
import { expenseDatePending, fmtFull, type BatchRow, type ExpenseRow } from './_shared';
import { FieldSuggest } from './FieldSuggest';

export function FinanceExpensesPage() {
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const [form, setForm] = useState({
    date: '', amount: '', description: '', funding_source: '', recorded_by: '', batch_id: '', is_refund: false,
  });

  const [fixingId, setFixingId] = useState<string | null>(null);
  const [fixDate, setFixDate] = useState('');
  const [fixFunding, setFixFunding] = useState('');
  const [fixRecordedBy, setFixRecordedBy] = useState('');

  useEffect(() => {
    jsonFetch<{ items: BatchRow[] }>(`${functionsBase()}/finance-data?resource=my-batches`, { headers: getAuthHeaders() })
      .then((d) => setBatches(d.items || []))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await jsonFetch<{ expenses: ExpenseRow[] }>(`${functionsBase()}/finance-data?resource=cashbook`, { headers: getAuthHeaders() });
      setExpenses(d.expenses || []);
    } catch (_) {
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sortedExpenses = useMemo(
    () =>
      [...expenses].sort((a, b) => {
        const pa = expenseDatePending(a);
        const pb = expenseDatePending(b);
        if (pa !== pb) return pa ? -1 : 1;
        return String(a.date || '').localeCompare(String(b.date || ''));
      }),
    [expenses],
  );

  const incompleteCount = useMemo(() => expenses.filter((e) => expenseDatePending(e)).length, [expenses]);

  const save = async () => {
    setMsg('');
    if (!form.description.trim() || !form.amount) {
      setMsg('Description and amount are required.');
      return;
    }
    try {
      await jsonFetch(`${functionsBase()}/finance-data?resource=expense`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          spent_at: form.date || new Date().toISOString().slice(0, 10),
          amount: Number(form.amount),
          description: form.description.trim(),
          funding_source: form.funding_source.trim() || undefined,
          recorded_by: form.recorded_by.trim() || undefined,
          batch_id: form.batch_id || undefined,
          is_refund: form.is_refund,
        }),
      });
      setMsg('Expense saved.');
      setForm({ date: '', amount: '', description: '', funding_source: '', recorded_by: '', batch_id: '', is_refund: false });
      void load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Save failed');
    }
  };

  const del = async (id: string) => {
    if (!window.confirm('Delete this expense?')) return;
    setMsg('');
    try {
      await jsonFetch(`${functionsBase()}/finance-data?resource=expense&id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (fixingId === id) {
        setFixingId(null);
        setFixDate('');
        setFixFunding('');
        setFixRecordedBy('');
      }
      void load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const startFix = (r: ExpenseRow) => {
    setFixingId(r.id);
    setFixDate('');
    setFixFunding(r.funding_source || '');
    setFixRecordedBy(r.recorded_by || '');
    setMsg('');
  };

  const cancelFix = () => {
    setFixingId(null);
    setFixDate('');
    setFixFunding('');
    setFixRecordedBy('');
  };

  const saveFix = async () => {
    if (!fixingId || !fixDate.trim()) {
      setMsg('Choose the real expense date from the sheet.');
      return;
    }
    setMsg('');
    try {
      await jsonFetch(`${functionsBase()}/finance-data?resource=expense`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          id: fixingId,
          spent_at: fixDate.trim(),
          funding_source: fixFunding.trim() || undefined,
          recorded_by: fixRecordedBy.trim() || undefined,
        }),
      });
      setMsg('Incomplete expense updated.');
      cancelFix();
      void load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Update failed');
    }
  };

  const totalExpenses = expenses.reduce((s, r) => s + r.amount, 0);
  const msgOk = (msg.includes('saved') || msg.includes('updated')) && !msg.toLowerCase().includes('fail');

  return (
    <div className="space-y-5">
      {msg && (
        <p
          className={`rounded-lg border px-3 py-2 text-sm ${
            msgOk
              ? 'border-[var(--brand-success)]/30 bg-[var(--brand-success)]/10 text-[var(--brand-success)]'
              : 'border-[var(--brand-danger)]/30 bg-[var(--brand-danger)]/10 text-[var(--brand-danger)]'
          }`}
        >
          {msg}
        </p>
      )}

      {incompleteCount > 0 && (
        <div className="rounded-lg border border-[var(--brand-warning)]/40 bg-[var(--brand-warning)]/8 px-4 py-3 text-sm text-[var(--brand-text)]">
          <strong className="text-[var(--brand-warning)]">{incompleteCount} incomplete expense(s)</strong>
          <span className="text-[var(--brand-muted)]">
            {' '}
            — imported from Excel without a date in the sheet. Amount is correct; set the real date (and optional fields) using
            <strong> Fix</strong> so reports and the cash book stay accurate.
          </span>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Card>
            <h3 className="mb-4 text-sm font-semibold text-[var(--brand-text)]">Add New Expense</h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--brand-muted)]">Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                  className="w-full rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-sm text-[var(--brand-text)]"
                />
              </div>
              <Input
                label="Amount (EGP)"
                type="number"
                min="0"
                value={form.amount}
                onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                placeholder="0.00"
              />
              <FieldSuggest
                entity="expense-description"
                label="Description"
                value={form.description}
                onChange={(v) => setForm((p) => ({ ...p, description: v }))}
                placeholder="e.g. Office supplies / مستلزمات مكتب"
                multiline
                rows={2}
              />
              <FieldSuggest
                entity="expense-funding"
                label="Funding source"
                value={form.funding_source}
                onChange={(v) => setForm((p) => ({ ...p, funding_source: v }))}
                placeholder="e.g. Marwa, M+I, Suez…"
                optional
              />
              <FieldSuggest
                entity="expense-by"
                label="Recorded by"
                value={form.recorded_by}
                onChange={(v) => setForm((p) => ({ ...p, recorded_by: v }))}
                optional
              />
              {batches.length > 0 && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--brand-muted)]">Batch (optional)</label>
                  <select
                    value={form.batch_id}
                    onChange={(e) => setForm((p) => ({ ...p, batch_id: e.target.value }))}
                    className="w-full rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-sm text-[var(--brand-text)]"
                  >
                    <option value="">Org-wide</option>
                    {batches.map((b) => (
                      <option key={b.batch_id} value={b.batch_id}>
                        {b.batch_name || b.batch_id}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.is_refund}
                  onChange={(e) => setForm((p) => ({ ...p, is_refund: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm text-[var(--brand-muted)]">This is a refund</span>
              </label>
              <Button type="button" size="sm" className="w-full" onClick={() => void save()} disabled={!form.description.trim() || !form.amount}>
                Save Expense
              </Button>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <Card noPadding>
            <div className="flex items-center justify-between border-b border-[var(--brand-border)] px-4 py-3">
              <div>
                <h3 className="text-sm font-semibold text-[var(--brand-text)]">Expense Register</h3>
                <p className="text-xs text-[var(--brand-muted)]">
                  {expenses.length} entries · Total: {fmtFull(totalExpenses)}
                  {incompleteCount > 0 ? (
                    <span className="text-[var(--brand-warning)]"> · {incompleteCount} need date</span>
                  ) : null}
                </p>
              </div>
            </div>
            {loading ? (
              <div className="space-y-2 p-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 animate-pulse rounded bg-[var(--brand-surface-2)]" />
                ))}
              </div>
            ) : expenses.length === 0 ? (
              <p className="py-10 text-center text-sm text-[var(--brand-muted)]">No expenses yet.</p>
            ) : (
              <div className="max-h-[520px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedExpenses.map((r) => (
                      <Fragment key={r.id}>
                        <TableRow key={r.id} className={expenseDatePending(r) ? 'bg-[var(--brand-warning)]/5' : undefined}>
                          <TableCell className="text-xs text-[var(--brand-muted)]">
                            {expenseDatePending(r) ? (
                              <span className="font-medium text-[var(--brand-warning)]">Pending</span>
                            ) : (
                              (r.date?.slice(0, 10) ?? '—')
                            )}
                          </TableCell>
                          <TableCell>
                            <p className="text-sm text-[var(--brand-text)]" dir="auto">
                              {r.description}
                            </p>
                            {expenseDatePending(r) && (
                              <p className="mt-0.5 text-[11px] text-[var(--brand-warning)]">
                                Incomplete import
                                {r.import_sheet_row != null ? ` · Excel row ${r.import_sheet_row}` : ''}
                              </p>
                            )}
                            {r.is_refund && (
                              <Badge variant="info" className="mt-0.5">
                                Refund
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-[var(--brand-muted)]">{r.funding_source ?? '—'}</TableCell>
                          <TableCell className="text-right text-sm font-medium text-[var(--brand-danger)]">{fmtFull(r.amount)}</TableCell>
                          <TableCell className="text-right space-x-1">
                            {expenseDatePending(r) && (
                              <Button type="button" variant="secondary" size="sm" onClick={() => startFix(r)}>
                                Fix
                              </Button>
                            )}
                            <Button type="button" variant="danger" size="sm" onClick={() => void del(r.id)}>
                              Del
                            </Button>
                          </TableCell>
                        </TableRow>
                        {fixingId === r.id && (
                          <TableRow key={`${r.id}-fix`} className="bg-[var(--brand-surface-2)]">
                            <TableCell colSpan={5} className="p-4">
                              <p className="mb-2 text-xs font-medium text-[var(--brand-text)]">Complete this line</p>
                              <div className="flex flex-wrap items-end gap-3">
                                <div>
                                  <label className="mb-1 block text-[10px] font-medium text-[var(--brand-muted)]">Real expense date</label>
                                  <input
                                    type="date"
                                    value={fixDate}
                                    onChange={(e) => setFixDate(e.target.value)}
                                    className="rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[var(--brand-surface)] px-2 py-1.5 text-sm"
                                  />
                                </div>
                                <div className="min-w-[140px] flex-1">
                                  <FieldSuggest
                                    entity="expense-funding"
                                    label="Funding source"
                                    value={fixFunding}
                                    onChange={setFixFunding}
                                    optional
                                  />
                                </div>
                                <div className="min-w-[140px] flex-1">
                                  <FieldSuggest entity="expense-by" label="Recorded by" value={fixRecordedBy} onChange={setFixRecordedBy} optional />
                                </div>
                                <Button type="button" size="sm" onClick={() => void saveFix()}>
                                  Save
                                </Button>
                                <Button type="button" size="sm" variant="secondary" onClick={cancelFix}>
                                  Cancel
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
