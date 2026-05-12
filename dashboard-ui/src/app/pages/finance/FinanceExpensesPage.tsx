import { useCallback, useEffect, useState } from 'react';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { Input } from '../../components/design-system/Input';
import { Badge } from '../../components/design-system/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/design-system/Table';
import { functionsBase, getAuthHeaders, jsonFetch } from '../../../lib/api';
import { fmtFull, type BatchRow, type ExpenseRow } from './_shared';
import { FieldSuggest } from './FieldSuggest';

export function FinanceExpensesPage() {
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const [form, setForm] = useState({
    date: '', amount: '', description: '', funding_source: '', recorded_by: '', batch_id: '', is_refund: false,
  });

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
    } catch (_) { setExpenses([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const save = async () => {
    setMsg('');
    if (!form.description.trim() || !form.amount) { setMsg('Description and amount are required.'); return; }
    try {
      await jsonFetch(`${functionsBase()}/finance-data?resource=expense`, {
        method: 'POST', headers: getAuthHeaders(),
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
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Save failed'); }
  };

  const del = async (id: string) => {
    if (!window.confirm('Delete this expense?')) return;
    setMsg('');
    try {
      await jsonFetch(`${functionsBase()}/finance-data?resource=expense&id=${encodeURIComponent(id)}`, { method: 'DELETE', headers: getAuthHeaders() });
      void load();
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Delete failed'); }
  };

  const totalExpenses = expenses.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="space-y-5">
      {msg && (
        <p className={`rounded-lg border px-3 py-2 text-sm ${msg.includes('saved') || msg.includes('Expense') && !msg.includes('failed') ? 'border-[var(--brand-success)]/30 bg-[var(--brand-success)]/10 text-[var(--brand-success)]' : 'border-[var(--brand-danger)]/30 bg-[var(--brand-danger)]/10 text-[var(--brand-danger)]'}`}>
          {msg}
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-5">
        {/* Add expense form */}
        <div className="lg:col-span-2">
          <Card>
            <h3 className="mb-4 text-sm font-semibold text-[var(--brand-text)]">Add New Expense</h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--brand-muted)]">Date</label>
                <input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                  className="w-full rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-sm text-[var(--brand-text)]" />
              </div>
              <Input label="Amount (EGP)" type="number" min="0" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} placeholder="0.00" />
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
                  <select value={form.batch_id} onChange={(e) => setForm((p) => ({ ...p, batch_id: e.target.value }))}
                    className="w-full rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-sm text-[var(--brand-text)]">
                    <option value="">Org-wide</option>
                    {batches.map((b) => <option key={b.batch_id} value={b.batch_id}>{b.batch_name || b.batch_id}</option>)}
                  </select>
                </div>
              )}
              <label className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" checked={form.is_refund} onChange={(e) => setForm((p) => ({ ...p, is_refund: e.target.checked }))} className="rounded" />
                <span className="text-sm text-[var(--brand-muted)]">This is a refund</span>
              </label>
              <Button type="button" size="sm" className="w-full" onClick={() => void save()} disabled={!form.description.trim() || !form.amount}>
                Save Expense
              </Button>
            </div>
          </Card>
        </div>

        {/* Expenses list */}
        <div className="lg:col-span-3">
          <Card noPadding>
            <div className="flex items-center justify-between border-b border-[var(--brand-border)] px-4 py-3">
              <div>
                <h3 className="text-sm font-semibold text-[var(--brand-text)]">Expense Register</h3>
                <p className="text-xs text-[var(--brand-muted)]">{expenses.length} entries · Total: {fmtFull(totalExpenses)}</p>
              </div>
            </div>
            {loading ? (
              <div className="space-y-2 p-4">
                {[1, 2, 3].map((i) => <div key={i} className="h-10 animate-pulse rounded bg-[var(--brand-surface-2)]" />)}
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
                    {expenses.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs text-[var(--brand-muted)]">{r.date?.slice(0, 10) ?? '—'}</TableCell>
                        <TableCell>
                          <p className="text-sm text-[var(--brand-text)]" dir="auto">{r.description}</p>
                          {r.is_refund && <Badge variant="info" className="mt-0.5">Refund</Badge>}
                        </TableCell>
                        <TableCell className="text-xs text-[var(--brand-muted)]">{r.funding_source ?? '—'}</TableCell>
                        <TableCell className="text-right text-sm font-medium text-[var(--brand-danger)]">{fmtFull(r.amount)}</TableCell>
                        <TableCell className="text-right">
                          <Button type="button" variant="danger" size="sm" onClick={() => void del(r.id)}>Del</Button>
                        </TableCell>
                      </TableRow>
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
