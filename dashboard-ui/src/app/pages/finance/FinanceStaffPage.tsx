import { useCallback, useEffect, useState } from 'react';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { Input } from '../../components/design-system/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/design-system/Table';
import { functionsBase, getAuthHeaders, jsonFetch } from '../../../lib/api';
import { fmtFull, parseBonusTotalFromNotes, type StaffRow } from './_shared';

const emptyForm = {
  full_name: '',
  job_title: '',
  email: '',
  phone: '',
  hire_date: '',
  monthly_salary_egp: '',
  status: 'active' as const,
  notes: '',
};

export function FinanceStaffPage() {
  const [items, setItems] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await jsonFetch<{ items: StaffRow[] }>(`${functionsBase()}/finance-data?resource=staff`, { headers: getAuthHeaders() });
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
    if (!form.full_name.trim()) {
      setMsg('Full name is required.');
      return;
    }
    try {
      const payload = {
        full_name: form.full_name.trim(),
        job_title: form.job_title.trim() || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        hire_date: form.hire_date || undefined,
        monthly_salary_egp: form.monthly_salary_egp === '' ? undefined : Number(form.monthly_salary_egp),
        status: form.status,
        notes: form.notes.trim() || undefined,
      };
      if (editingId) {
        await jsonFetch(`${functionsBase()}/finance-data?resource=staff`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({ id: editingId, ...payload }),
        });
        setMsg('Staff record updated.');
      } else {
        await jsonFetch(`${functionsBase()}/finance-data?resource=staff`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        });
        setMsg('Staff record saved.');
      }
      resetForm();
      void load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Save failed');
    }
  };

  const startEdit = (r: StaffRow) => {
    setEditingId(r.id);
    setForm({
      full_name: r.full_name || '',
      job_title: r.job_title || '',
      email: r.email || '',
      phone: r.phone || '',
      hire_date: r.hire_date ? String(r.hire_date).slice(0, 10) : '',
      monthly_salary_egp: r.monthly_salary_egp != null ? String(r.monthly_salary_egp) : '',
      status: r.status === 'inactive' ? 'inactive' : 'active',
      notes: r.notes || '',
    });
    setMsg('');
  };

  const del = async (id: string) => {
    if (!window.confirm('Delete this staff record?')) return;
    setMsg('');
    try {
      await jsonFetch(`${functionsBase()}/finance-data?resource=staff&id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (editingId === id) resetForm();
      void load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const payrollActive = items
    .filter((r) => r.status === 'active')
    .reduce((s, r) => s + Number(r.monthly_salary_egp || 0), 0);

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
              {editingId ? 'Edit staff' : 'Add staff'}
            </h3>
            <div className="space-y-3">
              <Input
                label="Full name"
                value={form.full_name}
                onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
                placeholder="Name"
              />
              <Input
                label="Job title"
                value={form.job_title}
                onChange={(e) => setForm((p) => ({ ...p, job_title: e.target.value }))}
                placeholder="Role"
              />
              <Input
                label="Email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              />
              <Input
                label="Phone"
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              />
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--brand-muted)]">Hire date</label>
                <input
                  type="date"
                  value={form.hire_date}
                  onChange={(e) => setForm((p) => ({ ...p, hire_date: e.target.value }))}
                  className="w-full rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-sm text-[var(--brand-text)]"
                />
              </div>
              <Input
                label="Monthly salary (EGP)"
                type="number"
                min="0"
                value={form.monthly_salary_egp}
                onChange={(e) => setForm((p) => ({ ...p, monthly_salary_egp: e.target.value }))}
                placeholder="Optional"
              />
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--brand-muted)]">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as 'active' | 'inactive' }))}
                  className="w-full rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-sm text-[var(--brand-text)]"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
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
                <Button type="button" size="sm" className="flex-1" onClick={() => void save()} disabled={!form.full_name.trim()}>
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
                <h3 className="text-sm font-semibold text-[var(--brand-text)]">Staff directory</h3>
                <p className="text-xs text-[var(--brand-muted)]">
                  {items.length} records · Active monthly payroll (est.): {fmtFull(payrollActive)}
                  <span className="text-[var(--brand-dim)]"> (excludes bonus-only rows)</span>
                </p>
              </div>
            </div>
            {loading ? (
              <div className="space-y-2 p-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 animate-pulse rounded bg-[var(--brand-surface-2)]" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <p className="py-10 text-center text-sm text-[var(--brand-muted)]">No staff records yet.</p>
            ) : (
              <div className="max-h-[520px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount (EGP)</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-sm font-medium text-[var(--brand-text)]">{r.full_name}</TableCell>
                        <TableCell className="text-xs text-[var(--brand-muted)]">{r.job_title ?? '—'}</TableCell>
                        <TableCell className="text-xs capitalize text-[var(--brand-muted)]">{r.status}</TableCell>
                        <TableCell className="text-right text-sm text-[var(--brand-text)]">
                          {r.monthly_salary_egp != null ? (
                            fmtFull(Number(r.monthly_salary_egp))
                          ) : (
                            (() => {
                              const bonusTotal = parseBonusTotalFromNotes(r.notes);
                              if (bonusTotal != null) {
                                return (
                                  <span className="inline-flex flex-col items-end gap-0">
                                    <span>{fmtFull(bonusTotal)}</span>
                                    <span className="text-[10px] font-normal text-[var(--brand-dim)]">recorded total</span>
                                  </span>
                                );
                              }
                              return '—';
                            })()
                          )}
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
