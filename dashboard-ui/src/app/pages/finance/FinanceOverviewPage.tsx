import { useEffect, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Card } from '../../components/design-system/Card';
import { functionsBase, getAuthHeaders, jsonFetch } from '../../../lib/api';
import { fmt, CHART_COLORS, type Kpis, type RevChart, type MethodChart, type TraineeChart, type ArAging } from './_shared';

export function FinanceOverviewPage() {
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [revChart, setRevChart] = useState<RevChart | null>(null);
  const [methodChart, setMethodChart] = useState<MethodChart | null>(null);
  const [traineeChart, setTraineeChart] = useState<TraineeChart | null>(null);
  const [arAging, setArAging] = useState<ArAging | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let cancelled = false;
    const headers = getAuthHeaders();
    (async () => {
      setLoading(true); setErr('');
      try {
        const [k, r, methods, trainee, aging] = await Promise.all([
          jsonFetch<Kpis>(`${functionsBase()}/finance-data?resource=kpis`, { headers }),
          jsonFetch<RevChart>(`${functionsBase()}/finance-data?resource=chart-revenue-trend&months=6`, { headers }),
          jsonFetch<MethodChart>(`${functionsBase()}/finance-data?resource=chart-payment-methods&days=90`, { headers }),
          jsonFetch<TraineeChart>(`${functionsBase()}/finance-data?resource=chart-payments-by-trainee&days=365`, { headers }),
          jsonFetch<ArAging>(`${functionsBase()}/finance-data?resource=ar-aging`, { headers }),
        ]);
        if (!cancelled) { setKpis(k); setRevChart(r); setMethodChart(methods); setTraineeChart(trainee); setArAging(aging); }
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'Could not load data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const revSeries = revChart?.labels?.map((label, i) => ({ name: label, value: revChart.values[i] ?? 0 })) || [];
  const methodSeries = methodChart?.labels?.map((label, i) => ({ name: label, value: methodChart.values[i] ?? 0 })) || [];
  const traineeSeries = traineeChart?.labels?.map((label, i) => ({ name: label, value: traineeChart.values[i] ?? 0 })) || [];
  const agingBuckets = arAging ? [
    { name: '0–30 days', value: arAging.buckets.b0_30 },
    { name: '31–60 days', value: arAging.buckets.b31_60 },
    { name: '61–90 days', value: arAging.buckets.b61_90 },
    { name: '90+ days', value: arAging.buckets.b90p },
  ] : [];

  const skeleton = <div className="h-48 animate-pulse rounded-lg bg-[var(--brand-surface-2)]" />;

  return (
    <div className="space-y-5">
      {err && <p className="rounded-lg border border-[var(--brand-danger)]/30 bg-[var(--brand-danger)]/10 px-3 py-2 text-sm text-[var(--brand-danger)]">{err}</p>}

      {/* KPI strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
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
        ))}
      </div>

      {/* Charts grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Revenue trend */}
        <Card>
          <h3 className="mb-4 text-sm font-semibold text-[var(--brand-text)]">Revenue Trend — Last 6 Months</h3>
          {loading ? skeleton : revSeries.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--brand-muted)]">No payment data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={revSeries} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--brand-border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--brand-muted)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--brand-muted)' }} tickFormatter={(v) => `${Math.round(v / 1000)}K`} />
                <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: 'var(--brand-surface)', border: '1px solid var(--brand-border)', borderRadius: 8 }} />
                <Line type="monotone" dataKey="value" stroke="var(--brand-primary)" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Payment methods */}
        <Card>
          <h3 className="mb-4 text-sm font-semibold text-[var(--brand-text)]">Payment Methods — Last 90 Days</h3>
          {loading ? skeleton : methodSeries.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--brand-muted)]">No data.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={methodSeries} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {methodSeries.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: 'var(--brand-surface)', border: '1px solid var(--brand-border)', borderRadius: 8 }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Top payers */}
        <Card>
          <h3 className="mb-4 text-sm font-semibold text-[var(--brand-text)]">Top Payers — Last 12 Months</h3>
          {loading ? skeleton : traineeSeries.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--brand-muted)]">No data.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={traineeSeries.slice(0, 8)} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--brand-border)" />
                <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--brand-muted)' }} tickFormatter={(v) => `${Math.round(v / 1000)}K`} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: 'var(--brand-muted)' }} width={110} />
                <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: 'var(--brand-surface)', border: '1px solid var(--brand-border)', borderRadius: 8 }} />
                <Bar dataKey="value" fill="var(--brand-primary)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* AR Aging */}
        <Card>
          <h3 className="mb-1 text-sm font-semibold text-[var(--brand-text)]">AR Aging</h3>
          {arAging && <p className="mb-3 text-xs text-[var(--brand-muted)]">As of {arAging.as_of}</p>}
          {loading ? skeleton : agingBuckets.every((b) => b.value === 0) ? (
            <p className="py-8 text-center text-sm text-[var(--brand-muted)]">No outstanding invoices.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={agingBuckets} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--brand-border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--brand-muted)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--brand-muted)' }} tickFormatter={(v) => `${Math.round(v / 1000)}K`} />
                <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: 'var(--brand-surface)', border: '1px solid var(--brand-border)', borderRadius: 8 }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {agingBuckets.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  );
}
