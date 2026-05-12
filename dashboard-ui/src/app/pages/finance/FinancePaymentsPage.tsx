import { useEffect, useState } from 'react';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { Input } from '../../components/design-system/Input';
import { Badge } from '../../components/design-system/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/design-system/Table';
import { functionsBase, getAuthHeaders, jsonFetch } from '../../../lib/api';
import { fmtFull } from './_shared';

type PaymentRow = {
  id: string; amount: number; currency: string; method: string | null;
  received_at: string; reference: string | null; status: string; notes: string | null;
  created_by: string; enrollment_uuid: string;
  enrollments?: { enrollment_id: string; trainee_id: string; batch_id: string } | null;
};

const METHODS = ['cash', 'bank transfer', 'card', 'cheque', 'installment', 'refund', 'other'];

export function FinancePaymentsPage() {
  const [ledger, setLedger] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const [enrollmentId, setEnrollmentId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [receivedAt, setReceivedAt] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  const loadLedger = async () => {
    setLoading(true);
    try {
      const d = await jsonFetch<{ items: PaymentRow[] }>(`${functionsBase()}/finance-data?resource=ledger&page=1&pageSize=30`, { headers: getAuthHeaders() });
      setLedger(d.items || []);
    } catch (_) { setLedger([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { void loadLedger(); }, []);

  const submit = async () => {
    setMsg('');
    if (!enrollmentId.trim() || !amount) { setMsg('Enrollment ID and amount are required.'); return; }
    try {
      await jsonFetch(`${functionsBase()}/finance-data?resource=payment`, {
        method: 'POST', headers: getAuthHeaders(),
        body: JSON.stringify({
          enrollment_id: enrollmentId.trim(),
          amount: Number(amount),
          method,
          received_at: receivedAt || undefined,
          reference: reference.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      setMsg('Payment recorded successfully.');
      setEnrollmentId(''); setAmount(''); setReference(''); setNotes(''); setReceivedAt('');
      void loadLedger();
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Payment failed'); }
  };

  return (
    <div className="space-y-5">
      {msg && (
        <p className={`rounded-lg border px-3 py-2 text-sm ${msg.includes('successfully') ? 'border-[var(--brand-success)]/30 bg-[var(--brand-success)]/10 text-[var(--brand-success)]' : 'border-[var(--brand-danger)]/30 bg-[var(--brand-danger)]/10 text-[var(--brand-danger)]'}`}>
          {msg}
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-5">
        {/* Record payment form */}
        <div className="lg:col-span-2">
          <Card>
            <h3 className="mb-4 text-sm font-semibold text-[var(--brand-text)]">Record Payment</h3>
            <div className="space-y-3">
              <Input label="Enrollment ID" value={enrollmentId} onChange={(e) => setEnrollmentId(e.target.value)} placeholder="e.g. ENR-001" />
              <Input label="Amount (EGP)" type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--brand-muted)]">Payment method</label>
                <select value={method} onChange={(e) => setMethod(e.target.value)}
                  className="w-full rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-sm text-[var(--brand-text)]">
                  {METHODS.map((m) => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--brand-muted)]">Date received</label>
                <input type="date" value={receivedAt} onChange={(e) => setReceivedAt(e.target.value)}
                  className="w-full rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-sm text-[var(--brand-text)]" />
              </div>
              <Input label="Reference / Cheque #" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Optional" />
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--brand-muted)]">Notes</label>
                <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} dir="auto"
                  className="w-full rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-sm text-[var(--brand-text)] resize-none placeholder:text-[var(--brand-dim)]"
                  placeholder="Optional note…" />
              </div>
              <Button type="button" size="sm" className="w-full" onClick={() => void submit()} disabled={!enrollmentId.trim() || !amount}>
                Record Payment
              </Button>
            </div>
          </Card>
        </div>

        {/* Recent payments */}
        <div className="lg:col-span-3">
          <Card noPadding>
            <div className="flex items-center justify-between border-b border-[var(--brand-border)] px-4 py-3">
              <div>
                <h3 className="text-sm font-semibold text-[var(--brand-text)]">Recent Payments</h3>
                <p className="text-xs text-[var(--brand-muted)]">Last 30 entries</p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => void loadLedger()}>Refresh</Button>
            </div>
            {loading ? (
              <div className="space-y-2 p-4">
                {[1, 2, 3].map((i) => <div key={i} className="h-10 animate-pulse rounded bg-[var(--brand-surface-2)]" />)}
              </div>
            ) : ledger.length === 0 ? (
              <p className="py-10 text-center text-sm text-[var(--brand-muted)]">No payments yet.</p>
            ) : (
              <div className="max-h-[480px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Enrollment</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ledger.map((r) => {
                      const en = Array.isArray(r.enrollments) ? r.enrollments[0] : r.enrollments;
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="text-xs text-[var(--brand-muted)]">{r.received_at?.slice(0, 10) ?? '—'}</TableCell>
                          <TableCell>
                            <p className="text-sm font-medium text-[var(--brand-text)]">{en?.enrollment_id ?? '—'}</p>
                            <p className="text-xs text-[var(--brand-muted)]">{en?.trainee_id ?? ''}</p>
                          </TableCell>
                          <TableCell className="text-xs capitalize text-[var(--brand-muted)]">{r.method ?? '—'}</TableCell>
                          <TableCell className="text-right text-sm font-medium">
                            <span className={r.amount < 0 ? 'text-[var(--brand-danger)]' : 'text-[var(--brand-success)]'}>
                              {fmtFull(r.amount)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={r.status === 'recorded' ? 'success' : r.status === 'pending' ? 'warning' : 'neutral'}>
                              {r.status}
                            </Badge>
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
