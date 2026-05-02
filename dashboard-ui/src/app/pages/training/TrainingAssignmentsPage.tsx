import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { Input, Textarea } from '../../components/design-system/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/design-system/Table';
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

type SignedUploadResponse = {
  signedUrl: string;
  publicUrl: string;
  path: string;
};

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

  const [reviewDraft, setReviewDraft] = useState<Record<string, { grade: string; feedback: string }>>({});
  const [reviewBusy, setReviewBusy] = useState<Record<string, boolean>>({});

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
    return () => {
      c = true;
    };
  }, []);

  const loadAssignments = useCallback(async (bid: string) => {
    if (!bid) {
      setAssignments([]);
      return;
    }
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

  useEffect(() => {
    void loadAssignments(batchId);
  }, [batchId, loadAssignments]);

  const loadDetail = useCallback(async (assignmentId: string) => {
    if (!assignmentId) {
      setFiles([]);
      setSubmissions([]);
      return;
    }
    setLoadingDetail(true);
    setErr('');
    try {
      const [f, s] = await Promise.all([
        jsonFetch<{ items: AssignmentFileRow[] }>(
          `${functionsBase()}/classroom-data?resource=assignment-files&assignment_id=${encodeURIComponent(assignmentId)}`,
          { headers: getAuthHeaders() },
        ),
        jsonFetch<{ items: SubmissionRow[]; assignment?: unknown }>(
          `${functionsBase()}/classroom-data?resource=submissions&assignment_id=${encodeURIComponent(assignmentId)}`,
          { headers: getAuthHeaders() },
        ),
      ]);
      setFiles(f.items || []);
      setSubmissions(s.items || []);
      const drafts: Record<string, { grade: string; feedback: string }> = {};
      (s.items || []).forEach((row) => {
        drafts[row.id] = {
          grade: row.review?.grade != null && !Number.isNaN(Number(row.review.grade)) ? String(row.review.grade) : '',
          feedback: row.review?.feedback != null ? String(row.review.feedback) : '',
        };
      });
      setReviewDraft(drafts);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not load assignment detail');
      setFiles([]);
      setSubmissions([]);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
    else {
      setFiles([]);
      setSubmissions([]);
    }
  }, [selectedId, loadDetail]);

  useEffect(() => {
    if (selected) {
      setEditTitle(selected.title);
      setEditInstructions(selected.instructions || '');
      setEditDue(selected.due_date ? String(selected.due_date).slice(0, 10) : '');
    } else {
      setEditTitle('');
      setEditInstructions('');
      setEditDue('');
    }
  }, [selected]);

  const onBatchChange = (next: string) => {
    setBatchId(next);
    setSelectedId('');
    setSearchParams(next ? { batch: next } : {});
    setMsg('');
  };

  const createAssignment = async () => {
    if (!batchId || !newTitle.trim()) return;
    setErr('');
    setMsg('');
    try {
      await jsonFetch(`${functionsBase()}/classroom-data?resource=assignments`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          batch_id: batchId,
          title: newTitle.trim(),
          instructions: newInstructions.trim() || null,
          due_date: newDue.trim() || null,
        }),
      });
      setNewTitle('');
      setNewInstructions('');
      setNewDue('');
      setMsg('Assignment created.');
      await loadAssignments(batchId);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not create assignment');
    }
  };

  const saveAssignment = async () => {
    if (!selectedId || !editTitle.trim()) return;
    setErr('');
    setMsg('');
    try {
      await jsonFetch(`${functionsBase()}/classroom-data?resource=assignments&id=${encodeURIComponent(selectedId)}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          title: editTitle.trim(),
          instructions: editInstructions.trim() || null,
          due_date: editDue.trim() || null,
        }),
      });
      setMsg('Assignment updated.');
      await loadAssignments(batchId);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not update assignment');
    }
  };

  const removeAssignment = async () => {
    if (!selectedId) return;
    if (!window.confirm('Delete this assignment and related files metadata?')) return;
    setErr('');
    setMsg('');
    try {
      await jsonFetch(`${functionsBase()}/classroom-data?resource=assignments&id=${encodeURIComponent(selectedId)}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      setSelectedId('');
      setMsg('Assignment deleted.');
      await loadAssignments(batchId);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not delete assignment');
    }
  };

  const uploadTrainerAttachment = async () => {
    if (!selectedId || !trainerFile) return;
    setBusyFile(true);
    setErr('');
    setMsg('');
    try {
      const prep = await jsonFetch<SignedUploadResponse>(`${functionsBase()}/classroom-assignment-upload`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          assignment_id: selectedId,
          filename: trainerFile.name,
          contentType: trainerFile.type || 'application/octet-stream',
        }),
      });
      const putRes = await fetch(prep.signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': trainerFile.type || 'application/octet-stream' },
        body: trainerFile,
      });
      if (!putRes.ok) throw new Error(`Upload failed (${putRes.status})`);
      await jsonFetch(`${functionsBase()}/classroom-data?resource=assignment-files`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          assignment_id: selectedId,
          title: trainerFileTitle.trim() || trainerFile.name,
          file_url: prep.publicUrl,
          file_storage_key: prep.path,
          mime_type: trainerFile.type || null,
          file_size_bytes: trainerFile.size || null,
        }),
      });
      setTrainerFileTitle('');
      setTrainerFile(null);
      setTrainerFileKey((k) => k + 1);
      setMsg('File attached to assignment.');
      await loadDetail(selectedId);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not upload file');
    } finally {
      setBusyFile(false);
    }
  };

  const removeTrainerFile = async (fileId: string) => {
    setErr('');
    try {
      await jsonFetch(`${functionsBase()}/classroom-data?resource=assignment-files&id=${encodeURIComponent(fileId)}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      setMsg('Attachment removed.');
      await loadDetail(selectedId);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not remove file');
    }
  };

  const saveReview = async (submissionId: string) => {
    const d = reviewDraft[submissionId] || { grade: '', feedback: '' };
    setReviewBusy((prev) => ({ ...prev, [submissionId]: true }));
    setErr('');
    try {
      await jsonFetch(`${functionsBase()}/classroom-data?resource=submissions&id=${encodeURIComponent(submissionId)}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          grade: d.grade.trim() === '' ? null : Number(d.grade),
          feedback: d.feedback.trim() || null,
        }),
      });
      setMsg('Review saved.');
      await loadDetail(selectedId);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save review');
    } finally {
      setReviewBusy((prev) => ({ ...prev, [submissionId]: false }));
    }
  };

  if (!staffRoleOk()) {
    return (
      <Card>
        <p className="text-sm text-[var(--brand-muted)]">Assignments and submission review are available for trainer and admin accounts.</p>
      </Card>
    );
  }

  const batchOptions = [{ value: '', label: 'Select batch…' }].concat(
    rows.map((r) => ({
      value: r.batch_id,
      label: `${r.batch_name || r.batch_id} · ${r.course_name || r.course_id || 'Course'}`,
    })),
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--brand-muted)]">
        Create assignments, attach trainer files, and review trainee submissions for each batch. Uses the same APIs as the legacy trainer classroom.
      </p>
      {err ? <p className="text-sm text-[var(--brand-danger)]">{err}</p> : null}
      {msg ? <p className="text-sm text-[var(--brand-text)]">{msg}</p> : null}

      <Card>
        <h2 className="text-lg font-semibold text-[var(--brand-text)]">Batch</h2>
        {loadingClassrooms ? <p className="mt-2 text-sm text-[var(--brand-muted)]">Loading classrooms…</p> : null}
        <div className="mt-3 max-w-xl">
          <label className="mb-1.5 block text-sm font-medium text-[var(--brand-text)]">Classroom batch</label>
          <select
            className="w-full rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[var(--brand-surface)] px-4 py-2.5 text-[var(--brand-text)]"
            value={batchId}
            onChange={(e) => onBatchChange(e.target.value)}
          >
            {batchOptions.map((o) => (
              <option key={o.value || 'empty'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {batchId ? (
        <>
          <Card>
            <h2 className="text-lg font-semibold text-[var(--brand-text)]">New assignment</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <Input label="Title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} required />
              <Input label="Due date" type="date" value={newDue} onChange={(e) => setNewDue(e.target.value)} />
              <div className="md:col-span-2">
                <Textarea label="Instructions" value={newInstructions} onChange={(e) => setNewInstructions(e.target.value)} rows={3} />
              </div>
            </div>
            <div className="mt-3">
              <Button type="button" onClick={() => void createAssignment()} disabled={!newTitle.trim()}>
                Add assignment
              </Button>
            </div>
          </Card>

          <Card noPadding>
            <div className="p-4">
              <h2 className="text-lg font-semibold text-[var(--brand-text)]">Assignments in this batch</h2>
              {loadingAssignments ? <p className="mt-2 text-sm text-[var(--brand-muted)]">Loading…</p> : null}
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {!assignments.length && !loadingAssignments ? (
                  <TableRow>
                    <TableCell colSpan={3}>
                      <p className="text-sm text-[var(--brand-muted)]">No assignments yet.</p>
                    </TableCell>
                  </TableRow>
                ) : null}
                {assignments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <span className="font-medium text-[var(--brand-text)]">{a.title}</span>
                      {a.instructions ? <p className="mt-1 line-clamp-2 text-xs text-[var(--brand-muted)]">{a.instructions}</p> : null}
                    </TableCell>
                    <TableCell className="text-sm text-[var(--brand-muted)]">{a.due_date || '—'}</TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        size="sm"
                        variant={selectedId === a.id ? 'primary' : 'secondary'}
                        onClick={() => {
                          setSelectedId(a.id);
                          setMsg('');
                        }}
                      >
                        {selectedId === a.id ? 'Selected' : 'Manage'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {selectedId && selected ? (
            <Card className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h2 className="text-lg font-semibold text-[var(--brand-text)]">Edit: {selected.title}</h2>
                <Badge variant="neutral">{selectedId}</Badge>
              </div>
              {loadingDetail ? <p className="text-sm text-[var(--brand-muted)]">Loading details…</p> : null}
              <div className="grid gap-3 md:grid-cols-2">
                <Input label="Title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                <Input label="Due date" type="date" value={editDue} onChange={(e) => setEditDue(e.target.value)} />
                <div className="md:col-span-2">
                  <Textarea label="Instructions" value={editInstructions} onChange={(e) => setEditInstructions(e.target.value)} rows={4} />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => void saveAssignment()} disabled={!editTitle.trim()}>
                  Save changes
                </Button>
                <Button type="button" variant="secondary" onClick={() => void removeAssignment()}>
                  Delete assignment
                </Button>
              </div>

              <div className="border-t border-[var(--brand-border)] pt-4">
                <h3 className="text-base font-semibold text-[var(--brand-text)]">Trainer attachments</h3>
                <ul className="mt-2 space-y-2">
                  {files.map((f) => (
                    <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] p-2">
                      <a className="text-sm text-[var(--brand-primary)] underline" href={f.file_url} target="_blank" rel="noreferrer">
                        {f.title || 'File'}
                      </a>
                      <Button type="button" size="sm" variant="secondary" onClick={() => void removeTrainerFile(f.id)}>
                        Remove
                      </Button>
                    </li>
                  ))}
                  {!files.length ? <p className="text-sm text-[var(--brand-muted)]">No files attached.</p> : null}
                </ul>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <Input label="Attachment title (optional)" value={trainerFileTitle} onChange={(e) => setTrainerFileTitle(e.target.value)} />
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[var(--brand-text)]">File</label>
                    <input
                      key={trainerFileKey}
                      type="file"
                      accept={ASSIGNMENT_FILE_ACCEPT}
                      onChange={(e) => setTrainerFile(e.target.files?.[0] || null)}
                      className="text-sm text-[var(--brand-text)]"
                    />
                  </div>
                </div>
                <Button type="button" className="mt-2" loading={busyFile} onClick={() => void uploadTrainerAttachment()} disabled={!trainerFile}>
                  Upload attachment
                </Button>
              </div>

              <div className="border-t border-[var(--brand-border)] pt-4">
                <h3 className="text-base font-semibold text-[var(--brand-text)]">Submissions</h3>
                <div className="mt-3 space-y-4">
                  {!submissions.length ? <p className="text-sm text-[var(--brand-muted)]">No submissions yet.</p> : null}
                  {submissions.map((s) => (
                    <Fragment key={s.id}>
                      <div className="rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-medium text-[var(--brand-text)]">{s.trainee_name || 'Trainee'}</p>
                          <Badge variant={s.status === 'reviewed' ? 'success' : 'neutral'}>{s.status}</Badge>
                        </div>
                        <p className="text-xs text-[var(--brand-muted)]">{s.trainee_email || '—'} · {s.submitted_at || ''}</p>
                        {s.submission_text ? <p className="mt-2 text-sm text-[var(--brand-text)]">{s.submission_text}</p> : null}
                        {s.file_url ? (
                          <a className="mt-1 inline-block text-sm text-[var(--brand-primary)] underline" href={s.file_url} target="_blank" rel="noreferrer">
                            Download submitted file
                          </a>
                        ) : null}
                        <div className="mt-3 grid gap-2 md:grid-cols-2">
                          <Input
                            label="Grade"
                            value={reviewDraft[s.id]?.grade ?? ''}
                            onChange={(e) =>
                              setReviewDraft((prev) => ({
                                ...prev,
                                [s.id]: { grade: e.target.value, feedback: prev[s.id]?.feedback ?? '' },
                              }))
                            }
                          />
                          <Textarea
                            label="Feedback"
                            rows={2}
                            value={reviewDraft[s.id]?.feedback ?? ''}
                            onChange={(e) =>
                              setReviewDraft((prev) => ({
                                ...prev,
                                [s.id]: { grade: prev[s.id]?.grade ?? '', feedback: e.target.value },
                              }))
                            }
                          />
                        </div>
                        <Button type="button" className="mt-2" size="sm" loading={Boolean(reviewBusy[s.id])} onClick={() => void saveReview(s.id)}>
                          Save review
                        </Button>
                      </div>
                    </Fragment>
                  ))}
                </div>
              </div>
            </Card>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
