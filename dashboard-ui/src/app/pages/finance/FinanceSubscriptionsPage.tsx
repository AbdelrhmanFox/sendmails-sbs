import { useCallback, useEffect, useState } from 'react';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { Input } from '../../components/design-system/Input';
import { Badge } from '../../components/design-system/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/design-system/Table';
import { functionsBase, getAuthHeaders, jsonFetch } from '../../../lib/api';
import { fmtFull, type RecurringSubscriptionRow } from './_shared';

function monthlyEquivLabel(amount: number, cycle: string) {
  const a = Number(amount || 0);
  if (!Number.isFinite(a)) return '—';
  let m = a;
  if (cycle === 'yearly') m = a / 12;
  else if (cycle === 'quarterly') m = a / 3;
  return fmtFull(m);
}

const emptyForm = {
  name: '',
  direction: 'payable' as 'payable' | 'receivable',
  amount_egp: '',
  cycle: 'monthly' as 'monthly' | 'quarterly' | 'yearly',
  start_date: '',
  next_billing_date: '',
  end_date: '',
  status: 'active' as 'active' | 'paused' | 'cancelled',
  notes: '',
};

export function FinanceSubscriptionsPage() {
  const [items, setItems] = useState<RecurringSubscriptionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await jsonFetch<{ items: RecurringSubscriptionRow[] }>(
        `${functionsBase()}/finance-data?resource=subscriptions`,
        { headers: getAuthHeaders() },
      );
      setItems(d.items || []);
    } catch (_) {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const save = async () => {
    setMsg('');
    if (!form.name.trim()) {
      setMsg('Name is required.');
      return;
    }
    if (!form.start_date && !editingId) {
      setMsg('Start date is required for new subscriptions.');
      return;
    }
    const amount = Number(form.amount_egp);
    if (Number.isNaN(amount) || amount <= 0) {
      setMsg('Enter a positive amount.');
      return;
    }
    try {
      if (editingId) {
        const payload: Record<string, unknown> = {
          id: editingId,
          name: form.name.trim(),
          direction: form.direction,
          cycle: form.cycle,
          status: form.status,
          amount_egp: amount,
          notes: form.notes.trim() || undefined,
        };
        if (form.start_date) payload.start_date = form.start_date;
        if (form.next_billing_date) payload.next_billing_date = form.next_billing_date;
        if (form.end_date) payload.end_date = form.end_date;
        else payload.end_date = null;
        await jsonFetch(`${functionsBase()}/finance-data?resource=subscriptions`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        });
        setMsg('Subscription updated.');
      } else {
        await jsonFetch(`${functionsBase()}/finance-data?resource=subscriptions`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            name: form.name.trim(),
            direction: form.direction,
            amount_egp: amount,
            cycle: form.cycle,
            start_date: form.start_date,
            next_billing_date: form.next_billing_date || undefined,
            end_date: form.end_date || undefined,
            status: form.status,
            notes: form.notes.trim() || undefined,
          }),
        });
        setMsg('Subscription saved.');
      }
      resetForm();
      void load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Save failed');
    }
  };

  const startEdit = (r: RecurringSubscriptionRow) => {
    setEditingId(r.id);
    setForm({
      name: r.name || '',
      direction: r.direction === 'receivable' ? 'receivable' : 'payable',
      amount_egp: String(r.amount_egp ?? ''),
      cycle: (r.cycle as typeof form.cycle) || 'monthly',
      start_date: r.start_date ? String(r.start_date).slice(0, 10) : '',
      next_billing_date: r.next_billing_date ? String(r.next_billing_date).slice(0, 10) : '',
      end_date: r.end_date ? String(r.end_date).slice(0, 10) : '',
      status: (r.status as typeof form.status) || 'active',
      notes: r.notes || '',
    });
    setMsg('');
  };

  const del = async (id: string) => {
    if (!window.confirm('Delete this subscription?')) return;
    setMsg('');
    try {
      await jsonFetch(`${functionsBase()}/finance-data?resource=subscriptions&id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (editingId === id) resetForm();
      void load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  return (
    <div className="space-y-5">
      {msg && (
        <p
          className={`rounded-lg border px-3 py-2 text-sm ${
            msg.includes('saved') || msg.includes('updated')
              ? 'border-[var(--brand-success)]/30 bg-[var(--brand-success)]/10 text-[var(--brand-success)]'
              : 'border-[var(--brand-danger)]/30 bg-[var(--brand-danger)]/10 text-[var(--brand-danger)]'
          }`}
        >
          {msg}
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Card>
            <h3 className="mb-4 text-sm font-semibold text-[var(--brand-text)]">
              {editingId ? 'Edit subscription' : 'Add recurring subscription'}
            </h3>
            <p className="mb-3 text-xs text-[var(--brand-muted)]">
              Payable = money out (e.g. SaaS). Receivable = money in. Amount is per billing cycle; dashboard uses a monthly
              equivalent for analytics.
            </p>
            <div className="space-y-3">
              <Input label="Name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Zoom Pro" />
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--brand-muted)]">Direction</label>
                <select
                  value={form.direction}
                  onChange={(e) => setForm((p) => ({ ...p, direction: e.target.value as 'payable' | 'receivable' }))}
                  className="w-full rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-sm text-[var(--brand-text)]"
                >
                  <option value="payable">Payable (expense)</option>
                  <option value="receivable">Receivable (income)</option>
                </select>
              </div>
              <Input
                label="Amount per cycle (EGP)"
                type="number"
                min="0"
                step="0.01"
                value={form.amount_egp}
                onChange={(e) => setForm((p) => ({ ...p, amount_egp: e.target.value }))}
                placeholder="0.00"
              />
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--brand-muted)]">Billing cycle</label>
                <select
                  value={form.cycle}
                  onChange={(e) => setForm((p) => ({ ...p, cycle: e.target.value as typeof form.cycle }))}
                  className="w-full rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-sm text-[var(--brand-text)]"
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--brand-muted)]">Start date</label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))}
                  className="w-full rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-sm text-[var(--brand-text)]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--brand-muted)]">Next billing (optional)</label>
                <input
                  type="date"
                  value={form.next_billing_date}
                  onChange={(e) => setForm((p) => ({ ...p, next_billing_date: e.target.value }))}
                  className="w-full rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-sm text-[var(--brand-text)]"
                />
                <p className="mt-0.5 text-[10px] text-[var(--brand-dim)]">Leave empty to auto-roll from start date.</p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--brand-muted)]">End date (optional)</label>
                <input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))}
                  className="w-full rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-sm text-[var(--brand-text)]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--brand-muted)]">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as typeof form.status }))}
                  className="w-full rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-sm text-[var(--brand-text)]"
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--brand-muted)]">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  className="w-full rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-sm text-[var(--brand-text)]"
                  placeholder="Optional"
                />
              </div>
              <div className="flex gap-2">
                <Button type="button" size="sm" className="flex-1" onClick={() => void save()} disabled={!form.name.trim()}>
                  {editingId ? 'Update' : 'Save'}
                </Button>
                {editingId && (
                  <Button type="button" variant="secondary" size="sm" onClick={resetForm}>
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <Card noPadding>
            <div className="flex items-center justify-between border-b border-[var(--brand-border)] px-4 py-3">
              <div>
                <h3 className="text-sm font-semibold text-[var(--brand-text)]">Recurring subscriptions</h3>
                <p className="text-xs text-[var(--brand-muted)]">{items.length} records</p>
              </div>
            </div>
            {loading ? (
              <div className="space-y-2 p-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 animate-pulse rounded bg-[var(--brand-surface-2)]" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <p className="py-10 text-center text-sm text-[var(--brand-muted)]">No subscriptions yet.</p>
            ) : (
              <div className="max-h-[520px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Cycle</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Per cycle</TableHead>
                      <TableHead className="text-right">≈ / month</TableHead>
                      <TableHead>Next</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <p className="text-sm font-medium text-[var(--brand-text)]">{r.name}</p>
                          <Badge variant={r.direction === 'receivable' ? 'success' : 'danger'} className="mt-0.5 capitalize">
                            {r.direction}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs capitalize text-[var(--brand-muted)]">{r.cycle}</TableCell>
                        <TableCell className="text-xs capitalize text-[var(--brand-muted)]">{r.status}</TableCell>
                        <TableCell className="text-right text-sm text-[var(--brand-text)]">{fmtFull(Number(r.amount_egp || 0))}</TableCell>
                        <TableCell className="text-right text-xs text-[var(--brand-muted)]">
                          {monthlyEquivLabel(Number(r.amount_egp || 0), String(r.cycle))}
                        </TableCell>
                        <TableCell className="text-xs text-[var(--brand-muted)]">
                          {r.next_billing_date ? String(r.next_billing_date).slice(0, 10) : '—'}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button type="button" variant="secondary" size="sm" onClick={() => startEdit(r)}>
                            Edit
                          </Button>
                          <Button type="button" variant="danger" size="sm" onClick={() => void del(r.id)}>
                            Del
                          </Button>
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
