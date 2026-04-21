import { useEffect, useState } from 'react';
import { Card } from '../../components/design-system/Card';
import { functionsBase, getAuthHeaders, jsonFetch } from '../../../lib/api';

type Overview = {
  trainees: number;
  courses: number;
  batches: number;
  enrollments: number;
  completed: number;
};

export function OperationsOverviewPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr('');
      try {
        const d = await jsonFetch<Overview>(`${functionsBase()}/operations-data?resource=operations-overview`, {
          headers: getAuthHeaders(),
        });
        if (!cancelled) setData(d);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'Failed to load overview');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const items = [
    { label: 'Trainees', value: data?.trainees ?? '—' },
    { label: 'Courses', value: data?.courses ?? '—' },
    { label: 'Batches', value: data?.batches ?? '—' },
    { label: 'Enrollments', value: data?.enrollments ?? '—' },
    { label: 'Completed', value: data?.completed ?? '—' },
  ];

  return (
    <div className="space-y-4">
      {err ? (
        <div className="rounded-lg border border-[var(--brand-danger)]/30 bg-[var(--brand-danger)]/10 p-3 text-sm text-[var(--brand-danger)]">
          {err}
        </div>
      ) : null}
      {loading ? <p className="text-sm text-[var(--brand-muted)]">Loading…</p> : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {items.map((x) => (
          <Card key={x.label}>
            <p className="text-sm text-[var(--brand-muted)]">{x.label}</p>
            <p className="mt-1 text-2xl font-bold text-[var(--brand-text)]">{x.value}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
