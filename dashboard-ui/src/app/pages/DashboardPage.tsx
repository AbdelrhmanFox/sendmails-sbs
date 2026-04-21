import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader } from '../components/design-system/Card';
import { Badge } from '../components/design-system/Badge';
import { Button } from '../components/design-system/Button';
import { functionsBase, getAuthHeaders, jsonFetch } from '../../lib/api';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down';
  icon: React.ReactNode;
}

function StatCard({ title, value, change, trend, icon }: StatCardProps) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="mb-1 text-sm text-[var(--brand-muted)]">{title}</p>
          <p className="text-3xl font-bold text-[var(--brand-text)]">{value}</p>
          {change && (
            <p
              className={`mt-2 flex items-center gap-1 text-sm ${
                trend === 'up' ? 'text-[var(--brand-success)]' : 'text-[var(--brand-danger)]'
              }`}
            >
              {trend === 'up' ? '↑' : '↓'} {change}
            </p>
          )}
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]">
          {icon}
        </div>
      </div>
    </Card>
  );
}

type OpsOverview = { trainees: number; courses: number; batches: number; enrollments: number; completed: number };
type FinanceKpis = { mtd_revenue: number; outstanding_invoices: number; payment_count: number };
type TrainingSession = {
  id: string;
  title: string | null;
  trainer_username?: string | null;
  groups_count?: number | null;
  training_groups?: { id: string }[] | null;
};

function fmtMoney(n: number) {
  if (!Number.isFinite(n) || n === 0) return 'EGP 0';
  if (n >= 1_000_000) return `EGP ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `EGP ${Math.round(n / 1000)}K`;
  return `EGP ${Math.round(n)}`;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const role = useMemo(() => String(localStorage.getItem('sbs_role') || '').toLowerCase(), []);
  const [ops, setOps] = useState<OpsOverview | null>(null);
  const [fin, setFin] = useState<FinanceKpis | null>(null);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [loadErr, setLoadErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadErr('');
      const headers = getAuthHeaders();
      const tasks: Promise<void>[] = [];

      if (['admin', 'staff', 'user'].includes(role)) {
        tasks.push(
          (async () => {
            try {
              const d = await jsonFetch<OpsOverview>(
                `${functionsBase()}/operations-data?resource=operations-overview`,
                { headers },
              );
              if (!cancelled) setOps(d);
            } catch {
              if (!cancelled) setOps(null);
            }
          })(),
        );
      }

      if (['admin', 'accountant'].includes(role)) {
        tasks.push(
          (async () => {
            try {
              const d = await jsonFetch<FinanceKpis>(`${functionsBase()}/finance-data?resource=kpis`, { headers });
              if (!cancelled) setFin(d);
            } catch {
              if (!cancelled) setFin(null);
            }
          })(),
        );
      }

      if (['admin', 'trainer'].includes(role)) {
        tasks.push(
          (async () => {
            try {
              const d = await jsonFetch<{ sessions: TrainingSession[] }>(`${functionsBase()}/training-sessions`, {
                headers,
              });
              if (!cancelled) setSessions(d.sessions || []);
            } catch {
              if (!cancelled) setSessions([]);
            }
          })(),
        );
      }

      try {
        await Promise.all(tasks);
      } catch (e) {
        if (!cancelled) setLoadErr(e instanceof Error ? e.message : 'Could not load dashboard');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [role]);

  const traineeCount = ops?.trainees ?? null;
  const batchCount = ops?.batches ?? null;
  const revenue = fin != null ? fmtMoney(fin.mtd_revenue) : '—';
  const pendingPaymentsCount = fin != null && typeof fin.payment_count === 'number' ? fin.payment_count : null;

  const liveSessions = sessions.slice(0, 2);

  return (
    <div className="space-y-6">
      {loadErr && (
        <div className="rounded-lg border border-[var(--brand-danger)]/30 bg-[var(--brand-danger)]/10 p-3 text-sm text-[var(--brand-danger)]">
          {loadErr}
        </div>
      )}
      {loading && <p className="text-sm text-[var(--brand-muted)]">Loading…</p>}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Trainees"
          value={traineeCount != null ? traineeCount : '—'}
          icon={
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          }
        />
        <StatCard
          title="Active Batches"
          value={batchCount != null ? batchCount : '—'}
          icon={
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          }
        />
        <StatCard
          title="Revenue (MTD)"
          value={revenue}
          icon={
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
        <StatCard
          title="Pending Payments"
          value={pendingPaymentsCount != null ? pendingPaymentsCount : '—'}
          icon={
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
          }
        />
      </div>

      <Card>
        <CardHeader title="Quick Actions" subtitle="Common operations" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Button type="button" variant="secondary" fullWidth onClick={() => navigate('/operations/trainees')}>
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Trainee
          </Button>
          <Button type="button" variant="secondary" fullWidth onClick={() => navigate('/operations/batches')}>
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            New Batch
          </Button>
          <Button type="button" variant="secondary" fullWidth onClick={() => navigate('/finance')}>
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Record Payment
          </Button>
          <Button type="button" variant="secondary" fullWidth onClick={() => navigate('/finance')}>
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            View Reports
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader title="Recent Activity" subtitle="Latest system events" />
        <div className="space-y-3">
          <p className="rounded-lg p-4 text-sm text-[var(--brand-muted)]">
            No activity feed is wired to this dashboard yet. Use Operations and Finance for day-to-day changes.
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader title="Active Training Sessions" subtitle="Live now" />
          <div className="space-y-3">
            {liveSessions.length === 0 ? (
              <p className="p-3 text-sm text-[var(--brand-muted)]">No sessions listed (or no access).</p>
            ) : (
              liveSessions.map((s) => {
                const groups = Array.isArray(s.training_groups) ? s.training_groups.length : Number(s.groups_count || 0);
                return (
                  <div key={s.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[var(--brand-text)]">{s.title || 'Session'}</p>
                      <p className="text-xs text-[var(--brand-muted)]">
                        {s.trainer_username || '—'} · {groups} group(s)
                      </p>
                    </div>
                    <Badge variant="success" dot>
                      Live
                    </Badge>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Pending Submissions" subtitle="Awaiting review" />
          <div className="space-y-3">
            <p className="p-3 text-sm text-[var(--brand-muted)]">
              Assignment queues are not surfaced on this dashboard yet. Open Training for sessions, materials, and classroom
              tools.
            </p>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Training shortcuts" subtitle="React routes" />
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => navigate('/training/sessions')}>
            Sessions
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => navigate('/training/presenter')}>
            Presenter
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => navigate('/training/classroom')}>
            Classroom links
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => navigate('/operations/import')}>
            Data import
          </Button>
        </div>
        <p className="mt-3 text-sm text-[var(--brand-muted)]">
          Public participant URLs (<code className="text-xs text-[var(--brand-text)]">?session=</code>,{' '}
          <code className="text-xs text-[var(--brand-text)]">?group=</code>, <code className="text-xs text-[var(--brand-text)]">?classroom=</code>, etc.) still resolve via the site root bootstrap into the legacy public views until those flows are ported.
        </p>
      </Card>
    </div>
  );
}
