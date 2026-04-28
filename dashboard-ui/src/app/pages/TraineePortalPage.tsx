import { useEffect, useMemo, useState } from 'react';
import { Card } from '../components/design-system/Card';
import { Button } from '../components/design-system/Button';
import { Input, Textarea } from '../components/design-system/Input';
import { AUTH_ROLE, functionsBase, getAuthHeaders, jsonFetch } from '../../lib/api';

type TraineeMeResponse = {
  account: {
    email: string;
    must_change_password: boolean;
  } | null;
  trainee: {
    full_name?: string;
    email?: string;
    phone?: string;
    trainee_type?: string;
    city?: string;
    status?: string;
  } | null;
};

type TraineeCourse = {
  id: string;
  enrollment_id: string;
  batch_id: string;
  batch_name: string | null;
  course_id: string | null;
  course_name: string | null;
  classroom_token: string | null;
  enrollment_status: string | null;
  payment_status: string | null;
  amount_paid: number | null;
};

type Resource = {
  id: string;
  title: string;
  url: string;
  description?: string | null;
  mime_type?: string | null;
};

type Assignment = {
  id: string;
  title: string;
  instructions?: string | null;
  due_date?: string | null;
  my_submission?: {
    submission_text?: string | null;
    file_url?: string | null;
  } | null;
};

type TraineeClassroomResponse = {
  batch: {
    course_name?: string | null;
    batch_name?: string | null;
  } | null;
  assignments: Assignment[];
  materials: Resource[];
  course_library: {
    chapters: Array<{ id: string; title: string; materials: Resource[] }>;
    uncategorized: Resource[];
  };
};

function toMoney(v: number | null | undefined): string {
  if (v == null || Number.isNaN(Number(v))) return '—';
  return `EGP ${Number(v).toLocaleString()}`;
}

function fileTypeLabel(item: Resource): string {
  const raw = `${item.mime_type || ''} ${item.url || ''}`.toLowerCase();
  if (raw.includes('pdf')) return 'PDF';
  if (raw.includes('word') || raw.includes('.doc')) return 'Word';
  if (raw.includes('sheet') || raw.includes('excel') || raw.includes('.xls')) return 'Excel';
  if (raw.includes('powerpoint') || raw.includes('.ppt')) return 'Slides';
  if (raw.includes('video') || raw.includes('.mp4') || raw.includes('.mkv') || raw.includes('.mov')) return 'Video';
  if (raw.includes('audio') || raw.includes('.mp3') || raw.includes('.wav')) return 'Audio';
  return 'File';
}

