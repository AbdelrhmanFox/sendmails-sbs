import { useEffect, useState } from 'react';
import { functionsBase, getAuthHeaders, jsonFetch } from '../../../lib/api';

type Overview = {
  trainees: number;
  courses: number;
  batches: number;
  enrollments: number;
  completed: number;
};

const KPI_CONFIG = [
  {
    label: 'Students',
    key: 'trainees' as keyof Overview,
    color: 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />,
  },
  {
    label: 'Courses',
    key: 'courses' as keyof Overview,
    color: 'bg-[var(--brand-accent)]/10 text-[var(--brand-accent)]',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />,
  },
  {
    label: 'Batches',
    key: 'batches' as keyof Overview,
    color: 'bg-[var(--brand-info)]/10 text-[var(--brand-info,var(--brand-primary))]',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />,
  },
  {
    label: 'Enrollments',
    key: 'enrollments' as keyof Overview,
    color: 'bg-[var(--brand-warning)]/10 text-[var(--brand-warning)]',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />,
  },
  {
    label: 'Completed',
    key: 'completed' as keyof Overview,
    color: 'bg-[var(--brand-success)]/10 text-[var(--brand-success)]',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />,
  },
];

export function OperationsOverviewPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setErr('');
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
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-4">
      {err && (
        <div className="rounded-lg border border-[var(--brand-danger)]/30 bg-[var(--brand-danger)]/10 p-3 text-sm text-[var(--brand-danger)]">
          {err}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {KPI_CONFIG.map((k) => (
          <div
            key={k.label}
            className="flex items-center gap-3 rounded-[var(--brand-radius)] border border-[var(--brand-border)] bg-[var(--brand-surface)] p-4"
          >
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${k.color}`}>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {k.icon}
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--brand-dim)]">{k.label}</p>
              <p className="mt-0.5 text-xl font-bold text-[var(--brand-text)]">
                {loading ? '…' : (data?.[k.key] ?? '—')}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
