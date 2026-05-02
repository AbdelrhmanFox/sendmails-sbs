import { useEffect, useMemo, useState } from 'react';
import { Card } from '../../components/design-system/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/design-system/Table';
import { functionsBase, getAuthHeaders, jsonFetch } from '../../../lib/api';

type Overview = {
  progress_records: number;
  assessments: number;
  attempts: number;
  certificates: number;
};

type CompletionRow = {
  course_id?: string;
  course_name?: string;
  completion_rate_pct?: number;
  enrolled_count?: number;
  completed_count?: number;
  [key: string]: unknown;
};

export function TrainingLmsAnalyticsPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [completion, setCompletion] = useState<CompletionRow[]>([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const headers = getAuthHeaders();
    (async () => {
      setLoading(true);
      setErr('');
      try {
        const [o, c] = await Promise.all([
          jsonFetch<Overview>(`${functionsBase()}/lms-analytics?resource=overview`, { headers }),
          jsonFetch<{ items: CompletionRow[] }>(
            `${functionsBase()}/lms-analytics?resource=completion-by-course`,
            { headers },
          ),
        ]);
        if (!cancelled) {
          setOverview(o);
          setCompletion(c.items || []);
        }
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'Could not load LMS analytics');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const sorted = useMemo(() => {
    return [...completion].sort(
      (a, b) => Number(b.completion_rate_pct ?? 0) - Number(a.completion_rate_pct ?? 0),
    );
  }, [completion]);

  return (
    <div className="space-y-6">
      {err ? (
        <div className="rounded-lg border border-[var(--brand-danger)]/30 bg-[var(--brand-danger)]/10 p-3 text-sm text-[var(--brand-danger)]">
          {err}
        </div>
      ) : null}
      {loading ? <p className="text-sm text-[var(--brand-muted)]">Loading…</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(
          [
            ['Progress rows', overview?.progress_records],
            ['Assessments', overview?.assessments],
            ['Attempts', overview?.attempts],
            ['Certificates', overview?.certificates],
          ] as const
        ).map(([label, val]) => (
          <Card key={label}>
            <p className="text-sm text-[var(--brand-muted)]">{label}</p>
            <p className="mt-1 text-2xl font-semibold text-[var(--brand-text)]">{val ?? '—'}</p>
          </Card>
        ))}
      </div>

      <Card noPadding>
        <div className="border-b border-[var(--brand-border)] p-4">
          <h3 className="text-lg font-semibold text-[var(--brand-text)]">Completion by course</h3>
          <p className="mt-1 text-sm text-[var(--brand-muted)]">From materialized view when present in the database.</p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Course</TableHead>
              <TableHead>Course ID</TableHead>
              <TableHead className="text-right">Completion %</TableHead>
              <TableHead className="text-right">Completed</TableHead>
              <TableHead className="text-right">Enrolled</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((row, idx) => (
              <TableRow key={String(row.course_id ?? idx)}>
                <TableCell>{String(row.course_name ?? '—')}</TableCell>
                <TableCell className="font-mono text-xs">{String(row.course_id ?? '—')}</TableCell>
                <TableCell className="text-right">
                  {row.completion_rate_pct != null ? `${Number(row.completion_rate_pct).toFixed(1)}%` : '—'}
                </TableCell>
                <TableCell className="text-right">{String(row.completed_count ?? '—')}</TableCell>
                <TableCell className="text-right">{String(row.enrolled_count ?? '—')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
