import { useCallback, useEffect, useState } from 'react';
import { Card } from '../components/design-system/Card';
import { Button } from '../components/design-system/Button';
import { Input } from '../components/design-system/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/design-system/Table';
import { Badge } from '../components/design-system/Badge';
import { EmptyState } from '../components/design-system/EmptyState';
import { functionsBase, getAuthHeaders, jsonFetch } from '../../lib/api';

type Tab = 'trainees' | 'courses' | 'batches' | 'enrollments';

type ListResponse<T> = { items: T[]; total: number; page: number; pageSize: number };

const TAB_ORDER: Tab[] = ['trainees', 'courses', 'batches', 'enrollments'];

function deliveryVariant(dt: string) {
  const v = String(dt || '').toLowerCase();
  if (v === 'online') return 'info' as const;
  if (v === 'offline') return 'warning' as const;
  if (v === 'hybrid') return 'primary' as const;
  return 'neutral' as const;
}

export function OperationsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('trainees');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [tabTotals, setTabTotals] = useState<Partial<Record<Tab, number>>>({});

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(searchQuery.trim()), 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    let cancelled = false;
    const headers = getAuthHeaders();
    (async () => {
      try {
        const pairs = await Promise.all(
          TAB_ORDER.map(async (entity) => {
            try {
              const d = await jsonFetch<ListResponse<Record<string, unknown>>>(
                `${functionsBase()}/operations-data?entity=${entity}&page=1&pageSize=1`,
                { headers },
              );
              return [entity, typeof d.total === 'number' ? d.total : (d.items || []).length] as const;
            } catch {
              return [entity, undefined] as const;
            }
          }),
        );
        if (!cancelled) {
          const next: Partial<Record<Tab, number>> = {};
          pairs.forEach(([k, v]) => {
            if (typeof v === 'number') next[k] = v;
          });
          setTabTotals(next);
        }
      } catch {
        if (!cancelled) setTabTotals({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    const q = new URLSearchParams();
    q.set('entity', activeTab);
    q.set('page', '1');
    q.set('pageSize', '50');
    if (debouncedQ) q.set('q', debouncedQ);
    try {
      const data = await jsonFetch<ListResponse<Record<string, unknown>>>(`${functionsBase()}/operations-data?${q}`, {
        headers: getAuthHeaders(),
      });
      setRows(data.items || []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not load data');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, debouncedQ]);

  useEffect(() => {
    void load();
  }, [load]);

  const tabs = TAB_ORDER.map((id) => ({
    id,
    label: id.charAt(0).toUpperCase() + id.slice(1),
    count: tabTotals[id],
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--brand-text)]">Operations Data</h1>
          <p className="mt-1 text-sm text-[var(--brand-muted)]">Manage trainees, courses, batches, and enrollments</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" type="button" onClick={() => (window.location.href = '/#/operations/operations-bulk')}>
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
            Import Excel
          </Button>
          <Button type="button" onClick={() => (window.location.href = '/#/operations/operations-trainees')}>
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add New
          </Button>
        </div>
      </div>

      <div className="border-b border-[var(--brand-border)]">
        <nav className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`border-b-2 px-1 pb-3 transition-all duration-200 ${
                activeTab === tab.id
                  ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]'
                  : 'border-transparent text-[var(--brand-muted)] hover:border-[var(--brand-border)] hover:text-[var(--brand-text)]'
              }`}
            >
              <span className="font-medium">{tab.label}</span>
              <span className="ml-2 rounded-full bg-[var(--brand-surface-2)] px-2 py-0.5 text-xs">
                {typeof tab.count === 'number' ? tab.count : '—'}
              </span>
            </button>
          ))}
        </nav>
      </div>

      <Card>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            }
          />
          <Button variant="secondary" type="button" fullWidth>
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
            Filter
          </Button>
          <Button variant="secondary" type="button" fullWidth>
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
            Sort
          </Button>
          <Button variant="secondary" type="button" fullWidth onClick={() => void load()}>
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Export / Refresh
          </Button>
        </div>
      </Card>

      {err && (
        <div className="rounded-lg border border-[var(--brand-danger)]/30 bg-[var(--brand-danger)]/10 p-3 text-sm text-[var(--brand-danger)]">
          {err}
        </div>
      )}
      {loading && <p className="text-sm text-[var(--brand-muted)]">Loading…</p>}

      <Card noPadding>
        {activeTab === 'trainees' && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <input type="checkbox" readOnly className="rounded border-[var(--brand-border)]" aria-label="Select all" />
                </TableHead>
                <TableHead>Trainee ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!rows.length && !loading ? (
                <TableRow>
                  <TableCell colSpan={9}>
                    <EmptyState title="No trainees" description="Try another search or switch tab." />
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={String(r.trainee_id)} interactive>
                    <TableCell>
                      <input type="checkbox" readOnly className="rounded border-[var(--brand-border)]" aria-label="Select row" />
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs">{String(r.trainee_id || '')}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{String(r.full_name || '')}</span>
                    </TableCell>
                    <TableCell>{String(r.email || '')}</TableCell>
                    <TableCell>{String(r.phone || '')}</TableCell>
                    <TableCell>
                      <Badge variant={String(r.trainee_type) === 'Corporate' ? 'info' : 'neutral'} size="sm">
                        {String(r.trainee_type || '—')}
                      </Badge>
                    </TableCell>
                    <TableCell>{String(r.city || '')}</TableCell>
                    <TableCell>
                      <Badge variant={String(r.status) === 'Active' ? 'success' : 'neutral'} size="sm" dot>
                        {String(r.status || '')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="rounded p-1 transition-colors hover:bg-[var(--brand-surface-2)]"
                          aria-label="Edit"
                        >
                          <svg className="h-4 w-4 text-[var(--brand-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className="rounded p-1 transition-colors hover:bg-[var(--brand-surface-2)]"
                          aria-label="Delete"
                        >
                          <svg className="h-4 w-4 text-[var(--brand-danger)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}

        {activeTab === 'courses' && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Duration (hrs)</TableHead>
                <TableHead>Delivery</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Batches</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!rows.length && !loading ? (
                <TableRow>
                  <TableCell colSpan={9}>
                    <EmptyState title="No courses" description="Try another search." />
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={String(r.course_id)} interactive>
                    <TableCell>
                      <span className="font-mono text-xs">{String(r.course_id || '')}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{String(r.course_name || '')}</span>
                    </TableCell>
                    <TableCell>{String(r.category || '')}</TableCell>
                    <TableCell>{r.duration_hours != null ? String(r.duration_hours) : '—'}</TableCell>
                    <TableCell>
                      <Badge size="sm" variant={deliveryVariant(String(r.delivery_type || ''))}>
                        {String(r.delivery_type || '—')}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {r.price != null && r.price !== '' ? `EGP ${Number(r.price)}` : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={String(r.status) === 'Active' ? 'success' : 'neutral'} size="sm" dot>
                        {String(r.status || '')}
                      </Badge>
                    </TableCell>
                    <TableCell>—</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="rounded p-1 transition-colors hover:bg-[var(--brand-surface-2)]"
                          aria-label="Edit"
                        >
                          <svg className="h-4 w-4 text-[var(--brand-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}

        {activeTab === 'batches' && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch ID</TableHead>
                <TableHead>Batch Name</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Trainer</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!rows.length && !loading ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <EmptyState title="No batches" description="Try another search." />
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => {
                  const cap = r.capacity != null ? Number(r.capacity) : 0;
                  const en = r.enrolled_count != null ? Number(r.enrolled_count) : 0;
                  const pct = cap > 0 ? Math.min(100, Math.round((100 * en) / cap)) : 0;
                  return (
                    <TableRow key={String(r.batch_id)} interactive>
                      <TableCell>
                        <span className="font-mono text-xs">{String(r.batch_id || '')}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{String(r.batch_name || '')}</span>
                      </TableCell>
                      <TableCell>{String(r.course_id || '')}</TableCell>
                      <TableCell>{String(r.trainer || '')}</TableCell>
                      <TableCell>{String(r.start_date || '')}</TableCell>
                      <TableCell>{String(r.location || '')}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>
                            {en}/{cap || '—'}
                          </span>
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[var(--brand-surface-2)]">
                            <div className="h-full bg-[var(--brand-primary)]" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="rounded p-1 transition-colors hover:bg-[var(--brand-surface-2)]"
                            aria-label="View"
                          >
                            <svg className="h-4 w-4 text-[var(--brand-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                              />
                            </svg>
                          </button>
                          <button
                            type="button"
                            className="rounded p-1 transition-colors hover:bg-[var(--brand-surface-2)]"
                            aria-label="Edit"
                          >
                            <svg className="h-4 w-4 text-[var(--brand-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        )}

        {activeTab === 'enrollments' && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Enrollment ID</TableHead>
                <TableHead>Trainee</TableHead>
                <TableHead>Course / Batch</TableHead>
                <TableHead>Enrollment Status</TableHead>
                <TableHead>Payment Status</TableHead>
                <TableHead>Amount Paid</TableHead>
                <TableHead>Enroll Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!rows.length && !loading ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <EmptyState title="No enrollments" description="Try another search." />
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => {
                  const es = String(r.enrollment_status || '');
                  const ev =
                    es === 'Attended' ? ('success' as const) : es === 'Registered' ? ('info' as const) : ('neutral' as const);
                  const ps = String(r.payment_status || '');
                  const pv = ps === 'Paid' ? ('success' as const) : ps === 'Pending' ? ('warning' as const) : ('neutral' as const);
                  const paid =
                    r.amount_paid != null && r.amount_paid !== ''
                      ? `EGP ${Number(r.amount_paid)}`
                      : r.amount_paid === 0
                        ? 'EGP 0'
                        : '—';
                  const ed = r.enroll_date || r.created_at;
                  const edStr = ed ? String(ed).slice(0, 10) : '—';
                  return (
                    <TableRow key={String(r.enrollment_id)} interactive>
                      <TableCell>
                        <span className="font-mono text-xs">{String(r.enrollment_id || '')}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{String(r.trainee_name || r.trainee_id || '')}</span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{String(r.course_name || '')}</p>
                          <p className="text-xs text-[var(--brand-muted)]">{String(r.batch_name || r.batch_id || '')}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge size="sm" variant={ev}>
                          {es || '—'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge size="sm" variant={pv}>
                          {ps || '—'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{paid}</TableCell>
                      <TableCell>{edStr}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="rounded p-1 transition-colors hover:bg-[var(--brand-surface-2)]"
                            aria-label="Edit"
                          >
                            <svg className="h-4 w-4 text-[var(--brand-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
