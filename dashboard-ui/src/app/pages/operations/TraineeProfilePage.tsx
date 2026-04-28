import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { Textarea } from '../../components/design-system/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/design-system/Table';
import { functionsBase, getAuthHeaders, jsonFetch } from '../../../lib/api';

type TraineeProfileResponse = {
  item: Record<string, unknown> | null;
  enrollments: Array<Record<string, unknown>>;
  summary: {
    enrollment_count?: number;
    total_paid?: number;
  } | null;
};

function asText(v: unknown): string {
  return String(v ?? '');
}

export function TraineeProfilePage() {
  const { traineeId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<TraineeProfileResponse | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    if (!traineeId) return;
    setLoading(true);
    setErr('');
    try {
      const res = await jsonFetch<TraineeProfileResponse>(
        `${functionsBase()}/operations-data?entity=trainees&id=${encodeURIComponent(traineeId)}&include=enrollments`,
        { headers: getAuthHeaders() },
      );
      setData(res);
      setNotes(asText(res.item?.notes));
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not load trainee profile.');
    } finally {
      setLoading(false);
    }
  }, [traineeId]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveNotes = async () => {
    if (!data?.item) return;
    setMsg('');
    setSaving(true);
    try {
      const payload = { ...data.item, notes: notes.trim() || null };
      await jsonFetch(`${functionsBase()}/operations-data?entity=trainees`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      setMsg('Notes saved.');
      setData((prev) => (prev ? { ...prev, item: { ...(prev.item || {}), notes } } : prev));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Could not save notes.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-[var(--brand-muted)]">Loading trainee profile…</p>;
  if (err) return <p className="text-sm text-[var(--brand-danger)]">{err}</p>;
  if (!data?.item) return <p className="text-sm text-[var(--brand-muted)]">Trainee not found.</p>;

  const item = data.item;
  const fullName = asText(item.full_name) || 'Trainee';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--brand-text)]">{fullName}</h1>
          <p className="mt-1 text-sm text-[var(--brand-muted)]">
            {asText(item.trainee_id) || '—'} · {asText(item.phone) || '—'} · {asText(item.email) || '—'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" type="button" onClick={() => navigate('/operations/trainees')}>
            Back to trainees
          </Button>
          <Link to="/operations/enrollments">
            <Button type="button">+ Enroll</Button>
          </Link>
        </div>
      </div>

      <Card>
        <div className="grid gap-3 text-sm text-[var(--brand-muted)] md:grid-cols-3">
          <p>Type: <span className="font-medium text-[var(--brand-text)]">{asText(item.trainee_type) || '—'}</span></p>
          <p>City: <span className="font-medium text-[var(--brand-text)]">{asText(item.city) || '—'}</span></p>
          <p>Status: <span className="font-medium text-[var(--brand-text)]">{asText(item.status) || '—'}</span></p>
          <p>Company: <span className="font-medium text-[var(--brand-text)]">{asText(item.company_name) || '—'}</span></p>
          <p>Job title: <span className="font-medium text-[var(--brand-text)]">{asText(item.job_title) || '—'}</span></p>
          <p>University: <span className="font-medium text-[var(--brand-text)]">{asText(item.university) || '—'}</span></p>
        </div>
        <p className="mt-3 text-sm text-[var(--brand-muted)]">
          Total enrollments: <span className="font-medium text-[var(--brand-text)]">{data.summary?.enrollment_count ?? 0}</span> · Total paid:{' '}
          <span className="font-medium text-[var(--brand-text)]">EGP {data.summary?.total_paid ?? 0}</span>
        </p>
      </Card>

      <Card noPadding>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Course</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!data.enrollments.length ? (
              <TableRow>
                <TableCell colSpan={5}>This trainee has no enrollments yet.</TableCell>
              </TableRow>
            ) : (
              data.enrollments.map((r) => (
                <TableRow key={asText(r.id)}>
                  <TableCell>{asText(r.course_name) || asText(r.course_id) || '—'}</TableCell>
                  <TableCell>{asText(r.batch_name) || asText(r.batch_id) || '—'}</TableCell>
                  <TableCell>{asText(r.enrollment_status) || '—'}</TableCell>
                  <TableCell>{asText(r.payment_status) || '—'}</TableCell>
                  <TableCell>{r.amount_paid == null ? '—' : `EGP ${Number(r.amount_paid)}`}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-[var(--brand-text)]">Notes</h2>
        <div className="mt-3 space-y-3">
          <Textarea rows={5} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add internal notes about this trainee." />
          <div className="flex items-center gap-3">
            <Button type="button" loading={saving} onClick={() => void saveNotes()}>
              Save notes
            </Button>
            {msg ? <p className="text-sm text-[var(--brand-muted)]">{msg}</p> : null}
          </div>
        </div>
      </Card>
    </div>
  );
}
