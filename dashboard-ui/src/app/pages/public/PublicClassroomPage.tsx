import { useEffect, useState } from 'react';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { Input } from '../../components/design-system/Input';
import { functionsBase, jsonFetch } from '../../../lib/api';

type ClassroomData = {
  batch: { batch_name: string; course_name: string; trainer?: string | null };
  assignments: Array<{ id: string; title: string; instructions?: string | null; due_date?: string | null; attachments?: Array<{ id: string; title?: string | null; file_url: string }> }>;
  materials: Array<{ id: string; title: string; url: string; description?: string | null }>;
};

export function PublicClassroomPage({ token }: { token: string }) {
  const [data, setData] = useState<ClassroomData | null>(null);
  const [err, setErr] = useState('');
  const [subName, setSubName] = useState('');
  const [subEmail, setSubEmail] = useState('');
  const [subText, setSubText] = useState('');
  const [assignmentId, setAssignmentId] = useState('');
  const [reviewEmail, setReviewEmail] = useState('');
  const [reviewRows, setReviewRows] = useState<Array<{ submission_id: string; assignment_title: string; status: string; review?: { grade?: number | null; feedback?: string | null } | null }>>([]);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    let c = false;
    (async () => {
      try {
        const x = await jsonFetch<ClassroomData>(`${functionsBase()}/public-classroom?token=${encodeURIComponent(token)}`);
        if (!c) setData(x);
      } catch (e) {
        if (!c) setErr(e instanceof Error ? e.message : 'Could not load classroom');
      }
    })();
    return () => {
      c = true;
    };
  }, [token]);

  return (
    <div className="space-y-4">
      <Card>
        <h1 className="text-xl font-semibold text-[var(--brand-text)]">Public classroom</h1>
        {err ? <p className="mt-2 text-sm text-[var(--brand-danger)]">{err}</p> : null}
        {data ? (
          <p className="mt-2 text-sm text-[var(--brand-muted)]">
            {data.batch.batch_name || 'Batch'} · {data.batch.course_name || 'Course'}
          </p>
        ) : (
          <p className="mt-2 text-sm text-[var(--brand-muted)]">Loading…</p>
        )}
        {msg ? <p className="mt-2 text-sm text-[var(--brand-text)]">{msg}</p> : null}
      </Card>
      {data ? (
        <>
          <Card>
            <h2 className="text-lg font-semibold text-[var(--brand-text)]">Assignments</h2>
            <div className="mt-3 space-y-2">
              {data.assignments.map((a) => (
                <div key={a.id} className="rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] p-3">
                  <p className="font-medium text-[var(--brand-text)]">{a.title}</p>
                  {a.instructions ? <p className="text-sm text-[var(--brand-muted)]">{a.instructions}</p> : null}
                  {(a.attachments || []).length ? (
                    <div className="mt-2 space-y-1">
                      {(a.attachments || []).map((f) => (
                        <a key={f.id} className="block text-sm text-[var(--brand-primary)] underline" href={f.file_url} target="_blank" rel="noreferrer">
                          {f.title || 'Attachment'}
                        </a>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </Card>
          <Card className="space-y-3">
            <h2 className="text-lg font-semibold text-[var(--brand-text)]">Submit assignment</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--brand-text)]">Assignment</label>
                <select
                  className="w-full rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[var(--brand-surface)] px-4 py-2.5 text-[var(--brand-text)]"
                  value={assignmentId}
                  onChange={(e) => setAssignmentId(e.target.value)}
                >
                  <option value="">Select assignment</option>
                  {data.assignments.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title}
                    </option>
                  ))}
                </select>
              </div>
              <Input label="Name" value={subName} onChange={(e) => setSubName(e.target.value)} />
              <Input label="Email" type="email" value={subEmail} onChange={(e) => setSubEmail(e.target.value)} />
              <Input label="Submission text / link" value={subText} onChange={(e) => setSubText(e.target.value)} />
            </div>
            <Button
              type="button"
              onClick={() =>
                void (async () => {
                  setErr('');
                  setMsg('');
                  try {
                    await jsonFetch(`${functionsBase()}/public-classroom-submit`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        token,
                        assignment_id: assignmentId,
                        trainee_name: subName.trim(),
                        trainee_email: subEmail.trim(),
                        submission_text: subText.trim(),
                      }),
                    });
                    setMsg('Submission sent.');
                    setSubText('');
                  } catch (e) {
                    setErr(e instanceof Error ? e.message : 'Submit failed');
                  }
                })()
              }
            >
              Submit
            </Button>
          </Card>
          <Card className="space-y-3">
            <h2 className="text-lg font-semibold text-[var(--brand-text)]">Check your review</h2>
            <div className="flex flex-wrap items-end gap-2">
              <Input label="Email" type="email" value={reviewEmail} onChange={(e) => setReviewEmail(e.target.value)} />
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  void (async () => {
                    setErr('');
                    try {
                      const res = await jsonFetch<{ items: typeof reviewRows }>(`${functionsBase()}/public-classroom-review`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ token, email: reviewEmail.trim() }),
                      });
                      setReviewRows(res.items || []);
                    } catch (e) {
                      setErr(e instanceof Error ? e.message : 'Could not load reviews');
                    }
                  })()
                }
              >
                Check
              </Button>
            </div>
            <div className="space-y-2">
              {reviewRows.map((r) => (
                <div key={r.submission_id} className="rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] p-3">
                  <p className="font-medium text-[var(--brand-text)]">{r.assignment_title}</p>
                  <p className="text-sm text-[var(--brand-muted)]">Status: {r.status}</p>
                  {r.review ? (
                    <p className="text-sm text-[var(--brand-text)]">
                      Grade: {r.review.grade ?? '—'} {r.review.feedback ? `· ${r.review.feedback}` : ''}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <h2 className="text-lg font-semibold text-[var(--brand-text)]">Materials</h2>
            <div className="mt-3 space-y-2">
              {data.materials.map((m) => (
                <a
                  key={m.id}
                  href={m.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] p-3 hover:bg-[var(--brand-surface-2)]"
                >
                  <p className="font-medium text-[var(--brand-text)]">{m.title}</p>
                  {m.description ? <p className="text-sm text-[var(--brand-muted)]">{m.description}</p> : null}
                </a>
              ))}
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
}
