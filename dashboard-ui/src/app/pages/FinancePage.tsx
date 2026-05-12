import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Card } from '../components/design-system/Card';
import { Button } from '../components/design-system/Button';
import { Input } from '../components/design-system/Input';
import { Badge } from '../components/design-system/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/design-system/Table';
import { functionsBase, getAuthHeaders, jsonFetch } from '../../lib/api';

// ─── Types ──────────────────────────────────────────────────────────────────

type Kpis = { mtd_revenue: number; outstanding_invoices: number; payment_count: number };
type RevChart = { currency: string; labels: string[]; values: number[] };
type MethodChart = { currency: string; labels: string[]; values: number[]; days: number };
type TraineeChart = { currency: string; labels: string[]; values: number[] };
type ArAging = { as_of: string; buckets: { b0_30: number; b31_60: number; b61_90: number; b90p: number }; currency: string };

type BatchRow = { batch_id: string; batch_name?: string; course_id?: string };

type ReceivableRow = {
  enrollment_id: string; trainee_id: string; trainee_name: string | null;
  batch_id: string; payment_status: string;
  fee_due: number | null; total_paid: number; balance: number | null;
  installments: { amount: number; date: string; method: string }[];
};

type ExpenseRow = {
  id: string; serial: number; date: string; description: string;
  amount: number; funding_source: string | null; batch_id: string | null;
  is_refund: boolean; recorded_by: string | null;
};
type IncomeRow = {
  serial: number; date: string | null; description: string;
  amount: number; batch_id: string | null; payment_id: string;
};

