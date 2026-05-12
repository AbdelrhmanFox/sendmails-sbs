import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/design-system/Card';
import { Badge } from '../components/design-system/Badge';
import { Button } from '../components/design-system/Button';
import { AUTH_USER, functionsBase, getAuthHeaders, jsonFetch } from '../../lib/api';

type OpsOverview = { trainees: number; courses: number; batches: number; enrollments: number; completed: number };
type FinanceKpis = { mtd_revenue: number; outstanding_invoices: number; payment_count: number };
type TrainingSession = {
  id: string;
  title: string | null;
  trainer_username?: string | null;
  groups_count?: number | null;
  training_groups?: { id: string }[] | null;
};
type PendingSubmission = {
  id: string;
  assignment_id: string;
  assignment_title: string;
  batch_id: string;
  trainee_name?: string | null;
  submitted_at?: string | null;
  status: string;
};

function fmtMoney(n: number) {
  if (!Number.isFinite(n) || n === 0) return 'EGP 0';
  if (n >= 1_000_000) return `EGP ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `EGP ${Math.round(n / 1000)}K`;
  return `EGP ${Math.round(n)}`;
}

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  sub?: string;
}

function KpiCard({ title, value, icon, color, sub }: KpiCardProps) {
  return (
    <div className="flex items-start gap-4 rounded-[var(--brand-radius)] border border-[var(--brand-border)] bg-[var(--brand-surface)] p-5">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${color}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--brand-dim)]">{title}</p>
        <p className="mt-0.5 text-2xl font-bold text-[var(--brand-text)]">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-[var(--brand-muted)]">{sub}</p>}
      </div>
    </div>
  );
}

function QuickActionCard({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-center gap-2.5 rounded-[var(--brand-radius)] border border-[var(--brand-border)] bg-[var(--brand-surface)] p-4 transition-all duration-150 hover:border-[var(--brand-primary)]/40 hover:bg-[var(--brand-primary-subtle)] active:scale-[0.97]"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] transition-colors group-hover:bg-[var(--brand-primary)]/20">
        {icon}
      </div>
      <span className="text-xs font-medium text-[var(--brand-muted)] group-hover:text-[var(--brand-primary-2)]">{label}</span>
    </button>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const role = useMemo(() => String(localStorage.getItem('sbs_role') || '').toLowerCase(), []);
  const username = useMemo(() => String(localStorage.getItem(AUTH_USER) || '').trim() || 'there', []);

  const [ops, setOps] = useState<OpsOverview | null>(null);
  const [fin, setFin] = useState<FinanceKpis | null>(null);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [pendingSubmissions, setPendingSubmissions] = useState<{ items: PendingSubmission[]; total_pending: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const headers = getAuthHeaders();
      const tasks: Promise<void>[] = [];

      if (['admin', 'staff', 'user'].includes(role)) {
        tasks.push(
          jsonFetch<OpsOverview>(`${functionsBase()}/operations-data?resource=operations-overview`, { headers })
            .then((d) => { if (!cancelled) setOps(d); })
            .catch(() => { if (!cancelled) setOps(null); }),
        );
      }
      if (['admin', 'accountant'].includes(role)) {
        tasks.push(
          jsonFetch<FinanceKpis>(`${functionsBase()}/finance-data?resource=kpis`, { headers })
            .then((d) => { if (!cancelled) setFin(d); })
            .catch(() => { if (!cancelled) setFin(null); }),
        );
      }
      if (['admin', 'trainer'].includes(role)) {
        tasks.push(
          jsonFetch<{ sessions: TrainingSession[] }>(`${functionsBase()}/training-sessions`, { headers })
            .then((d) => { if (!cancelled) setSessions(d.sessions || []); })
            .catch(() => { if (!cancelled) setSessions([]); }),
        );
        tasks.push(
          jsonFetch<{ items: PendingSubmission[]; total_pending: number }>(
            `${functionsBase()}/classroom-data?resource=pending-submissions`, { headers },
          )
            .then((d) => { if (!cancelled) setPendingSubmissions({ items: d.items || [], total_pending: typeof d.total_pending === 'number' ? d.total_pending : (d.items || []).length }); })
            .catch(() => { if (!cancelled) setPendingSubmissions(null); }),
        );
      }

      await Promise.allSettled(tasks);
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [role]);

  const kpis = [
    ops != null && {
      title: 'Active Students',
      value: ops.trainees,
      sub: `${ops.enrollments ?? 0} enrollments`,
      color: 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]',
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
      ),
    },
    ops != null && {
      title: 'Active Courses',
      value: ops.courses,
      sub: `${ops.batches ?? 0} learning paths`,
      color: 'bg-[var(--brand-success)]/10 text-[var(--brand-success)]',
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
        </svg>
      ),
    },
    ops != null && {
      title: 'Completions',
      value: ops.completed ?? 0,
      sub: 'All time',
      color: 'bg-[var(--brand-warning)]/10 text-[var(--brand-warning)]',
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.62 48.62 0 0112 20.904a48.62 48.62 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.636 50.636 0 00-2.658-.813A59.906 59.906 0 0112 3.493a59.903 59.903 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
        </svg>
      ),
    },
    fin != null && {
      title: 'Revenue (MTD)',
      value: fmtMoney(fin.mtd_revenue),
      sub: `${fin.payment_count ?? 0} payments`,
      color: 'bg-[var(--brand-danger)]/10 text-[var(--brand-danger)]',
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
        </svg>
      ),
    },
  ].filter(Boolean) as KpiCardProps[];

  const liveSessions = sessions.slice(0, 3);

  // Accountant gets a dedicated finance-focused dashboard
  if (role === 'accountant') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-brand text-2xl font-bold text-[var(--brand-text)]">{greeting}, {username}</h1>
            <p className="mt-0.5 text-sm text-[var(--brand-muted)]">Your finance workspace — manage receivables, expenses, payments and receipts.</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button type="button" variant="primary" size="sm" onClick={() => navigate('/finance/payments')}>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
              Record Payment
            </Button>
          </div>
        </div>

        {/* Finance KPIs */}
        {fin != null && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { title: 'Revenue (MTD)', value: fmtMoney(fin.mtd_revenue), sub: 'This calendar month', color: 'bg-[var(--brand-success)]/10 text-[var(--brand-success)]', icon: <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg> },
              { title: 'Outstanding Invoices', value: fmtMoney(fin.outstanding_invoices), sub: 'Unpaid & overdue', color: 'bg-[var(--brand-warning)]/10 text-[var(--brand-warning)]', icon: <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" /></svg> },
              { title: 'Payments Recorded', value: String(fin.payment_count), sub: 'All time', color: 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]', icon: <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
            ].map((k) => (
              <KpiCard key={k.title} {...k} />
            ))}
          </div>
        )}
        {loading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-[var(--brand-radius)] border border-[var(--brand-border)] bg-[var(--brand-surface)]" />)}
          </div>
        )}

        {/* Finance quick actions */}
        <div>
          <h2 className="mb-3 text-sm font-semibold text-[var(--brand-text)]">Quick Actions</h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-4">
            <QuickActionCard label="Record Payment" icon={<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg>} onClick={() => navigate('/finance/payments')} />
            <QuickActionCard label="Add Expense" icon={<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" /></svg>} onClick={() => navigate('/finance/expenses')} />
            <QuickActionCard label="Issue Receipt" icon={<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>} onClick={() => navigate('/finance/receipts')} />
            <QuickActionCard label="New Invoice" icon={<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" /></svg>} onClick={() => navigate('/finance/invoices')} />
          </div>
        </div>

        {/* Finance modules strip */}
        <div>
          <h2 className="mb-3 text-sm font-semibold text-[var(--brand-text)]">Finance Modules</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Receivables', sub: 'Student balances & installments', path: '/finance/receivables', icon: '📋' },
              { label: 'Cash Book', sub: 'Income & expense register', path: '/finance/cashbook', icon: '📒' },
              { label: 'Ledger', sub: 'Full payment history', path: '/finance/ledger', icon: '🗂️' },
              { label: 'Overview', sub: 'Charts & KPIs', path: '/finance/overview', icon: '📊' },
            ].map((item) => (
              <button key={item.label} type="button" onClick={() => navigate(item.path)}
                className="group flex items-start gap-3 rounded-[var(--brand-radius)] border border-[var(--brand-border)] bg-[var(--brand-surface)] p-4 text-left transition-all duration-150 hover:border-[var(--brand-border-2)] hover:bg-[var(--brand-surface-2)] active:scale-[0.98]">
                <span className="text-xl">{item.icon}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--brand-text)]">{item.label}</p>
                  <p className="text-xs text-[var(--brand-muted)]">{item.sub}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Greeting banner */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-brand text-2xl font-bold text-[var(--brand-text)]">
            {greeting}, {username}
          </h1>
          <p className="mt-0.5 text-sm text-[var(--brand-muted)]">
            Here's what's happening across your learning platform today.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button type="button" variant="primary" size="sm" onClick={() => navigate('/operations/trainees')}>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Student
          </Button>
        </div>
      </div>

      {/* KPI grid */}
      {(ops != null || fin != null) && (
        <div className={`grid gap-4 ${kpis.length >= 4 ? 'grid-cols-2 lg:grid-cols-4' : kpis.length === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
          {kpis.map((kpi) => (
            <KpiCard key={kpi.title} {...kpi} />
          ))}
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-[var(--brand-radius)] border border-[var(--brand-border)] bg-[var(--brand-surface)]" />
          ))}
        </div>
      )}

      {/* Quick actions */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-[var(--brand-text)]">Quick Actions</h2>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          <QuickActionCard label="New Student" icon={<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" /></svg>} onClick={() => navigate('/operations/trainees')} />
          <QuickActionCard label="New Path" icon={<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>} onClick={() => navigate('/operations/batches')} />
          <QuickActionCard label="Live Session" icon={<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" /></svg>} onClick={() => navigate('/training/sessions')} />
          <QuickActionCard label="Assignments" icon={<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" /></svg>} onClick={() => navigate('/training/assignments')} />
          <QuickActionCard label="Payment" icon={<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg>} onClick={() => navigate('/finance')} />
          <QuickActionCard label="Analytics" icon={<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" /></svg>} onClick={() => navigate('/operations/insights')} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Active Sessions */}
        {['admin', 'trainer', 'staff'].includes(role) && (
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-[var(--brand-text)]">Live Sessions</h2>
                <p className="text-xs text-[var(--brand-muted)]">Currently active training</p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => navigate('/training/sessions')}>
                View all
              </Button>
            </div>
            <div className="space-y-2">
              {loading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-14 animate-pulse rounded-lg bg-[var(--brand-surface-2)]" />
                  ))}
                </div>
              ) : liveSessions.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand-surface-2)] text-[var(--brand-dim)]">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  </div>
                  <p className="text-sm text-[var(--brand-muted)]">No active sessions right now</p>
                  <Button type="button" variant="secondary" size="sm" onClick={() => navigate('/training/sessions')}>
                    Schedule a session
                  </Button>
                </div>
              ) : (
                liveSessions.map((s) => {
                  const groups = Array.isArray(s.training_groups) ? s.training_groups.length : Number(s.groups_count || 0);
                  return (
                    <div key={s.id} className="flex items-center justify-between rounded-lg border border-[var(--brand-border)] p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[var(--brand-text)]">{s.title || 'Session'}</p>
                        <p className="text-xs text-[var(--brand-muted)]">
                          {s.trainer_username || '—'} · {groups} group{groups !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <Badge variant="success" dot>Live</Badge>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        )}

        {/* Pending Submissions */}
        {['admin', 'trainer'].includes(role) && (
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-[var(--brand-text)]">Pending Reviews</h2>
                <p className="text-xs text-[var(--brand-muted)]">Assignments awaiting feedback</p>
              </div>
              {pendingSubmissions && pendingSubmissions.total_pending > 0 && (
                <Badge variant="warning">{pendingSubmissions.total_pending}</Badge>
              )}
            </div>
            <div className="space-y-2">
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 animate-pulse rounded-lg bg-[var(--brand-surface-2)]" />
                  ))}
                </div>
              ) : pendingSubmissions == null ? (
                <p className="py-4 text-center text-sm text-[var(--brand-muted)]">Submission queue unavailable.</p>
              ) : pendingSubmissions.total_pending === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand-success)]/10 text-[var(--brand-success)]">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-sm text-[var(--brand-muted)]">All caught up — no pending reviews</p>
                </div>
              ) : (
                <>
                  <div className="max-h-52 space-y-1.5 overflow-y-auto">
                    {pendingSubmissions.items.map((row) => (
                      <button
                        key={row.id}
                        type="button"
                        className="w-full rounded-lg border border-[var(--brand-border)] p-2.5 text-left transition-colors hover:bg-[var(--brand-surface-2)]"
                        onClick={() => navigate(`/training/assignments?batch=${encodeURIComponent(row.batch_id)}`)}
                      >
                        <p className="text-sm font-medium text-[var(--brand-text)]">{row.assignment_title || 'Assignment'}</p>
                        <p className="text-xs text-[var(--brand-muted)]">
                          {(row.trainee_name || 'Trainee').trim()} · {row.submitted_at || '—'}
                        </p>
                      </button>
                    ))}
                  </div>
                  <Button type="button" variant="secondary" size="sm" onClick={() => navigate('/training/assignments')}>
                    Open all assignments
                  </Button>
                </>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Platform features strip */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-[var(--brand-text)]">Platform</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {[
            { label: 'Course Catalog', sub: 'Browse & manage courses', path: '/operations/lms-admin', icon: '📚' },
            { label: 'LMS Analytics', sub: 'Learner progress insights', path: '/training/lms-analytics', icon: '📊' },
            { label: 'Certificates', sub: 'Issue & verify credentials', path: '/training/credentials', icon: '🎓' },
            { label: 'Classroom Links', sub: 'Virtual room management', path: '/training/classroom', icon: '🔗' },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => navigate(item.path)}
              className="group flex items-start gap-3 rounded-[var(--brand-radius)] border border-[var(--brand-border)] bg-[var(--brand-surface)] p-4 text-left transition-all duration-150 hover:border-[var(--brand-border-2)] hover:bg-[var(--brand-surface-2)] active:scale-[0.98]"
            >
              <span className="text-xl">{item.icon}</span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--brand-text)]">{item.label}</p>
                <p className="text-xs text-[var(--brand-muted)]">{item.sub}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Coming soon teaser */}
      <div className="rounded-[var(--brand-radius)] border border-[var(--brand-primary)]/20 bg-[var(--brand-primary-subtle)] p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-primary)]/15 text-[var(--brand-primary)]">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[var(--brand-primary-2)]">Coming Soon to SBS Learn</p>
            <p className="mt-0.5 text-xs text-[var(--brand-muted)]">
              AI Assistant, Smart Messaging, Course Builder, Automation Workflows, and Calendar integration — all in active development.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
