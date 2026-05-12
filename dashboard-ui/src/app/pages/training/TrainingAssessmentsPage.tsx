import { useCallback, useEffect, useState } from 'react';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { Input } from '../../components/design-system/Input';
import { Badge } from '../../components/design-system/Badge';
import { functionsBase, getAuthHeaders, jsonFetch } from '../../../lib/api';

type Assessment = Record<string, unknown>;
type Question = Record<string, unknown>;
type Attempt = Record<string, unknown>;

function canWrite(): boolean {
  const r = String(localStorage.getItem('sbs_role') || '').toLowerCase();
  return r === 'admin' || r === 'trainer';
}

function StatusBadge({ status }: { status: string }) {
  const v = status === 'published' ? 'success' : status === 'draft' ? 'neutral' : 'info';
  return <Badge variant={v as 'success' | 'neutral' | 'info'}>{status}</Badge>;
}

export function TrainingAssessmentsPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [batchFilter, setBatchFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [detailTab, setDetailTab] = useState<'questions' | 'attempts'>('questions');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const [title, setTitle] = useState('');
  const [batchId, setBatchId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [atype, setAtype] = useState('quiz');
  const [maxScore, setMaxScore] = useState('');
  const [passScore, setPassScore] = useState('');
  const [status, setStatus] = useState('draft');
  const [dueAt, setDueAt] = useState('');

  const [qPrompt, setQPrompt] = useState('');
  const [qType, setQType] = useState('mcq');
  const [qPoints, setQPoints] = useState('1');
  const [qOptions, setQOptions] = useState('');
  const [qCorrect, setQCorrect] = useState('');

  const write = canWrite();

  const loadAssessments = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const qs = [
        batchFilter.trim() ? `batch_id=${encodeURIComponent(batchFilter.trim())}` : '',
        courseFilter.trim() ? `course_id=${encodeURIComponent(courseFilter.trim())}` : '',
      ].filter(Boolean).join('&');
      const data = await jsonFetch<{ items: Assessment[] }>(
        `${functionsBase()}/assessment-data?resource=assessments${qs ? `&${qs}` : ''}`,
        { headers: getAuthHeaders() },
      );
      setAssessments(data.items || []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not load assessments');
    } finally {
      setLoading(false);
    }
  }, [batchFilter, courseFilter]);

  useEffect(() => { void loadAssessments(); }, [loadAssessments]);

  const loadDetail = useCallback(async (id: string) => {
    if (!id) { setQuestions([]); setAttempts([]); return; }
    setLoadingDetail(true);
    try {
      const [q, a] = await Promise.all([
        jsonFetch<{ items: Question[] }>(`${functionsBase()}/assessment-data?resource=questions&assessment_id=${encodeURIComponent(id)}`, { headers: getAuthHeaders() }),
        jsonFetch<{ items: Attempt[] }>(`${functionsBase()}/assessment-data?resource=attempts&assessment_id=${encodeURIComponent(id)}`, { headers: getAuthHeaders() }),
      ]);
      setQuestions(q.items || []);
      setAttempts(a.items || []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not load assessment detail');
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => { void loadDetail(selectedId); }, [selectedId, loadDetail]);

  const createAssessment = async () => {
    if (!title.trim()) return;
    setMsg(''); setErr('');
    try {
      await jsonFetch(`${functionsBase()}/assessment-data?resource=assessments`, {
        method: 'POST', headers: getAuthHeaders(),
        body: JSON.stringify({ title: title.trim(), batch_id: batchId.trim() || null, course_id: courseId.trim() || null, assessment_type: atype, max_score: maxScore ? Number(maxScore) : null, pass_score: passScore ? Number(passScore) : null, status, due_at: dueAt || null }),
      });
      setMsg('Assessment created.'); setTitle(''); setShowCreate(false);
      void loadAssessments();
    } catch (e) { setErr(e instanceof Error ? e.message : 'Create failed'); }
  };

  const addQuestion = async () => {
    if (!selectedId || !qPrompt.trim()) return;
    setMsg(''); setErr('');
    let options: unknown = null;
    if (qOptions.trim()) {
      try { options = JSON.parse(qOptions.trim()); }
      catch { setErr('Options must be valid JSON'); return; }
    }
    try {
      await jsonFetch(`${functionsBase()}/assessment-data?resource=questions&assessment_id=${encodeURIComponent(selectedId)}`, {
        method: 'POST', headers: getAuthHeaders(),
        body: JSON.stringify({ prompt: qPrompt.trim(), question_type: qType, points: qPoints ? Number(qPoints) : 1, sort_order: 0, options, correct_answer: qCorrect.trim() || null }),
      });
      setMsg('Question added.'); setQPrompt(''); setQOptions(''); setQCorrect('');
      void loadDetail(selectedId);
    } catch (e) { setErr(e instanceof Error ? e.message : 'Add question failed'); }
  };

  const selectedAssessment = assessments.find((a) => String(a.id) === selectedId);

  return (
    <div className="space-y-4">
      {err && <p className="rounded-lg border border-[var(--brand-danger)]/30 bg-[var(--brand-danger)]/10 px-3 py-2 text-sm text-[var(--brand-danger)]">{err}</p>}
      {msg && <p className="rounded-lg border border-[var(--brand-success)]/30 bg-[var(--brand-success)]/10 px-3 py-2 text-sm text-[var(--brand-success)]">{msg}</p>}

      {/* Toolbar */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-1 flex-wrap gap-2">
          <div className="w-44">
            <label className="mb-1 block text-xs font-medium text-[var(--brand-muted)]">Batch ID</label>
            <input
              value={batchFilter} onChange={(e) => setBatchFilter(e.target.value)}
              placeholder="Filter by batch…"
              className="w-full rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-sm text-[var(--brand-text)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-focus-ring)]"
            />
          </div>
          <div className="w-44">
            <label className="mb-1 block text-xs font-medium text-[var(--brand-muted)]">Course ID</label>
            <input
              value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}
              placeholder="Filter by course…"
              className="w-full rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-sm text-[var(--brand-text)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-focus-ring)]"
            />
          </div>
          <div className="flex items-end">
            <Button type="button" variant="secondary" size="sm" onClick={() => void loadAssessments()}>
              Search
            </Button>
          </div>
        </div>
        {write && (
          <Button type="button" variant="primary" size="sm" onClick={() => setShowCreate(true)}>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            New Assessment
          </Button>
        )}
      </div>

      {/* Split panel */}
      <div className={`grid gap-4 ${selectedId ? 'lg:grid-cols-[340px,1fr]' : 'grid-cols-1'}`}>
        {/* LEFT — list */}
        <div className="space-y-1">
          {loading ? (
            <div className="space-y-1">{[1,2,3].map(i => <div key={i} className="h-14 animate-pulse rounded-[var(--brand-radius-dense)] bg-[var(--brand-surface)]" />)}</div>
          ) : assessments.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-[var(--brand-radius)] border border-[var(--brand-border)] bg-[var(--brand-surface)] py-10 text-center">
              <p className="text-sm text-[var(--brand-muted)]">No assessments found.</p>
              {write && <Button type="button" size="sm" variant="secondary" onClick={() => setShowCreate(true)}>Create assessment</Button>}
            </div>
          ) : (
            assessments.map((a) => {
              const id = String(a.id ?? '');
              const isActive = id === selectedId;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => { setSelectedId(id); setDetailTab('questions'); setMsg(''); }}
                  className={`w-full rounded-[var(--brand-radius-dense)] border px-3 py-3 text-left transition-all duration-100 ${isActive ? 'border-[var(--brand-primary)]/40 bg-[var(--brand-primary-subtle)]' : 'border-[var(--brand-border)] bg-[var(--brand-surface)] hover:bg-[var(--brand-surface-2)]'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-medium leading-snug ${isActive ? 'text-[var(--brand-primary-2)]' : 'text-[var(--brand-text)]'}`}>
                      {String(a.title ?? 'Untitled')}
                    </p>
                    <StatusBadge status={String(a.status ?? 'draft')} />
                  </div>
                  <p className="mt-0.5 text-xs text-[var(--brand-muted)]">
                    {String(a.assessment_type ?? 'quiz')} · {a.max_score != null ? `${a.max_score} pts` : 'No score set'}
                  </p>
                </button>
              );
            })
          )}
        </div>

        {/* RIGHT — detail */}
        {selectedId && selectedAssessment && (
          <div className="min-w-0 space-y-4">
            <Card>
              <div className="mb-1 flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-[var(--brand-text)]">{String(selectedAssessment.title ?? '')}</h2>
                  <p className="text-xs text-[var(--brand-muted)]">{String(selectedAssessment.assessment_type ?? '')} · Due: {String(selectedAssessment.due_at ?? '—').slice(0, 10)}</p>
                </div>
                <button type="button" onClick={() => setSelectedId('')} className="shrink-0 text-[var(--brand-dim)] hover:text-[var(--brand-text)]" aria-label="Close">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="mt-3 flex gap-1 border-b border-[var(--brand-border)] pb-3">
                {(['questions', 'attempts'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setDetailTab(tab)}
                    className={`rounded-[var(--brand-radius-dense)] px-3 py-1.5 text-xs font-medium capitalize transition-colors ${detailTab === tab ? 'bg-[var(--brand-primary)] text-white' : 'text-[var(--brand-muted)] hover:bg-[var(--brand-surface-2)] hover:text-[var(--brand-text)]'}`}
                  >
                    {tab} {tab === 'questions' ? `(${questions.length})` : `(${attempts.length})`}
                  </button>
                ))}
              </div>

              {loadingDetail ? (
                <div className="mt-3 space-y-2">{[1,2].map(i => <div key={i} className="h-8 animate-pulse rounded bg-[var(--brand-surface-2)]" />)}</div>
              ) : detailTab === 'questions' ? (
                <div className="mt-3 space-y-3">
                  {questions.length === 0 ? (
                    <p className="text-sm text-[var(--brand-muted)]">No questions yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {questions.map((q, i) => (
                        <div key={String(q.id ?? i)} className="rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] px-3 py-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm text-[var(--brand-text)]">{String(q.prompt ?? '')}</p>
                            <span className="shrink-0 text-xs text-[var(--brand-muted)]">{String(q.points ?? 1)} pt{Number(q.points) !== 1 ? 's' : ''}</span>
                          </div>
                          <p className="mt-0.5 text-xs text-[var(--brand-muted)]">{String(q.question_type ?? '')}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {write && (
                    <div className="border-t border-[var(--brand-border)] pt-3">
                      <p className="mb-2 text-xs font-semibold text-[var(--brand-muted)]">ADD QUESTION</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                          <Input label="Prompt" value={qPrompt} onChange={(e) => setQPrompt(e.target.value)} />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-[var(--brand-muted)]">Type</label>
                          <select value={qType} onChange={(e) => setQType(e.target.value)} className="w-full rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-sm text-[var(--brand-text)]">
                            {['mcq', 'true_false', 'short_answer', 'essay'].map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                        <Input label="Points" value={qPoints} onChange={(e) => setQPoints(e.target.value)} />
                        <Input label="Options (JSON)" value={qOptions} onChange={(e) => setQOptions(e.target.value)} placeholder='["A","B","C"]' />
                        <Input label="Correct answer" value={qCorrect} onChange={(e) => setQCorrect(e.target.value)} />
                      </div>
                      <Button type="button" size="sm" className="mt-2" onClick={() => void addQuestion()} disabled={!qPrompt.trim()}>
                        Add question
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-3">
                  {attempts.length === 0 ? (
                    <p className="text-sm text-[var(--brand-muted)]">No attempts yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[var(--brand-border)]">
                            <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wider text-[var(--brand-dim)]">Trainee</th>
                            <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wider text-[var(--brand-dim)]">Status</th>
                            <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wider text-[var(--brand-dim)]">Score</th>
                            <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wider text-[var(--brand-dim)]">Submitted</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--brand-border)]">
                          {attempts.map((t, i) => (
                            <tr key={String(t.id ?? i)} className="hover:bg-[var(--brand-surface-2)]">
                              <td className="py-2 font-mono text-xs text-[var(--brand-text)]">{String(t.trainee_id ?? '—')}</td>
                              <td className="py-2"><Badge variant="neutral">{String(t.status ?? '')}</Badge></td>
                              <td className="py-2 text-[var(--brand-text)]">{String(t.score ?? '—')}</td>
                              <td className="py-2 text-xs text-[var(--brand-muted)]">{String(t.submitted_at ?? '—').slice(0, 16).replace('T', ' ')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>
        )}
      </div>

      {/* Create assessment modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-lg rounded-[var(--brand-radius)] border border-[var(--brand-border)] bg-[var(--brand-surface)] shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[var(--brand-border)] px-5 py-4">
              <h3 className="font-semibold text-[var(--brand-text)]">New Assessment</h3>
              <button type="button" onClick={() => setShowCreate(false)} className="text-[var(--brand-dim)] hover:text-[var(--brand-text)]">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="grid gap-3 p-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <Input label="Batch ID (optional)" value={batchId} onChange={(e) => setBatchId(e.target.value)} />
              <Input label="Course ID (optional)" value={courseId} onChange={(e) => setCourseId(e.target.value)} />
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--brand-muted)]">Type</label>
                <select value={atype} onChange={(e) => setAtype(e.target.value)} className="w-full rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-sm text-[var(--brand-text)]">
                  {['quiz', 'exam', 'assignment', 'survey'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--brand-muted)]">Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-sm text-[var(--brand-text)]">
                  {['draft', 'published', 'archived'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <Input label="Max score" value={maxScore} onChange={(e) => setMaxScore(e.target.value)} placeholder="e.g. 100" />
              <Input label="Pass score" value={passScore} onChange={(e) => setPassScore(e.target.value)} placeholder="e.g. 60" />
              <div className="sm:col-span-2">
                <Input label="Due date (optional)" type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-[var(--brand-border)] px-5 py-3">
              <Button type="button" variant="secondary" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="button" size="sm" onClick={() => void createAssessment()} disabled={!title.trim()}>Create</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
