import { useEffect, useState } from 'react';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { Input } from '../../components/design-system/Input';
import { Badge } from '../../components/design-system/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/design-system/Table';
import { functionsBase, getAuthHeaders, jsonFetch } from '../../../lib/api';
import { fmtFull } from './_shared';

type InvoiceRow = {
  id: string; invoice_number: string; status: string;
  issue_date: string; due_date: string | null; total: number | null; currency: string;
  companies?: { name: string } | { name: string }[] | null;
};

const STATUS_COLORS: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  paid: 'success', sent: 'info' as never, draft: 'neutral', overdue: 'danger', void: 'neutral',
};

export function FinanceInvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const [invNum, setInvNum] = useState('');
  const [invTotal, setInvTotal] = useState('');
  const [invDue, setInvDue] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const d = await jsonFetch<{ items: InvoiceRow[] }>(`${functionsBase()}/finance-data?resource=invoices`, { headers: getAuthHeaders() });
      setInvoices(d.items || []);
    } catch (_) { setInvoices([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const create = async () => {
    setMsg('');
    if (!invNum.trim()) { setMsg('Invoice number is required.'); return; }
    try {
      await jsonFetch(`${functionsBase()}/finance-data?resource=invoices`, {
        method: 'POST', headers: getAuthHeaders(),
        body: JSON.stringify({
          invoice_number: invNum.trim(),
          total: invTotal ? Number(invTotal) : undefined,
          due_date: invDue || undefined,
          status: 'draft',
        }),
      });
      setMsg('Invoice created.');
      setInvNum(''); setInvTotal(''); setInvDue('');
      void load();
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Create failed'); }
  };

  const del = async (id: string) => {
    if (!window.confirm('Delete this invoice?')) return;
    try {
      await jsonFetch(`${functionsBase()}/finance-data?resource=invoices&id=${encodeURIComponent(id)}`, { method: 'DELETE', headers: getAuthHeaders() });
      void load();
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Delete failed'); }
  };

  return (
    <div className="space-y-5">
      {msg && (
        <p className={`rounded-lg border px-3 py-2 text-sm ${msg.includes('created') ? 'border-[var(--brand-success)]/30 bg-[var(--brand-success)]/10 text-[var(--brand-success)]' : 'border-[var(--brand-danger)]/30 bg-[var(--brand-danger)]/10 text-[var(--brand-danger)]'}`}>
          {msg}
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-5">
        {/* New invoice form */}
        <div className="lg:col-span-2">
          <Card>
            <h3 className="mb-4 text-sm font-semibold text-[var(--brand-text)]">New Invoice</h3>
            <div className="space-y-3">
              <Input label="Invoice number" value={invNum} onChange={(e) => setInvNum(e.target.value)} placeholder="e.g. INV-2026-001" />
              <Input label="Total amount (EGP)" type="number" min="0" value={invTotal} onChange={(e) => setInvTotal(e.target.value)} placeholder="0.00" />
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--brand-muted)]">Due date</label>
                <input type="date" value={invDue} onChange={(e) => setInvDue(e.target.value)}
                  className="w-full rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-sm text-[var(--brand-text)]" />
              </div>
              <Button type="button" size="sm" className="w-full" onClick={() => void create()} disabled={!invNum.trim()}>
                Create Invoice (Draft)
              </Button>
            </div>
          </Card>
        </div>

        {/* Invoice list */}
        <div className="lg:col-span-3">
          <Card noPadding>
            <div className="flex items-center justify-between border-b border-[var(--brand-border)] px-4 py-3">
              <div>
                <h3 className="text-sm font-semibold text-[var(--brand-text)]">Invoices</h3>
                <p className="text-xs text-[var(--brand-muted)]">{invoices.length} total</p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => void load()}>Refresh</Button>
            </div>
            {loading ? (
              <div className="space-y-2 p-4">
                {[1, 2, 3].map((i) => <div key={i} className="h-10 animate-pulse rounded bg-[var(--brand-surface-2)]" />)}
              </div>
            ) : invoices.length === 0 ? (
              <p className="py-10 text-center text-sm text-[var(--brand-muted)]">No invoices yet.</p>
            ) : (
              <div className="max-h-[480px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Issued</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((inv) => {
                      const co = Array.isArray(inv.companies) ? inv.companies[0] : inv.companies;
                      return (
                        <TableRow key={inv.id}>
                          <TableCell>
                            <p className="font-mono text-sm font-medium text-[var(--brand-text)]">{inv.invoice_number}</p>
                            {co?.name && <p className="text-xs text-[var(--brand-muted)]">{co.name}</p>}
                          </TableCell>
                          <TableCell className="text-xs text-[var(--brand-muted)]">{inv.issue_date?.slice(0, 10)}</TableCell>
                          <TableCell className="text-xs text-[var(--brand-muted)]">{inv.due_date?.slice(0, 10) ?? '—'}</TableCell>
                          <TableCell>
                            <Badge variant={STATUS_COLORS[inv.status?.toLowerCase()] ?? 'neutral'}>
                              {inv.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-sm font-semibold">
                            {inv.total != null ? fmtFull(inv.total) : '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button type="button" variant="danger" size="sm" onClick={() => void del(inv.id)}>Del</Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
