import { useEffect, useState } from 'react';
import { Card } from '../../components/design-system/Card';
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
      setLoading(true);
      setErr('');
      try {
        const [p, c, q] = await Promise.all([
          jsonFetch<Pipeline>(`${functionsBase()}/operations-data?resource=pipeline`, { headers }),
          jsonFetch<CapRes>(`${functionsBase()}/operations-data?resource=capacity`, { headers }),
          jsonFetch<Quality>(`${functionsBase()}/operations-data?resource=data-quality`, { headers }),
        ]);
        if (!cancelled) {
          setPipeline(p);
          setCapacity(c.capacity || []);
          setQuality(q);
        }
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'Could not load insights');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      {err ? (
        <div className="rounded-lg border border-[var(--brand-danger)]/30 bg-[var(--brand-danger)]/10 p-3 text-sm text-[var(--brand-danger)]">
          {err}
        </div>
      ) : null}
      {loading ? <p className="text-sm text-[var(--brand-muted)]">Loading…</p> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-lg font-semibold text-[var(--brand-text)]">Enrollment pipeline</h3>
          <p className="mb-2 text-sm text-[var(--brand-muted)]">Total enrollments: {pipeline?.total ?? '—'}</p>
          <ul className="space-y-1 text-sm">
            {pipeline?.pipeline
              ? Object.entries(pipeline.pipeline).map(([k, v]) => (
                  <li key={k} className="flex justify-between gap-4">
                    <span>{k}</span>
                    <span className="font-mono">{v}</span>
                  </li>
                ))
              : null}
          </ul>
        </Card>

        <Card>
          <h3 className="mb-3 text-lg font-semibold text-[var(--brand-text)]">Data quality signals</h3>
          {quality ? (
            <ul className="space-y-1 text-sm">
              <li className="flex justify-between gap-4">
                <span>Orphan trainee refs</span>
                <span className="font-mono">{quality.orphan_trainee_refs}</span>
              </li>
              <li className="flex justify-between gap-4">
                <span>Orphan batch refs</span>
                <span className="font-mono">{quality.orphan_batch_refs}</span>
              </li>
              <li className="flex justify-between gap-4">
                <span>Duplicate enrollment IDs</span>
                <span className="font-mono">{quality.duplicate_enrollment_ids}</span>
              </li>
              <li className="flex justify-between gap-4">
                <span>Paid with zero amount</span>
                <span className="font-mono">{quality.paid_with_zero_amount}</span>
              </li>
            </ul>
          ) : null}
        </Card>
      </div>

      <Card noPadding>
        <div className="border-b border-[var(--brand-border)] p-4">
          <h3 className="text-lg font-semibold text-[var(--brand-text)]">Batch capacity</h3>
          <p className="text-sm text-[var(--brand-muted)]">Enrollment count vs capacity</p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Batch</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Enrolled</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Utilization</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {capacity.map((r) => (
              <TableRow key={r.batch_id}>
                <TableCell className="font-mono text-xs">{r.batch_name || r.batch_id}</TableCell>
                <TableCell className="font-mono text-xs">{r.course_id || '—'}</TableCell>
                <TableCell>{r.enrolled}</TableCell>
                <TableCell>{r.capacity ?? '—'}</TableCell>
                <TableCell>{r.utilization_pct != null ? `${r.utilization_pct}%` : '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
