import { useEffect, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card } from '../components/design-system/Card';
import { Button } from '../components/design-system/Button';
import { Input } from '../components/design-system/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/design-system/Table';
import { functionsBase, getAuthHeaders, jsonFetch } from '../../lib/api';

type Kpis = { mtd_revenue: number; outstanding_invoices: number; payment_count: number };
type RevChart = { currency: string; labels: string[]; values: number[] };

const TABS = ['Overview', 'Payments', 'Invoices', 'Ledger'] as const;
type Tab = typeof TABS[number];

function fmt(n: number) {
  if (!Number.isFinite(n)) return '—';
  if (n >= 1_000_000) return `EGP ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `EGP ${Math.round(n / 1000)}K`;
  return `EGP ${Math.round(n)}`;
}

export function FinancePage() {
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [chart, setChart] = useState<RevChart | null>(null);
  const [invoices, setInvoices] = useState<Record<string, unknown>[]>([]);
  const [ledger, setLedger] = useState<Record<string, unknown>[]>([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [opMsg, setOpMsg] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('Overview');

  const [paymentEnrollment, setPaymentEnrollment] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceTotal, setInvoiceTotal] = useState('');

  useEffect(() => {
    let cancelled = false;
    const headers = getAuthHeaders();
    (async () => {
      setLoading(true); setErr('');
      try {
        const [k, c, inv] = await Promise.all([
          jsonFetch<Kpis>(`${functionsBase()}/finance-data?resource=kpis`, { headers }),
          jsonFetch<RevChart>(`${functionsBase()}/finance-data?resource=chart-revenue-trend&months=6`, { headers }),
          jsonFetch<{ items: Record<string, unknown>[] }>(`${functionsBase()}/finance-data?resource=invoices`, { headers }),
        ]);
        if (!cancelled) { setKpis(k); setChart(c); setInvoices(inv.items || []); }
        const led = await jsonFetch<{ items: Record<string, unknown>[] }>(`${functionsBase()}/finance-data?resource=ledger&page=1&pageSize=25`, { headers });
        if (!cancelled) setLedger(led.items || []);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'Could not load finance data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const submitPayment = async () => {
    setOpMsg('');
    try {
      await jsonFetch(`${functionsBase()}/finance-data?resource=payment`, {
        method: 'POST', headers: getAuthHeaders(),
        body: JSON.stringify({ enrollment_id: paymentEnrollment.trim(), amount: Number(paymentAmount || 0), method: paymentMethod }),
      });
      setOpMsg('Payment recorded.'); setPaymentAmount(''); setPaymentEnrollment('');
    } catch (e) { setOpMsg(e instanceof Error ? e.message : 'Payment failed'); }
  };

  const createInvoice = async () => {
    setOpMsg('');
    try {
      await jsonFetch(`${functionsBase()}/finance-data?resource=invoices`, {
        method: 'POST', headers: getAuthHeaders(),
        body: JSON.stringify({ invoice_number: invoiceNumber.trim(), total: Number(invoiceTotal || 0), status: 'draft' }),
      });
      setOpMsg('Invoice created.'); setInvoiceNumber(''); setInvoiceTotal('');
    } catch (e) { setOpMsg(e instanceof Error ? e.message : 'Invoice create failed'); }
  };

  const series = chart?.labels?.map((label, i) => ({ name: label, value: chart.values[i] ?? 0 })) || [];

  return (
    <div className="space-y-5">
      {err && <p className="rounded-lg border border-[var(--brand-danger)]/30 bg-[var(--brand-danger)]/10 px-3 py-2 text-sm text-[var(--brand-danger)]">{err}</p>}
      {opMsg && <p className="rounded-lg border border-[var(--brand-success)]/30 bg-[var(--brand-success)]/10 px-3 py-2 text-sm text-[var(--brand-success)]">{opMsg}</p>}

      {/* KPI strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: 'Revenue (MTD)', value: kpis ? fmt(kpis.mtd_revenue) : '—', color: 'bg-[var(--brand-success)]/10 text-[var(--brand-success)]' },
          { label: 'Outstanding Invoices', value: kpis ? fmt(kpis.outstanding_invoices) : '—', color: 'bg-[var(--brand-warning)]/10 text-[var(--brand-warning)]' },
          { label: 'Payments Recorded', value: kpis?.payment_count ?? (loading ? '…' : '—'), color: 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]' },
        ].map((k) => (
          <div key={k.label} className="flex items-center gap-4 rounded-[var(--brand-radius)] border border-[var(--brand-border)] bg-[var(--brand-surface)] p-4">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${k.color}`}>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
              </svg>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--brand-dim)]">{k.label}</p>
              <p className="mt-0.5 text-xl font-bold text-[var(--brand-text)]">{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--brand-border)]">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-t-[var(--brand-radius-dense)] px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'border border-b-0 border-[var(--brand-border)] bg-[var(--brand-surface)] text-[var(--brand-primary-2)]'
                : 'text-[var(--brand-muted)] hover:text-[var(--brand-text)]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'Overview' && (
        <Card>
          <h3 className="mb-4 text-sm font-semibold text-[var(--brand-text)]">Revenue Trend — Last 6 Months</h3>
          {loading ? (
            <div className="h-56 animate-pulse rounded-lg bg-[var(--brand-surface-2)]" />
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--brand-border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--brand-muted)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--brand-muted)' }} />
                  <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: 'var(--brand-surface)', border: '1px solid var(--brand-border)', borderRadius: 8 }} />
                  <Line type="monotone" dataKey="value" stroke="var(--brand-primary)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      )}

      {activeTab === 'Payments' && (
        <div className="space-y-4">
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-[var(--brand-text)]">Record Payment</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <Input label="Enrollment ID" value={paymentEnrollment} onChange={(e) => setPaymentEnrollment(e.target.value)} />
              </div>
              <Input label="Amount (EGP)" type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--brand-muted)]">Method</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-sm text-[var(--brand-text)]">
                  {['cash', 'bank transfer', 'card', 'refund'].map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <Button type="button" size="sm" className="mt-3" onClick={() => void submitPayment()} disabled={!paymentEnrollment.trim() || !paymentAmount}>
              Save Payment
            </Button>
          </Card>

          <Card noPadding>
            <div className="border-b border-[var(--brand-border)] px-4 py-3">
              <h3 className="text-sm font-semibold text-[var(--brand-text)]">Recent Payments</h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Enrollment</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledger.length === 0 ? (
                  <TableRow><TableCell colSpan={4}><p className="text-sm text-[var(--brand-muted)]">{loading ? 'Loading…' : 'No payments yet.'}</p></TableCell></TableRow>
                ) : ledger.map((x) => {
                  const en = (Array.isArray(x.enrollments) ? x.enrollments[0] : x.enrollments) as Record<string, unknown> | undefined;
                  return (
                    <TableRow key={String(x.id)}>
                      <TableCell>{String(x.received_at || '').slice(0, 10)}</TableCell>
                      <TableCell className="font-mono text-xs">{String(en?.enrollment_id || '—')}</TableCell>
                      <TableCell>{String(x.method || '')}</TableCell>
                      <TableCell>{fmt(Number(x.amount || 0))}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {activeTab === 'Invoices' && (
        <div className="space-y-4">
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-[var(--brand-text)]">Create Invoice</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Invoice number" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
              <Input label="Total (EGP)" type="number" value={invoiceTotal} onChange={(e) => setInvoiceTotal(e.target.value)} />
            </div>
            <Button type="button" size="sm" className="mt-3" onClick={() => void createInvoice()} disabled={!invoiceNumber.trim() || !invoiceTotal}>
              Create Invoice
            </Button>
          </Card>

          <Card noPadding>
            <div className="border-b border-[var(--brand-border)] px-4 py-3">
              <h3 className="text-sm font-semibold text-[var(--brand-text)]">Recent Invoices</h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Issue date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.length === 0 ? (
                  <TableRow><TableCell colSpan={4}><p className="text-sm text-[var(--brand-muted)]">{loading ? 'Loading…' : 'No invoices yet.'}</p></TableCell></TableRow>
                ) : invoices.slice(0, 25).map((inv) => (
                  <TableRow key={String(inv.id || inv.invoice_number)}>
                    <TableCell className="font-mono text-xs">{String(inv.invoice_number || '')}</TableCell>
                    <TableCell>{String(inv.status || '')}</TableCell>
                    <TableCell>{inv.total != null ? fmt(Number(inv.total)) : '—'}</TableCell>
                    <TableCell>{String(inv.issue_date || '').slice(0, 10)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {activeTab === 'Ledger' && (
        <Card noPadding>
          <div className="border-b border-[var(--brand-border)] px-4 py-3">
            <h3 className="text-sm font-semibold text-[var(--brand-text)]">Full Ledger</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Enrollment</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ledger.length === 0 ? (
                <TableRow><TableCell colSpan={4}><p className="text-sm text-[var(--brand-muted)]">{loading ? 'Loading…' : 'No ledger entries.'}</p></TableCell></TableRow>
              ) : ledger.map((x) => {
                const en = (Array.isArray(x.enrollments) ? x.enrollments[0] : x.enrollments) as Record<string, unknown> | undefined;
                return (
                  <TableRow key={String(x.id)}>
                    <TableCell>{String(x.received_at || '').slice(0, 10)}</TableCell>
                    <TableCell className="font-mono text-xs">{String(en?.enrollment_id || '—')}</TableCell>
                    <TableCell>{String(x.method || '')}</TableCell>
                    <TableCell>{fmt(Number(x.amount || 0))}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
