import { useEffect, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Card } from '../../components/design-system/Card';
import { functionsBase, getAuthHeaders, jsonFetch } from '../../../lib/api';
import {
  fmt, CHART_COLORS,
  type ArAging, type CashMonthlyChart, type ExpenseChart,
  type Kpis, type MethodChart, type RevChart, type TraineeChart,
} from './_shared';

/** Settles each fetch independently so one failure doesn't blank all charts. */
async function safeFetch<T>(url: string, headers: HeadersInit): Promise<T | null> {
  try {
    return await jsonFetch<T>(url, { headers });
  } catch {
    return null;
  }
}

const SKELETON = <div className="h-48 animate-pulse rounded-lg bg-[var(--brand-surface-2)]" />;

function ChartError() {
  return <p className="py-8 text-center text-sm text-[var(--brand-danger)]">Could not load data.</p>;
}

function NoData({ label = 'No data yet.' }: { label?: string }) {
  return <p className="py-8 text-center text-sm text-[var(--brand-muted)]">{label}</p>;
}

const TOOLTIP_STYLE = {
  background: 'var(--brand-surface)',
  border: '1px solid var(--brand-border)',
  borderRadius: 8,
};

export function FinanceOverviewPage() {
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [kpisErr, setKpisErr] = useState(false);

  const [revChart, setRevChart] = useState<RevChart | null>(null);
  const [revErr, setRevErr] = useState(false);

  const [expChart, setExpChart] = useState<ExpenseChart | null>(null);
  const [expErr, setExpErr] = useState(false);

  const [cashChart, setCashChart] = useState<CashMonthlyChart | null>(null);
  const [cashErr, setCashErr] = useState(false);

  const [methodChart, setMethodChart] = useState<MethodChart | null>(null);
  const [methodErr, setMethodErr] = useState(false);

  const [traineeChart, setTraineeChart] = useState<TraineeChart | null>(null);
  const [traineeErr, setTraineeErr] = useState(false);

  const [arAging, setArAging] = useState<ArAging | null>(null);
  const [agingErr, setAgingErr] = useState(false);

  const [loading, setLoading] = useState(true);
  const [months, setMonths] = useState(6);

  useEffect(() => {
    let cancelled = false;
    const headers = getAuthHeaders();
    const base = functionsBase();
    const m = String(months);

    setLoading(true);
    setKpisErr(false); setRevErr(false); setExpErr(false); setCashErr(false);
    setMethodErr(false); setTraineeErr(false); setAgingErr(false);

    Promise.all([
      safeFetch<Kpis>(`${base}/finance-data?resource=kpis`, headers),
      safeFetch<RevChart>(`${base}/finance-data?resource=chart-revenue-trend&months=${m}`, headers),
      safeFetch<ExpenseChart>(`${base}/finance-data?resource=chart-expenses-trend&months=${m}`, headers),
      safeFetch<CashMonthlyChart>(`${base}/finance-data?resource=chart-cash-monthly&months=${m}`, headers),
      safeFetch<MethodChart>(`${base}/finance-data?resource=chart-payment-methods&days=90`, headers),
      safeFetch<TraineeChart>(`${base}/finance-data?resource=chart-payments-by-trainee&days=365`, headers),
      safeFetch<ArAging>(`${base}/finance-data?resource=ar-aging`, headers),
    ]).then(([k, rev, exp, cash, methods, trainee, aging]) => {
      if (cancelled) return;
      if (k) setKpis(k); else setKpisErr(true);
      if (rev) setRevChart(rev); else setRevErr(true);
      if (exp) setExpChart(exp); else setExpErr(true);
      if (cash) setCashChart(cash); else setCashErr(true);
      if (methods) setMethodChart(methods); else setMethodErr(true);
      if (trainee) setTraineeChart(trainee); else setTraineeErr(true);
      if (aging) setArAging(aging); else setAgingErr(true);
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [months]);

  const revSeries = revChart?.labels?.map((label, i) => ({ name: label, value: revChart.values[i] ?? 0 })) || [];
  const expSeries = expChart?.labels?.map((label, i) => ({ name: label, value: expChart.values[i] ?? 0 })) || [];
  const cashSeries = cashChart?.labels?.map((label, i) => ({
    name: label,
    income: cashChart.income_values[i] ?? 0,
    expenses: cashChart.expense_values[i] ?? 0,
  })) || [];
  const methodSeries = methodChart?.labels?.map((label, i) => ({ name: label, value: methodChart.values[i] ?? 0 })) || [];
  const traineeSeries = traineeChart?.labels?.map((label, i) => ({ name: label, value: traineeChart.values[i] ?? 0 })) || [];
  const agingBuckets = arAging ? [
    { name: '0–30 d', value: arAging.buckets.b0_30 },
    { name: '31–60 d', value: arAging.buckets.b31_60 },
    { name: '61–90 d', value: arAging.buckets.b61_90 },
    { name: '90+ d', value: arAging.buckets.b90p },
  ] : [];

  return (
    <div className="space-y-5">
      {/* Month range control */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium text-[var(--brand-muted)]">Trend period:</span>
        {[3, 6, 12].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setMonths(n)}
            className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
              months === n
                ? 'bg-[var(--brand-primary)] text-white'
                : 'border border-[var(--brand-border)] bg-[var(--brand-surface)] text-[var(--brand-muted)] hover:bg-[var(--brand-surface-2)]'
            }`}
          >
            {n}M
          </button>
        ))}
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {kpisErr ? (
          <div className="col-span-3 rounded-lg border border-[var(--brand-danger)]/30 bg-[var(--brand-danger)]/10 px-3 py-2 text-sm text-[var(--brand-danger)]">
            Could not load KPIs.
          </div>
        ) : (
          [
            { label: 'Revenue (MTD)', value: kpis ? fmt(kpis.mtd_revenue) : '…', sub: 'This calendar month', color: 'bg-[var(--brand-success)]/10 text-[var(--brand-success)]' },
            { label: 'Outstanding Invoices', value: kpis ? fmt(kpis.outstanding_invoices) : '…', sub: 'Unpaid & overdue', color: 'bg-[var(--brand-warning)]/10 text-[var(--brand-warning)]' },
            { label: 'Payments Recorded', value: kpis ? String(kpis.payment_count) : '…', sub: 'All time', color: 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]' },
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
                <p className="text-xs text-[var(--brand-muted)]">{k.sub}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Charts grid — top row: revenue / expenses */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Revenue trend */}
        <Card>
          <h3 className="mb-4 text-sm font-semibold text-[var(--brand-text)]">Revenue — Last {months} Months</h3>
          {loading ? SKELETON : revErr ? <ChartError /> : revSeries.length === 0 ? <NoData label="No payment data yet." /> : (
            <div className="min-h-[200px] w-full">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={revSeries} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--brand-border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--brand-muted)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--brand-muted)' }} tickFormatter={(v) => `${Math.round(v / 1000)}K`} />
                  <Tooltip formatter={(v: number) => fmt(v)} contentStyle={TOOLTIP_STYLE} />
                  <Line type="monotone" dataKey="value" name="Revenue (EGP)" stroke="var(--brand-success)" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* Expenses trend */}
        <Card>
          <h3 className="mb-4 text-sm font-semibold text-[var(--brand-text)]">Operating Expenses — Last {months} Months</h3>
          {loading ? SKELETON : expErr ? <ChartError /> : expSeries.length === 0 ? <NoData label="No expense data yet." /> : (
            <div className="min-h-[200px] w-full">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={expSeries} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--brand-border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--brand-muted)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--brand-muted)' }} tickFormatter={(v) => `${Math.round(v / 1000)}K`} />
                  <Tooltip formatter={(v: number) => fmt(v)} contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="value" name="Expenses (EGP)" fill="var(--brand-danger)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      {/* Cash picture: income vs expenses dual-series */}
      <Card>
        <h3 className="mb-4 text-sm font-semibold text-[var(--brand-text)]">Cash Picture — Income vs Expenses Last {months} Months</h3>
        {loading ? SKELETON : cashErr ? <ChartError /> : cashSeries.length === 0 ? <NoData label="No data yet." /> : (
          <div className="min-h-[220px] w-full">
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={cashSeries} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--brand-border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--brand-muted)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--brand-muted)' }} tickFormatter={(v) => `${Math.round(v / 1000)}K`} />
                <Tooltip formatter={(v: number) => fmt(v)} contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="income" name="Income" fill="var(--brand-success)" radius={[4, 4, 0, 0]} opacity={0.85} />
                <Line type="monotone" dataKey="expenses" name="Expenses" stroke="var(--brand-danger)" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* Bottom row: payment methods / top payers / AR aging */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Payment methods */}
        <Card>
          <h3 className="mb-4 text-sm font-semibold text-[var(--brand-text)]">Payment Methods (90 days)</h3>
          {loading ? SKELETON : methodErr ? <ChartError /> : methodSeries.length === 0 ? <NoData /> : (
            <div className="min-h-[200px] w-full">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={methodSeries}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={72}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {methodSeries.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmt(v)} contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* Top payers */}
        <Card>
          <h3 className="mb-4 text-sm font-semibold text-[var(--brand-text)]">Top Payers (12 months)</h3>
          {loading ? SKELETON : traineeErr ? <ChartError /> : traineeSeries.length === 0 ? <NoData /> : (
            <div className="min-h-[200px] w-full">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={traineeSeries.slice(0, 8)} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--brand-border)" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--brand-muted)' }} tickFormatter={(v) => `${Math.round(v / 1000)}K`} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: 'var(--brand-muted)' }} width={110} />
                  <Tooltip formatter={(v: number) => fmt(v)} contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="value" name="Paid (EGP)" fill="var(--brand-primary)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* AR Aging */}
        <Card>
          <h3 className="mb-1 text-sm font-semibold text-[var(--brand-text)]">AR Aging</h3>
          {arAging && <p className="mb-3 text-xs text-[var(--brand-muted)]">As of {arAging.as_of}</p>}
          {loading ? SKELETON : agingErr ? <ChartError /> : agingBuckets.every((b) => b.value === 0) ? (
            <NoData label="No outstanding invoices." />
          ) : (
            <div className="min-h-[200px] w-full">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={agingBuckets} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--brand-border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--brand-muted)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--brand-muted)' }} tickFormatter={(v) => `${Math.round(v / 1000)}K`} />
                  <Tooltip formatter={(v: number) => fmt(v)} contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="value" name="EGP" radius={[4, 4, 0, 0]}>
                    {agingBuckets.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
