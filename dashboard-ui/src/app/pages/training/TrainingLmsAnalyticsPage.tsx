import { useEffect, useMemo, useState } from 'react';
import { Card } from '../../components/design-system/Card';
import { Badge } from '../../components/design-system/Badge';
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

const KPI_CONFIG = [
  {
    label: 'Progress records',
    key: 'progress_records' as keyof Overview,
    color: 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    ),
  },
  {
    label: 'Assessments',
    key: 'assessments' as keyof Overview,
    color: 'bg-[var(--brand-accent)]/10 text-[var(--brand-accent)]',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    ),
  },
  {
    label: 'Attempts',
    key: 'attempts' as keyof Overview,
    color: 'bg-[var(--brand-warning)]/10 text-[var(--brand-warning)]',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    ),
  },
  {
    label: 'Certificates',
    key: 'certificates' as keyof Overview,
    color: 'bg-[var(--brand-success)]/10 text-[var(--brand-success)]',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
    ),
  },
];

function completionVariant(pct?: number): 'success' | 'info' | 'warning' | 'neutral' {
  if (pct == null) return 'neutral';
  if (pct >= 75) return 'success';
  if (pct >= 40) return 'info';
  if (pct >= 10) return 'warning';
  return 'neutral';
}

export function TrainingLmsAnalyticsPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [completion, setCompletion] = useState<CompletionRow[]>([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const headers = getAuthHeaders();
    (async () => {
      setLoading(true); setErr('');
      try {
        const [o, c] = await Promise.all([
          jsonFetch<Overview>(`${functionsBase()}/lms-analytics?resource=overview`, { headers }),
          jsonFetch<{ items: CompletionRow[] }>(`${functionsBase()}/lms-analytics?resource=completion-by-course`, { headers }),
        ]);
        if (!cancelled) { setOverview(o); setCompletion(c.items || []); }
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'Could not load LMS analytics');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const sorted = useMemo(
    () => [...completion].sort((a, b) => Number(b.completion_rate_pct ?? 0) - Number(a.completion_rate_pct ?? 0)),
    [completion],
  );

  return (
    <div className="space-y-6">
      {err && (
        <div className="rounded-lg border border-[var(--brand-danger)]/30 bg-[var(--brand-danger)]/10 p-3 text-sm text-[var(--brand-danger)]">
          {err}
        </div>
      )}

      {/* KPI strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPI_CONFIG.map((k) => (
          <div
            key={k.label}
            className="flex items-center gap-4 rounded-[var(--brand-radius)] border border-[var(--brand-border)] bg-[var(--brand-surface)] p-4"
          >
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${k.color}`}>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {k.icon}
              </svg>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--brand-dim)]">{k.label}</p>
              <p className="mt-0.5 text-xl font-bold text-[var(--brand-text)]">
                {loading ? '…' : (overview?.[k.key] ?? '—')}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Completion table */}
      <Card noPadding>
        <div className="border-b border-[var(--brand-border)] p-4">
          <h3 className="text-base font-semibold text-[var(--brand-text)]">Completion by course</h3>
          <p className="mt-0.5 text-xs text-[var(--brand-muted)]">Sorted by completion rate, highest first.</p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Course</TableHead>
              <TableHead>Course ID</TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead className="text-right">Completed</TableHead>
              <TableHead className="text-right">Enrolled</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5}><p className="text-sm text-[var(--brand-muted)]">Loading…</p></TableCell>
              </TableRow>
            ) : sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}><p className="text-sm text-[var(--brand-muted)]">No completion data available.</p></TableCell>
              </TableRow>
            ) : sorted.map((row, idx) => {
              const pct = row.completion_rate_pct != null ? Number(row.completion_rate_pct) : null;
              return (
                <TableRow key={String(row.course_id ?? idx)}>
                  <TableCell className="font-medium text-[var(--brand-text)]">{String(row.course_name ?? '—')}</TableCell>
                  <TableCell className="font-mono text-xs text-[var(--brand-muted)]">{String(row.course_id ?? '—')}</TableCell>
                  <TableCell className="text-right">
                    {pct != null ? (
                      <Badge variant={completionVariant(pct)} size="sm">{pct.toFixed(1)}%</Badge>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="text-right font-medium">{String(row.completed_count ?? '—')}</TableCell>
                  <TableCell className="text-right text-[var(--brand-muted)]">{String(row.enrolled_count ?? '—')}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
