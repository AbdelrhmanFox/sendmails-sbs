import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { functionsBase, getAuthHeaders, jsonFetch } from '../../../lib/api';

type Stats = { sessions: number; groups: number };

const QUICK_LINKS = [
  {
    to: '/training/sessions',
    label: 'Live Sessions',
    desc: 'Create sessions and share participant links',
    color: 'bg-[var(--brand-success)]/10 text-[var(--brand-success)]',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />,
  },
  {
    to: '/training/classroom',
    label: 'Classroom',
    desc: 'Manage batch classrooms and share links',
    color: 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />,
  },
  {
    to: '/training/assignments',
    label: 'Assignments',
    desc: 'Create and grade trainee assignments',
    color: 'bg-[var(--brand-accent)]/10 text-[var(--brand-accent)]',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />,
  },
  {
    to: '/training/assessments',
    label: 'Assessments',
    desc: 'Quizzes, exams and attempt tracking',
    color: 'bg-[var(--brand-warning)]/10 text-[var(--brand-warning)]',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />,
  },
  {
    to: '/training/credentials',
    label: 'Certificates',
    desc: 'View and share issued credentials',
    color: 'bg-[var(--brand-success)]/10 text-[var(--brand-success)]',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />,
  },
  {
    to: '/training/analytics',
    label: 'Analytics',
    desc: 'Completion rates and LMS insights',
    color: 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
  },
];

export function TrainingOverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await jsonFetch<{ sessions: { groups_count?: number }[] }>(`${functionsBase()}/training-sessions`, {
          headers: getAuthHeaders(),
        });
        if (cancelled) return;
        const sessions = data.sessions || [];
        const groups = sessions.reduce((acc, s) => acc + Number(s.groups_count || 0), 0);
        setStats({ sessions: sessions.length, groups });
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'Failed to load');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-6">
      {err && (
        <p className="rounded-lg border border-[var(--brand-danger)]/30 bg-[var(--brand-danger)]/10 px-3 py-2 text-sm text-[var(--brand-danger)]">{err}</p>
      )}

      {/* Stats strip */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-4 rounded-[var(--brand-radius)] border border-[var(--brand-border)] bg-[var(--brand-surface)] p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-success)]/10">
            <svg className="h-5 w-5 text-[var(--brand-success)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--brand-dim)]">Live sessions</p>
            <p className="mt-0.5 text-xl font-bold text-[var(--brand-text)]">{stats?.sessions ?? '…'}</p>
          </div>
          <Link to="/training/sessions" className="ml-auto text-xs text-[var(--brand-primary)] hover:underline">
            View all →
          </Link>
        </div>
        <div className="flex items-center gap-4 rounded-[var(--brand-radius)] border border-[var(--brand-border)] bg-[var(--brand-surface)] p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-primary)]/10">
            <svg className="h-5 w-5 text-[var(--brand-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--brand-dim)]">Active groups</p>
            <p className="mt-0.5 text-xl font-bold text-[var(--brand-text)]">{stats?.groups ?? '…'}</p>
          </div>
        </div>
      </div>

      {/* Quick links grid */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--brand-dim)]">Quick access</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_LINKS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="group flex items-start gap-3 rounded-[var(--brand-radius)] border border-[var(--brand-border)] bg-[var(--brand-surface)] p-4 transition-colors hover:border-[var(--brand-primary)]/40 hover:bg-[var(--brand-primary-subtle)]"
            >
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${item.color}`}>
                <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {item.icon}
                </svg>
              </div>
              <div className="min-w-0">
                <p className="font-medium text-[var(--brand-text)] group-hover:text-[var(--brand-primary-2)]">{item.label}</p>
                <p className="mt-0.5 text-xs text-[var(--brand-muted)]">{item.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