type ReceiptItem = {
  id: string; serial_number: string; amount: number; currency: string;
  payer_name: string | null; method: string; issued_at: string; issued_by: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  if (!Number.isFinite(n)) return '—';
  if (n >= 1_000_000) return `EGP ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `EGP ${Math.round(n / 1000)}K`;
  return `EGP ${Math.round(n)}`;
}

function fmtFull(n: number) {
  if (!Number.isFinite(n)) return '—';
  return `EGP ${n.toLocaleString('en-EG', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/** Convert a positive integer EGP amount to English words for receipt. */
function egpInWords(amount: number): string {
  const n = Math.round(amount);
  if (n <= 0 || !Number.isFinite(n)) return '—';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  function hundreds(num: number): string {
    if (num === 0) return '';
    if (num < 20) return ones[num];
    const t = tens[Math.floor(num / 10)];
    const o = ones[num % 10];
    return t + (o ? ` ${o}` : '');
  }
  function below1000(num: number): string {
    if (num < 100) return hundreds(num);
    return `${ones[Math.floor(num / 100)]} Hundred${num % 100 ? ` ${hundreds(num % 100)}` : ''}`;
  }
  const scales = ['', 'Thousand', 'Million', 'Billion'];
  let remaining = n;
  const parts: string[] = [];
  for (let i = 0; remaining > 0; i++) {
    const chunk = remaining % 1000;
    if (chunk) parts.unshift(`${below1000(chunk)}${scales[i] ? ` ${scales[i]}` : ''}`);
    remaining = Math.floor(remaining / 1000);
  }
  return `${parts.join(', ')} Egyptian Pounds Only`;
}

const CHART_COLORS = [
  'var(--brand-primary)', '#22c55e', '#f59e0b', '#ef4444',
  '#a855f7', '#06b6d4', '#f97316', '#84cc16',
];

// ─── Tab list ────────────────────────────────────────────────────────────────

const TABS = ['Overview', 'Receivables', 'Cash Book', 'Payments', 'Receipt', 'Invoices', 'Ledger'] as const;
type Tab = typeof TABS[number];

// ─── Main component ───────────────────────────────────────────────────────────

export function FinancePage() {
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [revChart, setRevChart] = useState<RevChart | null>(null);
  const [methodChart, setMethodChart] = useState<MethodChart | null>(null);
  const [traineeChart, setTraineeChart] = useState<TraineeChart | null>(null);
  const [arAging, setArAging] = useState<ArAging | null>(null);

  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [selectedBatch, setSelectedBatch] = useState('');

  const [receivables, setReceivables] = useState<ReceivableRow[]>([]);
  const [receivablesLoading, setReceivablesLoading] = useState(false);

  const [cbIncome, setCbIncome] = useState<IncomeRow[]>([]);
  const [cbExpenses, setCbExpenses] = useState<ExpenseRow[]>([]);
  const [cbFrom, setCbFrom] = useState('');
  const [cbTo, setCbTo] = useState('');
  const [cbLoading, setCbLoading] = useState(false);

  const [newExpense, setNewExpense] = useState({ date: '', amount: '', description: '', funding_source: '', recorded_by: '', batch_id: '' });
  const [expenseMsg, setExpenseMsg] = useState('');

  const [invoices, setInvoices] = useState<Record<string, unknown>[]>([]);
  const [ledger, setLedger] = useState<Record<string, unknown>[]>([]);
  const [receipts, setReceipts] = useState<ReceiptItem[]>([]);

  const [paymentEnrollment, setPaymentEnrollment] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceTotal, setInvoiceTotal] = useState('');

  const [receiptForm, setReceiptForm] = useState({ enrollment_id: '', amount: '', payer_name: '', method: 'cash', cheque_number: '', notes: '' });
  const [issuedReceipt, setIssuedReceipt] = useState<ReceiptItem | null>(null);
  const receiptPrintRef = useRef<HTMLDivElement>(null);

  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [opMsg, setOpMsg] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('Overview');

  // ── Load initial data ──────────────────────────────────────────────────────

  const loadBatches = useCallback(async () => {
    try {
      const d = await jsonFetch<{ items: BatchRow[] }>(`${functionsBase()}/finance-data?resource=my-batches`, { headers: getAuthHeaders() });
      setBatches(d.items || []);
      if (d.items?.length && !selectedBatch) setSelectedBatch(d.items[0].batch_id);
    } catch (_) {}
  }, [selectedBatch]);

  useEffect(() => {
    let cancelled = false;
    const headers = getAuthHeaders();
    (async () => {
      setLoading(true); setErr('');
      try {
        const [k, r, inv, led, recs, methods, trainee, aging] = await Promise.all([
          jsonFetch<Kpis>(`${functionsBase()}/finance-data?resource=kpis`, { headers }),
          jsonFetch<RevChart>(`${functionsBase()}/finance-data?resource=chart-revenue-trend&months=6`, { headers }),
          jsonFetch<{ items: Record<string, unknown>[] }>(`${functionsBase()}/finance-data?resource=invoices`, { headers }),
          jsonFetch<{ items: Record<string, unknown>[] }>(`${functionsBase()}/finance-data?resource=ledger&page=1&pageSize=25`, { headers }),
          jsonFetch<{ items: ReceiptItem[] }>(`${functionsBase()}/finance-data?resource=receipts`, { headers }),
          jsonFetch<MethodChart>(`${functionsBase()}/finance-data?resource=chart-payment-methods&days=90`, { headers }),
          jsonFetch<TraineeChart>(`${functionsBase()}/finance-data?resource=chart-payments-by-trainee&days=365`, { headers }),
          jsonFetch<ArAging>(`${functionsBase()}/finance-data?resource=ar-aging`, { headers }),
        ]);
        if (!cancelled) {
          setKpis(k); setRevChart(r);
          setInvoices(inv.items || []); setLedger(led.items || []);
          setReceipts(recs.items || []);
          setMethodChart(methods); setTraineeChart(trainee); setArAging(aging);
        }
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'Could not load finance data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    void loadBatches();
    return () => { cancelled = true; };
  }, [loadBatches]);

  // ── Receivables ────────────────────────────────────────────────────────────

  const loadReceivables = useCallback(async (batchId: string) => {
    setReceivablesLoading(true);
    try {
      const qs = batchId ? `&batch_id=${encodeURIComponent(batchId)}` : '';
      const d = await jsonFetch<{ items: ReceivableRow[] }>(`${functionsBase()}/finance-data?resource=receivables${qs}`, { headers: getAuthHeaders() });
      setReceivables(d.items || []);
    } catch (_) {
      setReceivables([]);
    } finally {
      setReceivablesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'Receivables') void loadReceivables(selectedBatch);
  }, [activeTab, selectedBatch, loadReceivables]);

  // ── Cash Book ──────────────────────────────────────────────────────────────

  const loadCashbook = useCallback(async () => {
    setCbLoading(true);
    try {
      const params = new URLSearchParams({ resource: 'cashbook' });
      if (cbFrom) params.set('from', cbFrom);
      if (cbTo) params.set('to', cbTo);
      if (selectedBatch) params.set('batch_id', selectedBatch);
      const d = await jsonFetch<{ income: IncomeRow[]; expenses: ExpenseRow[] }>(
        `${functionsBase()}/finance-data?${params.toString()}`, { headers: getAuthHeaders() },
      );
      setCbIncome(d.income || []);
      setCbExpenses(d.expenses || []);
    } catch (_) {
      setCbIncome([]); setCbExpenses([]);
    } finally {
      setCbLoading(false);
    }
  }, [cbFrom, cbTo, selectedBatch]);

  useEffect(() => {
    if (activeTab === 'Cash Book') void loadCashbook();
  }, [activeTab, loadCashbook]);

  // ── Handlers ───────────────────────────────────────────────────────────────

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

  const addExpense = async () => {
    setExpenseMsg('');
    try {
      await jsonFetch(`${functionsBase()}/finance-data?resource=expense`, {
        method: 'POST', headers: getAuthHeaders(),
        body: JSON.stringify({
          spent_at: newExpense.date || new Date().toISOString().slice(0, 10),
          amount: Number(newExpense.amount),
          description: newExpense.description.trim(),
          funding_source: newExpense.funding_source.trim() || undefined,
          recorded_by: newExpense.recorded_by.trim() || undefined,
          batch_id: newExpense.batch_id || selectedBatch || undefined,
        }),
      });
      setExpenseMsg('Expense saved.');
      setNewExpense({ date: '', amount: '', description: '', funding_source: '', recorded_by: '', batch_id: '' });
      void loadCashbook();
    } catch (e) { setExpenseMsg(e instanceof Error ? e.message : 'Save failed'); }
  };

  const deleteExpense = async (id: string) => {
    if (!window.confirm('Delete this expense?')) return;
    setExpenseMsg('');
    try {
      await jsonFetch(`${functionsBase()}/finance-data?resource=expense&id=${encodeURIComponent(id)}`, {
        method: 'DELETE', headers: getAuthHeaders(),
      });
      void loadCashbook();
    } catch (e) { setExpenseMsg(e instanceof Error ? e.message : 'Delete failed'); }
  };

  const issueReceipt = async () => {
    setOpMsg('');
    try {
      const body: Record<string, unknown> = {
        amount: Number(receiptForm.amount),
        method: receiptForm.method,
        payer_name: receiptForm.payer_name.trim() || undefined,
        cheque_number: receiptForm.cheque_number.trim() || undefined,
        notes: receiptForm.notes.trim() || undefined,
      };
      if (receiptForm.enrollment_id.trim()) body.enrollment_id = receiptForm.enrollment_id.trim();
      const d = await jsonFetch<{ ok: boolean; item: ReceiptItem }>(`${functionsBase()}/finance-data?resource=receipt`, {
        method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(body),
      });
      setIssuedReceipt(d.item);
      setReceipts((prev) => [d.item, ...prev]);
      setReceiptForm({ enrollment_id: '', amount: '', payer_name: '', method: 'cash', cheque_number: '', notes: '' });
    } catch (e) { setOpMsg(e instanceof Error ? e.message : 'Receipt failed'); }
  };

  const printReceipt = () => {
    const content = receiptPrintRef.current?.innerHTML;
    if (!content) return;
    const win = window.open('', '_blank', 'width=700,height=600');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Cash Receipt</title><style>
      body{font-family:Arial,sans-serif;padding:30px;color:#000;direction:ltr}
      .receipt{max-width:640px;margin:0 auto;border:2px solid #000;padding:24px}
      .header{text-align:center;margin-bottom:16px;font-size:18px;font-weight:bold}
      .row{display:flex;justify-content:space-between;margin:8px 0;font-size:13px}
      .label{font-weight:bold;min-width:160px}.value{flex:1;border-bottom:1px dotted #000;padding-left:8px}
      .amount-words{font-size:14px;font-weight:bold;margin:12px 0;padding:8px;border:1px solid #000}
      .sigs{display:flex;gap:32px;margin-top:40px}
      .sig{flex:1;text-align:center}.sig-line{border-bottom:1px solid #000;height:40px;margin-bottom:4px}
      .sig-label{font-size:11px;color:#555}
      @media print{body{padding:0}button{display:none}}
    </style></head><body>${content}</body></html>`);
    win.document.close();
    win.print();
  };

  // ── KPI strip ─────────────────────────────────────────────────────────────

  const revSeries = revChart?.labels?.map((label, i) => ({ name: label, value: revChart.values[i] ?? 0 })) || [];
  const methodSeries = methodChart?.labels?.map((label, i) => ({ name: label, value: methodChart.values[i] ?? 0 })) || [];
  const traineeSeries = traineeChart?.labels?.map((label, i) => ({ name: label, value: traineeChart.values[i] ?? 0 })) || [];
  const agingBuckets = arAging ? [
    { name: '0–30 days', value: arAging.buckets.b0_30 },
    { name: '31–60 days', value: arAging.buckets.b31_60 },
    { name: '61–90 days', value: arAging.buckets.b61_90 },
    { name: '90+ days', value: arAging.buckets.b90p },
  ] : [];

  const totalReceivablesBalance = receivables.reduce((s, r) => s + (r.balance ?? 0), 0);
  const totalPaidInBatch = receivables.reduce((s, r) => s + r.total_paid, 0);
  const totalCbIncome = cbIncome.reduce((s, r) => s + r.amount, 0);
  const totalCbExpenses = cbExpenses.reduce((s, r) => s + r.amount, 0);

  // ── Batch selector (shared) ───────────────────────────────────────────────

  const BatchSelector = () =>
    batches.length > 1 ? (
      <div className="flex items-center gap-2">
        <span className="text-xs text-[var(--brand-muted)]">Batch:</span>
        <select
          value={selectedBatch}
          onChange={(e) => setSelectedBatch(e.target.value)}
          className="rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[var(--brand-surface)] px-2 py-1 text-xs text-[var(--brand-text)]"
        >
          <option value="">All</option>
          {batches.map((b) => (
            <option key={b.batch_id} value={b.batch_id}>{b.batch_name || b.batch_id}</option>
          ))}
        </select>
      </div>
    ) : null;

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
      <div className="flex flex-wrap gap-1 border-b border-[var(--brand-border)]">
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

      {/* ── Overview ─────────────────────────────────────────────────────── */}
      {activeTab === 'Overview' && (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <h3 className="mb-4 text-sm font-semibold text-[var(--brand-text)]">Revenue Trend — Last 6 Months</h3>
              {loading ? (
                <div className="h-52 animate-pulse rounded-lg bg-[var(--brand-surface-2)]" />
              ) : (
                <div className="h-52 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={revSeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--brand-border)" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--brand-muted)' }} />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--brand-muted)' }} tickFormatter={(v) => `${Math.round(v / 1000)}K`} />
                      <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: 'var(--brand-surface)', border: '1px solid var(--brand-border)', borderRadius: 8 }} />
                      <Line type="monotone" dataKey="value" stroke="var(--brand-primary)" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            <Card>
              <h3 className="mb-4 text-sm font-semibold text-[var(--brand-text)]">Payment Methods — Last 90 Days</h3>
              {loading ? (
                <div className="h-52 animate-pulse rounded-lg bg-[var(--brand-surface-2)]" />
              ) : methodSeries.length === 0 ? (
                <p className="pt-8 text-center text-sm text-[var(--brand-muted)]">No data</p>
              ) : (
                <div className="h-52 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie dataKey="value" data={methodSeries} outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {methodSeries.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: 'var(--brand-surface)', border: '1px solid var(--brand-border)', borderRadius: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <h3 className="mb-4 text-sm font-semibold text-[var(--brand-text)]">Top Payers — Last 12 Months</h3>
              {loading ? (
                <div className="h-52 animate-pulse rounded-lg bg-[var(--brand-surface-2)]" />
              ) : traineeSeries.length === 0 ? (
                <p className="pt-8 text-center text-sm text-[var(--brand-muted)]">No data</p>
              ) : (
                <div className="h-52 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={traineeSeries.slice(0, 10)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--brand-border)" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--brand-muted)' }} tickFormatter={(v) => `${Math.round(v / 1000)}K`} />
                      <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10, fill: 'var(--brand-muted)' }} />
                      <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: 'var(--brand-surface)', border: '1px solid var(--brand-border)', borderRadius: 8 }} />
                      <Bar dataKey="value" fill="var(--brand-primary)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            <Card>
              <h3 className="mb-4 text-sm font-semibold text-[var(--brand-text)]">AR Aging {arAging ? `(as of ${arAging.as_of})` : ''}</h3>
              {loading ? (
                <div className="h-52 animate-pulse rounded-lg bg-[var(--brand-surface-2)]" />
              ) : agingBuckets.every((b) => b.value === 0) ? (
                <p className="pt-8 text-center text-sm text-[var(--brand-muted)]">No overdue invoices</p>
              ) : (
                <div className="h-52 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={agingBuckets}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--brand-border)" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--brand-muted)' }} />
                      <YAxis tick={{ fontSize: 10, fill: 'var(--brand-muted)' }} tickFormatter={(v) => `${Math.round(v / 1000)}K`} />
                      <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: 'var(--brand-surface)', border: '1px solid var(--brand-border)', borderRadius: 8 }} />
                      <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* ── Receivables ──────────────────────────────────────────────────── */}
      {activeTab === 'Receivables' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-[var(--brand-text)]">Installment Schedule</h3>
              <p className="text-xs text-[var(--brand-muted)]">Fee due, installments received, and outstanding balance per enrollment</p>
            </div>
            <BatchSelector />
          </div>

          {receivables.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Total Collected', value: fmtFull(totalPaidInBatch), color: 'text-[var(--brand-success)]' },
                { label: 'Total Outstanding', value: fmtFull(totalReceivablesBalance), color: 'text-[var(--brand-warning)]' },
                { label: 'Enrollments', value: receivables.length, color: 'text-[var(--brand-text)]' },
              ].map((s) => (
                <div key={s.label} className="rounded-[var(--brand-radius)] border border-[var(--brand-border)] bg-[var(--brand-surface)] px-4 py-3">
                  <p className="text-[11px] uppercase tracking-wider text-[var(--brand-dim)]">{s.label}</p>
                  <p className={`mt-0.5 text-lg font-bold ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>
          )}

          <Card noPadding>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trainee</TableHead>
                  <TableHead>Enrollment</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Fee Due</TableHead>
                  <TableHead>Installments</TableHead>
                  <TableHead>Collected</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receivablesLoading ? (
                  <TableRow><TableCell colSpan={8}><p className="text-sm text-[var(--brand-muted)]">Loading…</p></TableCell></TableRow>
                ) : receivables.length === 0 ? (
                  <TableRow><TableCell colSpan={8}><p className="text-sm text-[var(--brand-muted)]">No enrollments found for this batch.</p></TableCell></TableRow>
                ) : receivables.map((r) => (
                  <TableRow key={r.enrollment_id}>
                    <TableCell>
                      <p className="font-medium text-[var(--brand-text)]">{r.trainee_name || r.trainee_id}</p>
                      <p className="text-xs text-[var(--brand-muted)]">{r.trainee_id}</p>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{r.enrollment_id}</TableCell>
                    <TableCell className="text-xs">{r.batch_id}</TableCell>
                    <TableCell>{r.fee_due != null ? fmtFull(r.fee_due) : '—'}</TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        {r.installments.length === 0 ? (
                          <span className="text-xs text-[var(--brand-dim)]">—</span>
                        ) : r.installments.map((inst, i) => (
                          <p key={i} className="text-xs text-[var(--brand-muted)]">
                            {`#${i + 1}: ${fmtFull(inst.amount)} (${inst.date?.slice(0, 10) ?? ''})`}
                          </p>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold text-[var(--brand-success)]">{fmtFull(r.total_paid)}</TableCell>
                    <TableCell className={r.balance != null && r.balance > 0 ? 'font-semibold text-[var(--brand-warning)]' : 'text-[var(--brand-success)]'}>
                      {r.balance != null ? fmtFull(r.balance) : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.payment_status === 'Paid' ? 'success' : r.payment_status === 'Pending' ? 'warning' : 'neutral'} size="sm">
                        {r.payment_status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {/* ── Cash Book ────────────────────────────────────────────────────── */}
      {activeTab === 'Cash Book' && (
        <div className="space-y-4">
          {expenseMsg && <p className="rounded-lg border border-[var(--brand-success)]/30 bg-[var(--brand-success)]/10 px-3 py-2 text-sm text-[var(--brand-success)]">{expenseMsg}</p>}

          {/* Filters */}
          <Card>
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[140px]">
                <label className="mb-1 block text-xs font-medium text-[var(--brand-muted)]">From</label>
                <input type="date" value={cbFrom} onChange={(e) => setCbFrom(e.target.value)} className="w-full rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-sm text-[var(--brand-text)]" />
              </div>
              <div className="flex-1 min-w-[140px]">
                <label className="mb-1 block text-xs font-medium text-[var(--brand-muted)]">To</label>
                <input type="date" value={cbTo} onChange={(e) => setCbTo(e.target.value)} className="w-full rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-sm text-[var(--brand-text)]" />
              </div>
              <BatchSelector />
              <Button type="button" size="sm" onClick={() => void loadCashbook()} disabled={cbLoading}>
                {cbLoading ? 'Loading…' : 'Apply'}
              </Button>
            </div>
          </Card>

          {/* Summary bar */}
          {(cbIncome.length > 0 || cbExpenses.length > 0) && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Total Income', value: fmtFull(totalCbIncome), color: 'text-[var(--brand-success)]' },
                { label: 'Total Expenses', value: fmtFull(totalCbExpenses), color: 'text-[var(--brand-danger)]' },
                { label: 'Net', value: fmtFull(totalCbIncome - totalCbExpenses), color: totalCbIncome >= totalCbExpenses ? 'text-[var(--brand-success)]' : 'text-[var(--brand-danger)]' },
              ].map((s) => (
                <div key={s.label} className="rounded-[var(--brand-radius)] border border-[var(--brand-border)] bg-[var(--brand-surface)] px-4 py-3">
                  <p className="text-[11px] uppercase tracking-wider text-[var(--brand-dim)]">{s.label}</p>
                  <p className={`mt-0.5 text-lg font-bold ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Side-by-side ledger */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Income */}
            <Card noPadding>
              <div className="border-b border-[var(--brand-border)] px-4 py-3">
                <h3 className="text-sm font-semibold text-[var(--brand-text)]">Income</h3>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cbIncome.length === 0 ? (
                    <TableRow><TableCell colSpan={4}><p className="text-sm text-[var(--brand-muted)]">{cbLoading ? 'Loading…' : 'No income entries.'}</p></TableCell></TableRow>
                  ) : cbIncome.map((r) => (
                    <TableRow key={r.payment_id}>
                      <TableCell className="text-xs text-[var(--brand-dim)]">{r.serial}</TableCell>
                      <TableCell className="text-xs text-[var(--brand-muted)]">{r.date}</TableCell>
                      <TableCell className="max-w-[200px] text-xs" dir="auto">{r.description}</TableCell>
                      <TableCell className="font-semibold text-[var(--brand-success)]">{fmtFull(r.amount)}</TableCell>
                    </TableRow>
                  ))}
                  {cbIncome.length > 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-xs font-semibold text-[var(--brand-text)]">Total</TableCell>
                      <TableCell className="font-bold text-[var(--brand-success)]">{fmtFull(totalCbIncome)}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>

            {/* Expenses */}
            <div className="space-y-3">
              <Card>
                <h3 className="mb-3 text-sm font-semibold text-[var(--brand-text)]">Add Expense</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--brand-muted)]">Date</label>
                    <input type="date" value={newExpense.date} onChange={(e) => setNewExpense((p) => ({ ...p, date: e.target.value }))} className="w-full rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-sm text-[var(--brand-text)]" />
                  </div>
                  <Input label="Amount (EGP)" type="number" value={newExpense.amount} onChange={(e) => setNewExpense((p) => ({ ...p, amount: e.target.value }))} />
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-[var(--brand-muted)]">Description</label>
                    <input
                      value={newExpense.description}
                      onChange={(e) => setNewExpense((p) => ({ ...p, description: e.target.value }))}
                      placeholder="e.g. راتب شهر مايو"
                      className="w-full rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-sm text-[var(--brand-text)] placeholder:text-[var(--brand-dim)]"
                      dir="auto"
                    />
                  </div>
                  <Input label="Funding source" value={newExpense.funding_source} onChange={(e) => setNewExpense((p) => ({ ...p, funding_source: e.target.value }))} placeholder="Marwa, M+I, Suez…" />
                  <Input label="Recorded by" value={newExpense.recorded_by} onChange={(e) => setNewExpense((p) => ({ ...p, recorded_by: e.target.value }))} />
                </div>
                <Button type="button" size="sm" className="mt-3" onClick={() => void addExpense()} disabled={!newExpense.description.trim() || !newExpense.amount}>
                  Save Expense
                </Button>
              </Card>

              <Card noPadding>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cbExpenses.length === 0 ? (
                      <TableRow><TableCell colSpan={6}><p className="text-sm text-[var(--brand-muted)]">{cbLoading ? 'Loading…' : 'No expenses recorded.'}</p></TableCell></TableRow>
                    ) : cbExpenses.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs text-[var(--brand-dim)]">{r.serial}</TableCell>
                        <TableCell className="text-xs text-[var(--brand-muted)]">{r.date}</TableCell>
                        <TableCell className="max-w-[160px] text-xs" dir="auto">
                          {r.is_refund && <Badge variant="warning" size="sm" className="mr-1">Refund</Badge>}
                          {r.description}
                        </TableCell>
                        <TableCell className="text-xs text-[var(--brand-muted)]">{r.funding_source ?? '—'}</TableCell>
                        <TableCell className="font-semibold text-[var(--brand-danger)]">{fmtFull(r.amount)}</TableCell>
                        <TableCell>
                          <button type="button" onClick={() => void deleteExpense(r.id)} title="Delete expense" className="text-[var(--brand-dim)] hover:text-[var(--brand-danger)]">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {cbExpenses.length > 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-xs font-semibold text-[var(--brand-text)]">Total</TableCell>
                        <TableCell className="font-bold text-[var(--brand-danger)]">{fmtFull(totalCbExpenses)}</TableCell>
                        <TableCell />
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ── Payments ─────────────────────────────────────────────────────── */}
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
                  <TableHead>Date</TableHead><TableHead>Enrollment</TableHead><TableHead>Method</TableHead><TableHead>Amount</TableHead>
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

      {/* ── Receipt ──────────────────────────────────────────────────────── */}
      {activeTab === 'Receipt' && (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Issue form */}
            <Card>
              <h3 className="mb-3 text-sm font-semibold text-[var(--brand-text)]">Issue New Receipt</h3>
              <div className="space-y-3">
                <Input label="Enrollment ID (optional)" value={receiptForm.enrollment_id} onChange={(e) => setReceiptForm((p) => ({ ...p, enrollment_id: e.target.value }))} placeholder="SBS-EN-000001" />
                <Input label="Amount (EGP)" type="number" value={receiptForm.amount} onChange={(e) => setReceiptForm((p) => ({ ...p, amount: e.target.value }))} />
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--brand-muted)]">Payer name</label>
                  <input
                    value={receiptForm.payer_name}
                    onChange={(e) => setReceiptForm((p) => ({ ...p, payer_name: e.target.value }))}
                    placeholder="e.g. حبيبة ناصر"
                    className="w-full rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-sm text-[var(--brand-text)] placeholder:text-[var(--brand-dim)]"
                    dir="auto"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--brand-muted)]">Method</label>
                  <select value={receiptForm.method} onChange={(e) => setReceiptForm((p) => ({ ...p, method: e.target.value }))} className="w-full rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-sm text-[var(--brand-text)]">
                    {['cash', 'bank transfer', 'cheque', 'card'].map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                {receiptForm.method === 'cheque' && (
                  <Input label="Cheque number" value={receiptForm.cheque_number} onChange={(e) => setReceiptForm((p) => ({ ...p, cheque_number: e.target.value }))} />
                )}
                <Input label="Notes (optional)" value={receiptForm.notes} onChange={(e) => setReceiptForm((p) => ({ ...p, notes: e.target.value }))} />
                <Button type="button" size="sm" onClick={() => void issueReceipt()} disabled={!receiptForm.amount || Number(receiptForm.amount) <= 0}>
                  Issue Receipt
                </Button>
              </div>
            </Card>

            {/* Print preview */}
            {issuedReceipt && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[var(--brand-text)]">Receipt Preview</h3>
                  <Button type="button" size="sm" variant="secondary" onClick={printReceipt}>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.056 48.056 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" /></svg>
                    Print
                  </Button>
                </div>
                <div ref={receiptPrintRef}>
                  <div className="receipt rounded-[var(--brand-radius)] border-2 border-[var(--brand-border)] bg-white p-6 text-[var(--brand-text)] dark:text-gray-900">
                    <div className="header mb-4 text-center">
                      <p className="text-lg font-bold">Cash Receipt — إيصال استلام</p>
                      <p className="text-xs text-gray-500">SBS</p>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="font-semibold">Serial No.:</span>
                        <span className="font-mono">{issuedReceipt.serial_number}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold">Date:</span>
                        <span>{issuedReceipt.issued_at.slice(0, 10)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold">Received from / استلمنا من:</span>
                        <span dir="auto">{issuedReceipt.payer_name || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold">Amount (figures):</span>
                        <span className="font-bold">{fmtFull(issuedReceipt.amount)}</span>
                      </div>
                      <div className="rounded border border-gray-300 p-2">
                        <span className="font-semibold">Amount in words: </span>
                        <span>{egpInWords(issuedReceipt.amount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold">Method / طريقة الدفع:</span>
                        <span className="capitalize">{issuedReceipt.method}</span>
                      </div>
                    </div>
                    <div className="sigs mt-10 flex gap-8">
                      {['Prepared by / إعداد', 'Reviewed / مراجعة', 'Approved / يعتمد'].map((sig) => (
                        <div key={sig} className="flex-1 text-center">
                          <div className="mb-1 h-10 border-b border-gray-400" />
                          <p className="text-[11px] text-gray-500">{sig}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Issued receipts list */}
          {receipts.length > 0 && (
            <Card noPadding>
              <div className="border-b border-[var(--brand-border)] px-4 py-3">
                <h3 className="text-sm font-semibold text-[var(--brand-text)]">Recent Receipts</h3>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Serial</TableHead><TableHead>Payer</TableHead><TableHead>Method</TableHead><TableHead>Amount</TableHead><TableHead>Issued</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receipts.slice(0, 20).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.serial_number}</TableCell>
                      <TableCell dir="auto">{r.payer_name || '—'}</TableCell>
                      <TableCell className="capitalize">{r.method}</TableCell>
                      <TableCell className="font-semibold">{fmtFull(r.amount)}</TableCell>
                      <TableCell className="text-xs text-[var(--brand-muted)]">{r.issued_at.slice(0, 10)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </div>
      )}

      {/* ── Invoices ─────────────────────────────────────────────────────── */}
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
                  <TableHead>Number</TableHead><TableHead>Status</TableHead><TableHead>Total</TableHead><TableHead>Issue date</TableHead>
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

      {/* ── Ledger ───────────────────────────────────────────────────────── */}
      {activeTab === 'Ledger' && (
        <Card noPadding>
          <div className="border-b border-[var(--brand-border)] px-4 py-3">
            <h3 className="text-sm font-semibold text-[var(--brand-text)]">Full Ledger</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead><TableHead>Enrollment</TableHead><TableHead>Method</TableHead><TableHead>Amount</TableHead>
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