export function TraineePortalPage() {
  const [me, setMe] = useState<TraineeMeResponse | null>(null);
  const [courses, setCourses] = useState<TraineeCourse[]>([]);
  const [activeBatchId, setActiveBatchId] = useState('');
  const [classroom, setClassroom] = useState<TraineeClassroomResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [classroomLoading, setClassroomLoading] = useState(false);
  const [err, setErr] = useState('');
  const [submissionBusy, setSubmissionBusy] = useState<Record<string, boolean>>({});
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' });
  const [passwordMsg, setPasswordMsg] = useState('');

  const isTrainee = String(localStorage.getItem(AUTH_ROLE) || '').toLowerCase() === 'trainee';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr('');
      try {
        const [meData, coursesData] = await Promise.all([
          jsonFetch<TraineeMeResponse>(`${functionsBase()}/trainee-me`, { headers: getAuthHeaders() }),
          jsonFetch<{ items: TraineeCourse[] }>(`${functionsBase()}/trainee-courses`, { headers: getAuthHeaders() }),
        ]);
        if (cancelled) return;
        setMe(meData);
        setCourses(coursesData.items || []);
        const firstBatch = (coursesData.items || [])[0]?.batch_id || '';
        setActiveBatchId(firstBatch);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'Could not load trainee portal.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!activeBatchId) {
      setClassroom(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setClassroomLoading(true);
      try {
        const data = await jsonFetch<TraineeClassroomResponse>(
          `${functionsBase()}/trainee-classroom?batch_id=${encodeURIComponent(activeBatchId)}`,
          { headers: getAuthHeaders() },
        );
        if (!cancelled) setClassroom(data);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'Could not load classroom.');
      } finally {
        if (!cancelled) setClassroomLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeBatchId]);

  const activeCourse = useMemo(() => courses.find((c) => c.batch_id === activeBatchId) || null, [courses, activeBatchId]);

  const saveSubmission = async (assignmentId: string, values: { text: string; file: File | null }) => {
    try {
      setSubmissionBusy((prev) => ({ ...prev, [assignmentId]: true }));
      let fileUrl: string | null = null;
      let fileStorageKey: string | null = null;
      if (values.file) {
        const up = await jsonFetch<{ uploadUrl: string; publicUrl: string; objectPath: string }>(
          `${functionsBase()}/trainee-submission-upload`,
          {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
              assignment_id: assignmentId,
              filename: values.file.name,
              contentType: values.file.type || 'application/octet-stream',
            }),
          },
        );
        const putRes = await fetch(up.uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': values.file.type || 'application/octet-stream' },
          body: values.file,
        });
        if (!putRes.ok) throw new Error('Could not upload submission file.');
        fileUrl = up.publicUrl;
        fileStorageKey = up.objectPath;
      }

      await jsonFetch(`${functionsBase()}/trainee-submissions`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          assignment_id: assignmentId,
          submission_text: values.text.trim() || null,
          file_url: fileUrl,
          file_storage_key: fileStorageKey,
        }),
      });

      const refreshed = await jsonFetch<TraineeClassroomResponse>(
        `${functionsBase()}/trainee-classroom?batch_id=${encodeURIComponent(activeBatchId)}`,
        { headers: getAuthHeaders() },
      );
      setClassroom(refreshed);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save submission.');
    } finally {
      setSubmissionBusy((prev) => ({ ...prev, [assignmentId]: false }));
    }
  };

  const updatePassword = async () => {
    setPasswordMsg('');
    if (passwordForm.next !== passwordForm.confirm) {
      setPasswordMsg('New password and confirmation do not match.');
      return;
    }
    try {
      await jsonFetch(`${functionsBase()}/trainee-change-password`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ currentPassword: passwordForm.current, newPassword: passwordForm.next }),
      });
      setPasswordForm({ current: '', next: '', confirm: '' });
      setPasswordMsg('Password updated successfully.');
      const refreshed = await jsonFetch<TraineeMeResponse>(`${functionsBase()}/trainee-me`, { headers: getAuthHeaders() });
      setMe(refreshed);
    } catch (e) {
      setPasswordMsg(e instanceof Error ? e.message : 'Could not update password.');
    }
  };

  if (!isTrainee) {
    return (
      <Card>
        <p className="text-sm text-[var(--brand-muted)]">This route is available for trainee accounts only.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--brand-text)]">Trainee portal</h1>
        <p className="mt-1 text-sm text-[var(--brand-muted)]">
          Assignments, classroom resources, and account updates in one place.
        </p>
      </div>

      {loading ? <p className="text-sm text-[var(--brand-muted)]">Loading portal…</p> : null}
      {err ? (
        <div className="rounded-lg border border-[var(--brand-danger)]/30 bg-[var(--brand-danger)]/10 p-3 text-sm text-[var(--brand-danger)]">
          {err}
        </div>
      ) : null}

      <Card>
        <h2 className="text-lg font-semibold text-[var(--brand-text)]">Welcome {me?.trainee?.full_name || me?.account?.email || 'Trainee'}</h2>
        <p className="mt-1 text-sm text-[var(--brand-muted)]">
          {me?.account?.must_change_password
            ? 'Security update required: change your temporary password now.'
            : 'Your account password is up to date.'}
        </p>
        <div className="mt-4 grid gap-3 text-sm text-[var(--brand-muted)] md:grid-cols-4">
          <p>Status: <span className="font-medium text-[var(--brand-text)]">{me?.trainee?.status || '—'}</span></p>
          <p>Type: <span className="font-medium text-[var(--brand-text)]">{me?.trainee?.trainee_type || '—'}</span></p>
          <p>City: <span className="font-medium text-[var(--brand-text)]">{me?.trainee?.city || '—'}</span></p>
          <p>Phone: <span className="font-medium text-[var(--brand-text)]">{me?.trainee?.phone || '—'}</span></p>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <h2 className="text-lg font-semibold text-[var(--brand-text)]">My courses</h2>
          <div className="mt-3 space-y-2">
            {!courses.length ? <p className="text-sm text-[var(--brand-muted)]">No enrollments are assigned yet.</p> : null}
            {courses.map((c) => {
              const active = c.batch_id === activeBatchId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActiveBatchId(c.batch_id)}
                  className={`w-full rounded-[var(--brand-radius-dense)] border p-3 text-left transition ${
                    active
                      ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/10'
                      : 'border-[var(--brand-border)] hover:border-[var(--brand-primary)]/40'
                  }`}
                >
                  <p className="font-medium text-[var(--brand-text)]">{c.course_name || c.course_id || 'Untitled course'}</p>
                  <p className="text-xs text-[var(--brand-muted)]">{c.batch_name || c.batch_id}</p>
                  <p className="mt-1 text-xs text-[var(--brand-muted)]">
                    {c.enrollment_status || '—'} · {c.payment_status || '—'} · {toMoney(c.amount_paid)}
                  </p>
                </button>
              );
            })}
          </div>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <h2 className="text-lg font-semibold text-[var(--brand-text)]">Classroom</h2>
            <p className="mt-1 text-sm text-[var(--brand-muted)]">
              {activeCourse?.course_name || classroom?.batch?.course_name || '—'} · {activeCourse?.batch_name || classroom?.batch?.batch_name || '—'}
            </p>
            {classroomLoading ? <p className="mt-3 text-sm text-[var(--brand-muted)]">Loading classroom…</p> : null}
            {!activeBatchId && !classroomLoading ? (
              <p className="mt-3 text-sm text-[var(--brand-muted)]">Select a course to view assignments and materials.</p>
            ) : null}
          </Card>

          <Card>
            <h3 className="text-base font-semibold text-[var(--brand-text)]">Assignments</h3>
            <div className="mt-3 space-y-4">
              {!classroom?.assignments?.length ? <p className="text-sm text-[var(--brand-muted)]">No assignments yet.</p> : null}
              {(classroom?.assignments || []).map((a) => (
                <AssignmentCard key={a.id} assignment={a} busy={Boolean(submissionBusy[a.id])} onSave={saveSubmission} />
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="text-base font-semibold text-[var(--brand-text)]">Batch materials</h3>
            <ResourceList items={classroom?.materials || []} />
          </Card>

          <Card>
            <h3 className="text-base font-semibold text-[var(--brand-text)]">Course library</h3>
            <ResourceList items={classroom?.course_library?.uncategorized || []} />
            <div className="mt-3 space-y-3">
              {(classroom?.course_library?.chapters || []).map((ch) => (
                <details key={ch.id} className="rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] p-3">
                  <summary className="cursor-pointer font-medium text-[var(--brand-text)]">{ch.title}</summary>
                  <div className="mt-3">
                    <ResourceList items={ch.materials || []} />
                  </div>
                </details>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <Card>
        <h2 className="text-lg font-semibold text-[var(--brand-text)]">Change password</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <Input
            label="Current password"
            type="password"
            value={passwordForm.current}
            onChange={(e) => setPasswordForm((p) => ({ ...p, current: e.target.value }))}
          />
          <Input
            label="New password"
            type="password"
            value={passwordForm.next}
            onChange={(e) => setPasswordForm((p) => ({ ...p, next: e.target.value }))}
          />
          <Input
            label="Confirm password"
            type="password"
            value={passwordForm.confirm}
            onChange={(e) => setPasswordForm((p) => ({ ...p, confirm: e.target.value }))}
          />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <Button type="button" onClick={() => void updatePassword()}>
            Save password
          </Button>
          {passwordMsg ? <p className="text-sm text-[var(--brand-muted)]">{passwordMsg}</p> : null}
        </div>
      </Card>
    </div>
  );
}

function ResourceList({ items }: { items: Resource[] }) {
  if (!items.length) return <p className="mt-2 text-sm text-[var(--brand-muted)]">No resources published yet.</p>;
  return (
    <ul className="mt-2 space-y-2">
      {items.map((m) => (
        <li key={m.id} className="rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] p-3">
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium text-[var(--brand-text)]">{m.title || 'Resource'}</p>
            <span className="rounded-full bg-[var(--brand-surface-2)] px-2 py-0.5 text-xs text-[var(--brand-muted)]">{fileTypeLabel(m)}</span>
          </div>
          {m.description ? <p className="mt-1 text-sm text-[var(--brand-muted)]">{m.description}</p> : null}
          <a className="mt-2 inline-block text-sm text-[var(--brand-primary)] hover:underline" href={m.url} target="_blank" rel="noreferrer">
            Open resource
          </a>
        </li>
      ))}
    </ul>
  );
}

function AssignmentCard({
  assignment,
  busy,
  onSave,
}: {
  assignment: Assignment;
  busy: boolean;
  onSave: (assignmentId: string, values: { text: string; file: File | null }) => Promise<void>;
}) {
  const [text, setText] = useState(assignment.my_submission?.submission_text || '');
  const [file, setFile] = useState<File | null>(null);
  return (
    <article className="rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] p-4">
      <h4 className="font-semibold text-[var(--brand-text)]">{assignment.title}</h4>
      {assignment.instructions ? <p className="mt-1 text-sm text-[var(--brand-muted)]">{assignment.instructions}</p> : null}
      <p className="mt-1 text-xs text-[var(--brand-muted)]">Due: {assignment.due_date || 'No deadline'}</p>
      <div className="mt-3 space-y-3">
        <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Write your answer" rows={4} />
        <input
          type="file"
          onChange={(e) => {
            const next = e.target.files && e.target.files[0] ? e.target.files[0] : null;
            setFile(next);
          }}
        />
        {assignment.my_submission?.file_url ? (
          <a className="inline-block text-xs text-[var(--brand-primary)] hover:underline" href={assignment.my_submission.file_url} target="_blank" rel="noreferrer">
            Open current uploaded file
          </a>
        ) : null}
        <Button type="button" loading={busy} onClick={() => void onSave(assignment.id, { text, file })}>
          Save submission
        </Button>
      </div>
    </article>
  );
}
