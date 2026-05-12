import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { Input, Textarea } from '../../components/design-system/Input';
import { Badge } from '../../components/design-system/Badge';
import { AUTH_ROLE, functionsBase, getAuthHeaders, jsonFetch } from '../../../lib/api';

type ClassroomRow = {
  batch_id: string;
  batch_name: string | null;
  course_id: string | null;
  course_name: string;
  trainer: string | null;
  enrolled_count: number;
};

type AssignmentRow = {
  id: string;
  batch_id: string;
  title: string;
  instructions?: string | null;
  due_date?: string | null;
  created_at?: string | null;
};

type AssignmentFileRow = {
  id: string;
  assignment_id: string;
  title?: string | null;
  file_url: string;
  file_storage_key: string;
  mime_type?: string | null;
  file_size_bytes?: number | null;
};

type SubmissionReview = {
  id?: string;
  grade?: number | null;
  feedback?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
} | null;

type SubmissionRow = {
  id: string;
  assignment_id: string;
  trainee_name?: string | null;
  trainee_email?: string | null;
  trainee_id?: string | null;
  submission_text?: string | null;
  file_url?: string | null;
  status: string;
  submitted_at?: string | null;
  review?: SubmissionReview;
};

const ASSIGNMENT_FILE_ACCEPT =
  '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.mp4,.webm,.mov,.mkv,.avi,.m4v,.mp3,.wav,.m4a,.aac,.ogg,.flac';

type SignedUploadResponse = { signedUrl: string; publicUrl: string; path: string };

function staffRoleOk(): boolean {
  const r = String(localStorage.getItem(AUTH_ROLE) || '').toLowerCase();
  return r === 'admin' || r === 'trainer';
}

