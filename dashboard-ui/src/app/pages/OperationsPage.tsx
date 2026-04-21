import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardHeader } from '../components/design-system/Card';
import { Button } from '../components/design-system/Button';
import { Input } from '../components/design-system/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/design-system/Table';
import { Badge } from '../components/design-system/Badge';
import { EmptyState } from '../components/design-system/EmptyState';
import { functionsBase, getAuthHeaders, jsonFetch } from '../../lib/api';

type Tab = 'trainees' | 'courses' | 'batches' | 'enrollments';

type ListResponse<T> = { items: T[]; total: number; page: number; pageSize: number };

export function OperationsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('trainees');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(searchQuery.trim()), 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const entity = useMemo(() => activeTab, [activeTab]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    const q = new URLSearchParams();
    q.set('entity', entity);
    q.set('page', '1');
    q.set('pageSize', '50');
    if (debouncedQ) q.set('q', debouncedQ);
    try {
      const data = await jsonFetch<ListResponse<Record<string, unknown>>>(`${functionsBase()}/operations-data?${q}`, {
        headers: getAuthHeaders(),
      });
      setRows(data.items || []);
      setTotal(typeof data.total === 'number' ? data.total : (data.items || []).length);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not load data');
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [entity, debouncedQ]);

  useEffect(() => {
    void load();
  }, [load]);

  const tabs = [
    { id: 'trainees' as Tab, label: 'Trainees', count: activeTab === 'trainees' ? total : undefined },
    { id: 'courses' as Tab, label: 'Courses', count: activeTab === 'courses' ? total : undefined },
    { id: 'batches' as Tab, label: 'Batches', count: activeTab === 'batches' ? total : undefined },
    { id: 'enrollments' as Tab, label: 'Enrollments', count: activeTab === 'enrollments' ? total : undefined },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--brand-text)]">Operations Data</h1>
          <p className="mt-1 text-sm text-[var(--brand-muted)]">Trainees, courses, batches, and enrollments (live data)</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" type="button" onClick={() => (window.location.href = '/#/operations/operations-bulk')}>
            Import Excel (classic)
          </Button>
          <Button type="button" onClick={() => (window.location.href = '/#/operations/operations-trainees')}>
            Classic full UI
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
              {tab.count != null && (
                <span className="ml-2 rounded-full bg-[var(--brand-surface-2)] px-2 py-0.5 text-xs">{tab.count}</span>
              )}
            </button>
          ))}
        </nav>
      </div>

      <Card>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Input
            placeholder="Search…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            }
          />
          <Button variant="secondary" type="button" fullWidth onClick={() => void load()}>
            Refresh
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
                <TableHead>Trainee ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!rows.length && !loading ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <EmptyState title="No trainees" description="Try another search or switch tab." />
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={String(r.trainee_id)} interactive>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {!rows.length && !loading ? (
                <TableRow>
                  <TableCell colSpan={7}>
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
                      <Badge size="sm" variant="neutral">
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
                <TableHead>Course ID</TableHead>
                <TableHead>Trainer</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Enrolled</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!rows.length && !loading ? (
                <TableRow>
                  <TableCell colSpan={7}>
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
                <TableHead>Batch</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Enrollment</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!rows.length && !loading ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <EmptyState title="No enrollments" description="Try another search." />
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={String(r.enrollment_id)} interactive>
                    <TableCell>
                      <span className="font-mono text-xs">{String(r.enrollment_id || '')}</span>
                    </TableCell>
                    <TableCell>{String(r.trainee_name || r.trainee_id || '')}</TableCell>
                    <TableCell>{String(r.batch_name || r.batch_id || '')}</TableCell>
                    <TableCell>{String(r.course_name || '')}</TableCell>
                    <TableCell>
                      <Badge size="sm" variant="neutral">
                        {String(r.enrollment_status || '')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge size="sm" variant={String(r.payment_status) === 'Paid' ? 'success' : 'warning'}>
                        {String(r.payment_status || '')}
                      </Badge>
                    </TableCell>
                    <TableCell>{r.amount_paid != null ? `EGP ${Number(r.amount_paid)}` : '—'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
