import { useEffect, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card } from '../components/design-system/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/design-system/Table';
import { functionsBase, getAuthHeaders, jsonFetch } from '../../lib/api';

type Kpis = { mtd_revenue: number; outstanding_invoices: number; payment_count: number };
type RevChart = { currency: string; labels: string[]; values: number[] };

export function FinancePage() {
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [chart, setChart] = useState<RevChart | null>(null);
  const [invoices, setInvoices] = useState<Record<string, unknown>[]>([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const headers = getAuthHeaders();
    (async () => {
      setLoading(true);
      setErr('');
      try {
        const [k, c, inv] = await Promise.all([
          jsonFetch<Kpis>(`${functionsBase()}/finance-data?resource=kpis`, { headers }),
          jsonFetch<RevChart>(`${functionsBase()}/finance-data?resource=chart-revenue-trend&months=6`, { headers }),
          jsonFetch<{ items: Record<string, unknown>[] }>(`${functionsBase()}/finance-data?resource=invoices`, { headers }),
        ]);
        if (!cancelled) {
          setKpis(k);
          setChart(c);
          setInvoices(inv.items || []);
        }
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'Could not load finance data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const series =
    chart?.labels?.map((label, i) => ({
      name: label,
      value: chart.values[i] ?? 0,
    })) || [];

  const fmt = (n: number) =>
    Number.isFinite(n) ? `EGP ${n >= 1000 ? `${Math.round(n / 1000)}K` : Math.round(n)}` : '—';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--brand-text)]">Finance</h1>
        <p className="mt-1 text-sm text-[var(--brand-muted)]">Revenue KPIs, trends, and invoices (read-only overview)</p>
      </div>
      {err ? (
        <div className="rounded-lg border border-[var(--brand-danger)]/30 bg-[var(--brand-danger)]/10 p-3 text-sm text-[var(--brand-danger)]">
          {err}
        </div>
      ) : null}
      {loading ? <p className="text-sm text-[var(--brand-muted)]">Loading…</p> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm text-[var(--brand-muted)]">MTD revenue</p>
          <p className="mt-1 text-2xl font-bold text-[var(--brand-text)]">{kpis ? fmt(kpis.mtd_revenue) : '—'}</p>
        </Card>
        <Card>
          <p className="text-sm text-[var(--brand-muted)]">Outstanding invoices</p>
          <p className="mt-1 text-2xl font-bold text-[var(--brand-text)]">{kpis ? fmt(kpis.outstanding_invoices) : '—'}</p>
        </Card>
        <Card>
          <p className="text-sm text-[var(--brand-muted)]">Payments recorded</p>
          <p className="mt-1 text-2xl font-bold text-[var(--brand-text)]">{kpis?.payment_count ?? '—'}</p>
        </Card>
      </div>

      <Card>
        <h3 className="mb-4 text-lg font-semibold text-[var(--brand-text)]">Revenue trend</h3>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Line type="monotone" dataKey="value" stroke="var(--brand-primary)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card noPadding>
        <div className="border-b border-[var(--brand-border)] p-4">
          <h3 className="text-lg font-semibold text-[var(--brand-text)]">Recent invoices</h3>
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
            {invoices.slice(0, 25).map((inv) => (
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
  );
}
