import { useEffect, useState } from 'react';
import { Card } from '../../components/design-system/Card';
import { Badge } from '../../components/design-system/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/design-system/Table';
import { functionsBase, getAuthHeaders, jsonFetch } from '../../../lib/api';

type Pipeline = { pipeline: Record<string, number>; total: number };
type CapRow = {
  batch_id: string;
  batch_name: string | null;
  course_id: string | null;
  capacity: number | null;
  enrolled: number;
  utilization_pct: number | null;
};
type CapRes = { capacity: CapRow[] };
type Quality = {
  orphan_trainee_refs: number;
  orphan_batch_refs: number;
  duplicate_enrollment_ids: number;
  paid_with_zero_amount: number;
};

function utilizationVariant(pct: number | null): 'success' | 'warning' | 'neutral' | 'info' {
  if (pct == null) return 'neutral';
  if (pct >= 90) return 'warning';
  if (pct >= 50) return 'success';
  return 'info';
}

export function OperationsInsightsPage() {
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [capacity, setCapacity] = useState<CapRow[]>([]);
  const [quality, setQuality] = useState<Quality | null>(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const headers = getAuthHeaders();
    (async () => {
      setLoading(true); setErr('');
      try {
        const [p, c, q] = await Promise.all([
          jsonFetch<Pipeline>(`${functionsBase()}/operations-data?resource=pipeline`, { headers }),
          jsonFetch<CapRes>(`${functionsBase()}/operations-data?resource=capacity`, { headers }),
          jsonFetch<Quality>(`${functionsBase()}/operations-data?resource=data-quality`, { headers }),
        ]);
        if (!cancelled) { setPipeline(p); setCapacity(c.capacity || []); setQuality(q); }
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'Could not load insights');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const qualityIssues = quality
    ? Object.values(quality).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <div className="space-y-6">
      {err && (
        <div className="rounded-lg border border-[var(--brand-danger)]/30 bg-[var(--brand-danger)]/10 p-3 text-sm text-[var(--brand-danger)]">
          {err}
        </div>
      )}
      {loading && <p className="text-sm text-[var(--brand-muted)]">Loading…</p>}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Pipeline */}
        <Card>
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand-primary)]/10">
              <svg className="h-4 w-4 text-[var(--brand-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--brand-text)]">Enrollment pipeline</h3>
              <p className="text-xs text-[var(--brand-muted)]">Total: {pipeline?.total ?? '—'}</p>
            </div>
          </div>
          <ul className="divide-y divide-[var(--brand-border)]">
            {pipeline?.pipeline
              ? Object.entries(pipeline.pipeline).map(([k, v]) => (
                  <li key={k} className="flex items-center justify-between py-2 text-sm">
                    <span className="capitalize text-[var(--brand-muted)]">{k.replace(/_/g, ' ')}</span>
                    <span className="font-mono font-semibold text-[var(--brand-text)]">{v}</span>
                  </li>
                ))
              : <li className="py-2 text-sm text-[var(--brand-muted)]">No data.</li>}
          </ul>
        </Card>

        {/* Data quality */}
        <Card>
          <div className="mb-3 flex items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${qualityIssues > 0 ? 'bg-[var(--brand-warning)]/10' : 'bg-[var(--brand-success)]/10'}`}>
              <svg className={`h-4 w-4 ${qualityIssues > 0 ? 'text-[var(--brand-warning)]' : 'text-[var(--brand-success)]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--brand-text)]">Data quality signals</h3>
              <p className="text-xs text-[var(--brand-muted)]">
                {qualityIssues === 0 ? 'All checks passed' : `${qualityIssues} issue${qualityIssues !== 1 ? 's' : ''} detected`}
              </p>
            </div>
          </div>
          {quality ? (
            <ul className="divide-y divide-[var(--brand-border)]">
              {([
                ['Orphan trainee refs', quality.orphan_trainee_refs],
                ['Orphan batch refs', quality.orphan_batch_refs],
                ['Duplicate enrollment IDs', quality.duplicate_enrollment_ids],
                ['Paid with zero amount', quality.paid_with_zero_amount],
              ] as [string, number][]).map(([label, val]) => (
                <li key={label} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-[var(--brand-muted)]">{label}</span>
                  <span className={`font-mono font-semibold ${val > 0 ? 'text-[var(--brand-warning)]' : 'text-[var(--brand-success)]'}`}>
                    {val}
                  </span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-[var(--brand-muted)]">Loading…</p>}
        </Card>
      </div>

      {/* Capacity table */}
      <Card noPadding>
        <div className="border-b border-[var(--brand-border)] p-4">
          <h3 className="text-base font-semibold text-[var(--brand-text)]">Batch capacity</h3>
          <p className="text-xs text-[var(--brand-muted)]">Enrollment count vs available capacity</p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Batch</TableHead>
              <TableHead>Course</TableHead>
              <TableHead className="text-right">Enrolled</TableHead>
              <TableHead className="text-right">Capacity</TableHead>
              <TableHead className="text-right">Utilization</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {capacity.length === 0 && !loading ? (
              <TableRow>
                <TableCell colSpan={5}><p className="text-sm text-[var(--brand-muted)]">No batch data.</p></TableCell>
              </TableRow>
            ) : capacity.map((r) => (
              <TableRow key={r.batch_id}>
                <TableCell className="font-medium text-[var(--brand-text)]">{r.batch_name || r.batch_id}</TableCell>
                <TableCell className="font-mono text-xs text-[var(--brand-muted)]">{r.course_id || '—'}</TableCell>
                <TableCell className="text-right">{r.enrolled}</TableCell>
                <TableCell className="text-right">{r.capacity ?? '—'}</TableCell>
                <TableCell className="text-right">
                  {r.utilization_pct != null ? (
                    <Badge size="sm" variant={utilizationVariant(r.utilization_pct)}>
                      {r.utilization_pct}%
                    </Badge>
                  ) : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