export function TrainingAssignmentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState<ClassroomRow[]>([]);
  const [batchId, setBatchId] = useState('');
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [files, setFiles] = useState<AssignmentFileRow[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [loadingClassrooms, setLoadingClassrooms] = useState(true);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  const [reviewSubject, setReviewSubject] = useState<SubmissionRow | null>(null);

  const [newTitle, setNewTitle] = useState('');
  const [newInstructions, setNewInstructions] = useState('');
  const [newDue, setNewDue] = useState('');

  const [editTitle, setEditTitle] = useState('');
  const [editInstructions, setEditInstructions] = useState('');
  const [editDue, setEditDue] = useState('');

  const [trainerFileTitle, setTrainerFileTitle] = useState('');
  const [trainerFile, setTrainerFile] = useState<File | null>(null);
  const [trainerFileKey, setTrainerFileKey] = useState(0);
  const [busyFile, setBusyFile] = useState(false);

  const [reviewGrade, setReviewGrade] = useState('');
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [reviewBusy, setReviewBusy] = useState(false);

  const selected = useMemo(() => assignments.find((a) => a.id === selectedId) || null, [assignments, selectedId]);

  useEffect(() => {
    const q = String(searchParams.get('batch') || '').trim();
    if (q) setBatchId((prev) => (prev === q ? prev : q));
  }, [searchParams]);

  useEffect(() => {
    let c = false;
    (async () => {
      if (!staffRoleOk()) return;
      setLoadingClassrooms(true);
      try {
        const data = await jsonFetch<{ items: ClassroomRow[] }>(`${functionsBase()}/classroom-data?resource=classrooms`, {
          headers: getAuthHeaders(),
        });
        if (!c) setRows(data.items || []);
      } catch (e) {
        if (!c) setErr(e instanceof Error ? e.message : 'Failed to load classrooms');
      } finally {
        if (!c) setLoadingClassrooms(false);
      }
    })();
    return () => { c = true; };
  }, []);

  const loadAssignments = useCallback(async (bid: string) => {
    if (!bid) { setAssignments([]); return; }
    setLoadingAssignments(true);
    setErr('');
    try {
      const data = await jsonFetch<{ items: AssignmentRow[] }>(
        `${functionsBase()}/classroom-data?resource=assignments&batch_id=${encodeURIComponent(bid)}`,
        { headers: getAuthHeaders() },
      );
      setAssignments(data.items || []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not load assignments');
      setAssignments([]);
    } finally {
      setLoadingAssignments(false);
    }
  }, []);

  useEffect(() => { void loadAssignments(batchId); }, [batchId, loadAssignments]);

  const loadDetail = useCallback(async (assignmentId: string) => {
    if (!assignmentId) { setFiles([]); setSubmissions([]); return; }
    setLoadingDetail(true);
    setErr('');
    try {
      const [f, s] = await Promise.all([
        jsonFetch<{ items: AssignmentFileRow[] }>(
          `${functionsBase()}/classroom-data?resource=assignment-files&assignment_id=${encodeURIComponent(assignmentId)}`,
          { headers: getAuthHeaders() },
        ),
        jsonFetch<{ items: SubmissionRow[] }>(
          `${functionsBase()}/classroom-data?resource=submissions&assignment_id=${encodeURIComponent(assignmentId)}`,
          { headers: getAuthHeaders() },
        ),
      ]);
      setFiles(f.items || []);
      setSubmissions(s.items || []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not load assignment detail');
      setFiles([]); setSubmissions([]);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
    else { setFiles([]); setSubmissions([]); }
  }, [selectedId, loadDetail]);

  useEffect(() => {
    if (selected) {
      setEditTitle(selected.title);
      setEditInstructions(selected.instructions || '');
      setEditDue(selected.due_date ? String(selected.due_date).slice(0, 10) : '');
    }
  }, [selected]);

  const onBatchChange = (next: string) => {
    setBatchId(next); setSelectedId(''); setSearchParams(next ? { batch: next } : {}); setMsg('');
  };

  const createAssignment = async () => {
    if (!batchId || !newTitle.trim()) return;
    setErr(''); setMsg('');
    try {
      await jsonFetch(`${functionsBase()}/classroom-data?resource=assignments`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ batch_id: batchId, title: newTitle.trim(), instructions: newInstructions.trim() || null, due_date: newDue.trim() || null }),
      });
      setNewTitle(''); setNewInstructions(''); setNewDue('');
      setShowNewForm(false); setMsg('Assignment created.');
      await loadAssignments(batchId);
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not create assignment'); }
  };

  const saveAssignment = async () => {
    if (!selectedId || !editTitle.trim()) return;
    setErr(''); setMsg('');
    try {
      await jsonFetch(`${functionsBase()}/classroom-data?resource=assignments&id=${encodeURIComponent(selectedId)}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ title: editTitle.trim(), instructions: editInstructions.trim() || null, due_date: editDue.trim() || null }),
      });
      setMsg('Saved.'); await loadAssignments(batchId);
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not update assignment'); }
  };

  const removeAssignment = async () => {
    if (!selectedId || !window.confirm('Delete this assignment?')) return;
    setErr(''); setMsg('');
    try {
      await jsonFetch(`${functionsBase()}/classroom-data?resource=assignments&id=${encodeURIComponent(selectedId)}`, {
        method: 'DELETE', headers: getAuthHeaders(),
      });
      setSelectedId(''); setMsg('Deleted.'); await loadAssignments(batchId);
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not delete assignment'); }
  };

  const uploadTrainerAttachment = async () => {
    if (!selectedId || !trainerFile) return;
    setBusyFile(true); setErr(''); setMsg('');
    try {
      const prep = await jsonFetch<SignedUploadResponse>(`${functionsBase()}/classroom-assignment-upload`, {
        method: 'POST', headers: getAuthHeaders(),
        body: JSON.stringify({ assignment_id: selectedId, filename: trainerFile.name, contentType: trainerFile.type || 'application/octet-stream' }),
      });
      const putRes = await fetch(prep.signedUrl, { method: 'PUT', headers: { 'Content-Type': trainerFile.type || 'application/octet-stream' }, body: trainerFile });
      if (!putRes.ok) throw new Error(`Upload failed (${putRes.status})`);
      await jsonFetch(`${functionsBase()}/classroom-data?resource=assignment-files`, {
        method: 'POST', headers: getAuthHeaders(),
        body: JSON.stringify({ assignment_id: selectedId, title: trainerFileTitle.trim() || trainerFile.name, file_url: prep.publicUrl, file_storage_key: prep.path, mime_type: trainerFile.type || null, file_size_bytes: trainerFile.size || null }),
      });
      setTrainerFileTitle(''); setTrainerFile(null); setTrainerFileKey((k) => k + 1);
      setMsg('File attached.'); await loadDetail(selectedId);
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not upload file'); }
    finally { setBusyFile(false); }
  };

  const removeTrainerFile = async (fileId: string) => {
    setErr('');
    try {
      await jsonFetch(`${functionsBase()}/classroom-data?resource=assignment-files&id=${encodeURIComponent(fileId)}`, {
        method: 'DELETE', headers: getAuthHeaders(),
      });
      await loadDetail(selectedId);
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not remove file'); }
  };

  const openReview = (sub: SubmissionRow) => {
    setReviewSubject(sub);
    setReviewGrade(sub.review?.grade != null ? String(sub.review.grade) : '');
    setReviewFeedback(sub.review?.feedback || '');
  };

  const saveReview = async () => {
    if (!reviewSubject) return;
    setReviewBusy(true); setErr('');
    try {
      await jsonFetch(`${functionsBase()}/classroom-data?resource=submissions&id=${encodeURIComponent(reviewSubject.id)}`, {
        method: 'PATCH', headers: getAuthHeaders(),
        body: JSON.stringify({ grade: reviewGrade.trim() === '' ? null : Number(reviewGrade), feedback: reviewFeedback.trim() || null }),
      });
      setReviewSubject(null); setMsg('Review saved.'); await loadDetail(selectedId);
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not save review'); }
    finally { setReviewBusy(false); }
  };

  if (!staffRoleOk()) {
    return (
      <Card>
        <p className="text-sm text-[var(--brand-muted)]">Assignments and submission review are available for trainer and admin accounts.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {err ? <p className="rounded-lg border border-[var(--brand-danger)]/30 bg-[var(--brand-danger)]/10 px-3 py-2 text-sm text-[var(--brand-danger)]">{err}</p> : null}
      {msg ? <p className="rounded-lg border border-[var(--brand-success)]/30 bg-[var(--brand-success)]/10 px-3 py-2 text-sm text-[var(--brand-success)]">{msg}</p> : null}

      {/* Batch + action bar */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <label className="mb-1 block text-xs font-medium text-[var(--brand-muted)]">Learning Path / Batch</label>
          <select
            className="w-full max-w-sm rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-sm text-[var(--brand-text)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-focus-ring)]"
            value={batchId}
            onChange={(e) => onBatchChange(e.target.value)}
          >
            <option value="">{loadingClassrooms ? 'Loading…' : 'Select batch…'}</option>
            {rows.map((r) => (
              <option key={r.batch_id} value={r.batch_id}>
                {r.batch_name || r.batch_id} · {r.course_name || r.course_id || 'Course'}
              </option>
            ))}
          </select>
        </div>
        {batchId && (
          <Button type="button" variant="primary" size="sm" onClick={() => setShowNewForm((v) => !v)}>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Assignment
          </Button>
        )}
      </div>

      {/* New assignment form (collapsible) */}
      {showNewForm && (
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--brand-text)]">New Assignment</h3>
            <button type="button" onClick={() => setShowNewForm(false)} className="text-[var(--brand-dim)] hover:text-[var(--brand-text)]">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} required />
            <Input label="Due date" type="date" value={newDue} onChange={(e) => setNewDue(e.target.value)} />
            <div className="sm:col-span-2">
              <Textarea label="Instructions" value={newInstructions} onChange={(e) => setNewInstructions(e.target.value)} rows={3} />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button type="button" onClick={() => void createAssignment()} disabled={!newTitle.trim()}>Add assignment</Button>
            <Button type="button" variant="secondary" onClick={() => setShowNewForm(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      {/* Split pane: list | detail */}
      {batchId && (
        <div className={`grid gap-4 ${selectedId ? 'lg:grid-cols-[320px,1fr]' : 'grid-cols-1'}`}>
          {/* LEFT — assignment list */}
          <div className="space-y-1">
            {loadingAssignments ? (
              <div className="space-y-1">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 animate-pulse rounded-[var(--brand-radius-dense)] bg-[var(--brand-surface)]" />
                ))}
              </div>
            ) : assignments.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-[var(--brand-radius)] border border-[var(--brand-border)] bg-[var(--brand-surface)] py-10 text-center">
                <p className="text-sm text-[var(--brand-muted)]">No assignments yet.</p>
                <Button type="button" size="sm" variant="secondary" onClick={() => setShowNewForm(true)}>Create first assignment</Button>
              </div>
            ) : (
              assignments.map((a) => {
                const isActive = a.id === selectedId;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => { setSelectedId(a.id); setMsg(''); }}
                    className={`w-full rounded-[var(--brand-radius-dense)] border px-3 py-3 text-left transition-all duration-100 ${
                      isActive
                        ? 'border-[var(--brand-primary)]/40 bg-[var(--brand-primary-subtle)]'
                        : 'border-[var(--brand-border)] bg-[var(--brand-surface)] hover:bg-[var(--brand-surface-2)]'
                    }`}
                  >
                    <p className={`text-sm font-medium leading-snug ${isActive ? 'text-[var(--brand-primary-2)]' : 'text-[var(--brand-text)]'}`}>
                      {a.title}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--brand-muted)]">
                      Due: {a.due_date || 'No date'}
                    </p>
                  </button>
                );
              })
            )}
          </div>

          {/* RIGHT — assignment detail */}
          {selectedId && selected && (
            <div className="space-y-4 min-w-0">
              {/* Edit panel */}
              <Card>
                <div className="mb-4 flex items-start justify-between gap-2">
                  <h2 className="text-sm font-semibold text-[var(--brand-text)]">{selected.title}</h2>
                  <button
                    type="button"
                    onClick={() => setSelectedId('')}
                    className="shrink-0 text-[var(--brand-dim)] hover:text-[var(--brand-text)]"
                    aria-label="Close"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                {loadingDetail ? (
                  <div className="space-y-2">
                    <div className="h-9 animate-pulse rounded bg-[var(--brand-surface-2)]" />
                    <div className="h-20 animate-pulse rounded bg-[var(--brand-surface-2)]" />
                  </div>
                ) : (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input label="Title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                      <Input label="Due date" type="date" value={editDue} onChange={(e) => setEditDue(e.target.value)} />
                      <div className="sm:col-span-2">
                        <Textarea label="Instructions" value={editInstructions} onChange={(e) => setEditInstructions(e.target.value)} rows={3} />
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button type="button" size="sm" onClick={() => void saveAssignment()} disabled={!editTitle.trim()}>Save changes</Button>
                      <Button type="button" size="sm" variant="danger" onClick={() => void removeAssignment()}>Delete</Button>
                    </div>
                  </>
                )}
              </Card>

              {/* Attachments */}
              <Card>
                <h3 className="mb-3 text-sm font-semibold text-[var(--brand-text)]">Trainer Attachments</h3>
                {files.length > 0 ? (
                  <ul className="mb-3 space-y-1.5">
                    {files.map((f) => (
                      <li key={f.id} className="flex items-center justify-between gap-2 rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] px-3 py-2">
                        <a className="truncate text-sm text-[var(--brand-primary)] underline" href={f.file_url} target="_blank" rel="noreferrer">
                          {f.title || 'File'}
                        </a>
                        <button type="button" onClick={() => void removeTrainerFile(f.id)} className="shrink-0 text-xs text-[var(--brand-danger)] hover:underline">Remove</button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mb-3 text-xs text-[var(--brand-muted)]">No files attached.</p>
                )}
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input label="Attachment title (optional)" value={trainerFileTitle} onChange={(e) => setTrainerFileTitle(e.target.value)} />
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--brand-muted)]">File</label>
                    <input key={trainerFileKey} type="file" accept={ASSIGNMENT_FILE_ACCEPT} onChange={(e) => setTrainerFile(e.target.files?.[0] || null)} className="text-sm text-[var(--brand-text)]" />
                  </div>
                </div>
                <Button type="button" size="sm" className="mt-2" loading={busyFile} onClick={() => void uploadTrainerAttachment()} disabled={!trainerFile}>
                  Upload attachment
                </Button>
              </Card>

              {/* Submissions table */}
              <Card noPadding>
                <div className="flex items-center justify-between px-4 py-3">
                  <h3 className="text-sm font-semibold text-[var(--brand-text)]">Submissions</h3>
                  <Badge variant="neutral">{submissions.length}</Badge>
                </div>
                {loadingDetail ? (
                  <div className="p-4">
                    <div className="h-20 animate-pulse rounded bg-[var(--brand-surface-2)]" />
                  </div>
                ) : submissions.length === 0 ? (
                  <p className="px-4 pb-4 text-sm text-[var(--brand-muted)]">No submissions yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-t border-[var(--brand-border)] bg-[var(--brand-surface-2)]">
                          <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-[var(--brand-dim)]">Student</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-[var(--brand-dim)]">Submitted</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-[var(--brand-dim)]">Status</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-[var(--brand-dim)]">Grade</th>
                          <th className="px-4 py-2" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--brand-border)]">
                        {submissions.map((s) => (
                          <tr key={s.id} className="hover:bg-[var(--brand-surface-2)]">
                            <td className="px-4 py-2.5">
                              <p className="font-medium text-[var(--brand-text)]">{s.trainee_name || 'Trainee'}</p>
                              <p className="text-xs text-[var(--brand-muted)]">{s.trainee_email || ''}</p>
                            </td>
                            <td className="px-4 py-2.5 text-xs text-[var(--brand-muted)]">{s.submitted_at || '—'}</td>
                            <td className="px-4 py-2.5">
                              <Badge variant={s.status === 'reviewed' ? 'success' : 'neutral'}>{s.status}</Badge>
                            </td>
                            <td className="px-4 py-2.5 text-sm text-[var(--brand-text)]">
                              {s.review?.grade != null ? s.review.grade : '—'}
                            </td>
                            <td className="px-4 py-2.5">
                              <Button type="button" size="sm" variant="secondary" onClick={() => openReview(s)}>Review</Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Review modal */}
      {reviewSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setReviewSubject(null)}>
          <div className="w-full max-w-md rounded-[var(--brand-radius)] border border-[var(--brand-border)] bg-[var(--brand-surface)] shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between border-b border-[var(--brand-border)] px-5 py-4">
              <div>
                <h3 className="font-semibold text-[var(--brand-text)]">Review Submission</h3>
                <p className="text-xs text-[var(--brand-muted)]">{reviewSubject.trainee_name} · {reviewSubject.submitted_at || ''}</p>
              </div>
              <button type="button" onClick={() => setReviewSubject(null)} className="text-[var(--brand-dim)] hover:text-[var(--brand-text)]">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-3 p-5">
              {reviewSubject.submission_text && (
                <div>
                  <p className="mb-1 text-xs font-medium text-[var(--brand-muted)]">Submission text</p>
                  <p className="text-sm text-[var(--brand-text)]">{reviewSubject.submission_text}</p>
                </div>
              )}
              {reviewSubject.file_url && (
                <a href={reviewSubject.file_url} target="_blank" rel="noreferrer" className="inline-block text-sm text-[var(--brand-primary)] underline">
                  Download submitted file
                </a>
              )}
              <Input label="Grade" value={reviewGrade} onChange={(e) => setReviewGrade(e.target.value)} placeholder="0–100" />
              <Textarea label="Feedback" rows={3} value={reviewFeedback} onChange={(e) => setReviewFeedback(e.target.value)} placeholder="Write feedback for the student…" />
            </div>
            <div className="flex justify-end gap-2 border-t border-[var(--brand-border)] px-5 py-3">
              <Button type="button" variant="secondary" size="sm" onClick={() => setReviewSubject(null)}>Cancel</Button>
              <Button type="button" size="sm" loading={reviewBusy} onClick={() => void saveReview()}>Save Review</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
