import { useCallback, useEffect, useState } from 'react';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { Input } from '../../components/design-system/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/design-system/Table';
import { functionsBase, getAuthHeaders, jsonFetch } from '../../../lib/api';

type Assessment = Record<string, unknown>;
type Question = Record<string, unknown>;
type Attempt = Record<string, unknown>;

function canWriteAssessment(): boolean {
  const r = String(localStorage.getItem('sbs_role') || '').toLowerCase();
  return r === 'admin' || r === 'trainer';
}

export function TrainingAssessmentsPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [batchFilter, setBatchFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

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
  const [qOrder, setQOrder] = useState('0');
  const [qOptions, setQOptions] = useState('');
  const [qCorrect, setQCorrect] = useState('');

  const [progTrainee, setProgTrainee] = useState('');
  const [progCourse, setProgCourse] = useState('');
  const [progBatch, setProgBatch] = useState('');
  const [progPct, setProgPct] = useState('0');
  const [progStatus, setProgStatus] = useState('in_progress');
  const [progCompleted, setProgCompleted] = useState('');

  const write = canWriteAssessment();

  const loadAssessments = useCallback(async () => {
    setLoading(true);
    setErr('');
    const headers = getAuthHeaders();
    const base = functionsBase();
    try {
      const q = [
        batchFilter.trim() ? `batch_id=${encodeURIComponent(batchFilter.trim())}` : '',
        courseFilter.trim() ? `course_id=${encodeURIComponent(courseFilter.trim())}` : '',
      ]
        .filter(Boolean)
        .join('&');
      const url = `${base}/assessment-data?resource=assessments${q ? `&${q}` : ''}`;
      const data = await jsonFetch<{ items: Assessment[] }>(url, { headers });
      setAssessments(data.items || []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not load assessments');
    } finally {
      setLoading(false);
    }
  }, [batchFilter, courseFilter]);

  useEffect(() => {
    void loadAssessments();
  }, [loadAssessments]);

  const loadDetail = useCallback(async () => {
    if (!selectedId.trim()) {
      setQuestions([]);
      setAttempts([]);
      return;
    }
    const headers = getAuthHeaders();
    const base = functionsBase();
    try {
      const [q, a] = await Promise.all([
        jsonFetch<{ items: Question[] }>(`${base}/assessment-data?resource=questions&assessment_id=${encodeURIComponent(selectedId.trim())}`, {
          headers,
        }),
        jsonFetch<{ items: Attempt[] }>(`${base}/assessment-data?resource=attempts&assessment_id=${encodeURIComponent(selectedId.trim())}`, {
          headers,
        }),
      ]);
      setQuestions(q.items || []);
      setAttempts(a.items || []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not load questions or attempts');
    }
  }, [selectedId]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const createAssessment = async () => {
    setMsg('');
    setErr('');
    const headers = getAuthHeaders();
    const base = functionsBase();
    try {
      await jsonFetch(`${base}/assessment-data?resource=assessments`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: title.trim(),
          batch_id: batchId.trim() || null,
          course_id: courseId.trim() || null,
          assessment_type: atype.trim(),
          max_score: maxScore.trim() ? Number(maxScore) : null,
          pass_score: passScore.trim() ? Number(passScore) : null,
          status: status.trim(),
          due_at: dueAt.trim() || null,
        }),
      });
      setMsg('Assessment created.');
      setTitle('');
      void loadAssessments();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Create failed');
    }
  };

  const addQuestion = async () => {
    if (!selectedId.trim()) return;
    setMsg('');
    setErr('');
    const headers = getAuthHeaders();
    const base = functionsBase();
    let options: unknown = null;
    if (qOptions.trim()) {
      try {
        options = JSON.parse(qOptions.trim()) as unknown;
      } catch {
        setErr('options must be valid JSON');
        return;
      }
    }
    try {
      await jsonFetch(`${base}/assessment-data?resource=questions&assessment_id=${encodeURIComponent(selectedId.trim())}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          prompt: qPrompt.trim(),
          question_type: qType.trim(),
          points: qPoints.trim() ? Number(qPoints) : 1,
          sort_order: qOrder.trim() ? Number(qOrder) : 0,
          options,
          correct_answer: qCorrect.trim() || null,
        }),
      });
      setMsg('Question added.');
      setQPrompt('');
      void loadDetail();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Add question failed');
    }
  };

  const patchProgress = async () => {
    setMsg('');
    setErr('');
    const headers = getAuthHeaders();
    const base = functionsBase();
    try {
      await jsonFetch(`${base}/assessment-data?resource=progress`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          trainee_id: progTrainee.trim(),
          course_id: progCourse.trim(),
          batch_id: progBatch.trim() || null,
          progress_pct: progPct.trim() ? Number(progPct) : 0,
          status: progStatus.trim(),
          completed_at: progCompleted.trim() || null,
        }),
      });
      setMsg('Progress updated.');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Progress update failed');
    }
  };

  return (
    <div className="space-y-6">
      {err ? (
        <div className="rounded-lg border border-[var(--brand-danger)]/30 bg-[var(--brand-danger)]/10 p-3 text-sm text-[var(--brand-danger)]">
          {err}
        </div>
      ) : null}
      {msg ? <p className="text-sm text-[var(--brand-text)]">{msg}</p> : null}

      <Card className="flex flex-wrap items-end gap-3">
        <div className="w-full max-w-xs">
          <Input label="Filter batch_id" value={batchFilter} onChange={(e) => setBatchFilter(e.target.value)} />
        </div>
        <div className="w-full max-w-xs">
          <Input label="Filter course_id" value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} />
        </div>
        <Button type="button" variant="secondary" onClick={() => void loadAssessments()}>
          Reload assessments
        </Button>
      </Card>

      {write ? (
        <Card className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <h3 className="md:col-span-2 lg:col-span-3 text-lg font-semibold text-[var(--brand-text)]">Create assessment</h3>
          <div className="md:col-span-2 lg:col-span-3">
            <Input label="title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <Input label="batch_id (optional)" value={batchId} onChange={(e) => setBatchId(e.target.value)} />
          <Input label="course_id (optional)" value={courseId} onChange={(e) => setCourseId(e.target.value)} />
          <Input label="assessment_type" value={atype} onChange={(e) => setAtype(e.target.value)} />
          <Input label="max_score (optional)" value={maxScore} onChange={(e) => setMaxScore(e.target.value)} />
          <Input label="pass_score (optional)" value={passScore} onChange={(e) => setPassScore(e.target.value)} />
          <Input label="status" value={status} onChange={(e) => setStatus(e.target.value)} />
          <Input label="due_at (optional)" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
          <Button type="button" onClick={() => void createAssessment()}>
            Create
          </Button>
        </Card>
      ) : null}

      {loading ? <p className="text-sm text-[var(--brand-muted)]">Loading…</p> : null}

      <Card noPadding>
        <div className="border-b border-[var(--brand-border)] p-4">
          <h3 className="text-lg font-semibold text-[var(--brand-text)]">Assessments</h3>
          <p className="mt-1 text-sm text-[var(--brand-muted)]">Select an assessment id to load questions and attempts.</p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>id</TableHead>
              <TableHead>title</TableHead>
              <TableHead>type</TableHead>
              <TableHead>status</TableHead>
              <TableHead>batch_id</TableHead>
              <TableHead>course_id</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {assessments.map((a) => {
              const id = String(a.id ?? '');
              return (
                <TableRow key={id || String(a.title)}>
                  <TableCell className="font-mono text-xs">{id}</TableCell>
                  <TableCell>{String(a.title ?? '')}</TableCell>
                  <TableCell>{String(a.assessment_type ?? '')}</TableCell>
                  <TableCell>{String(a.status ?? '')}</TableCell>
                  <TableCell className="font-mono text-xs">{String(a.batch_id ?? '')}</TableCell>
                  <TableCell className="font-mono text-xs">{String(a.course_id ?? '')}</TableCell>
                  <TableCell>
                    <Button type="button" size="sm" variant={selectedId === id ? 'primary' : 'secondary'} onClick={() => setSelectedId(id)}>
                      Select
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {selectedId ? (
        <>
          <Card className="grid gap-3 md:grid-cols-2">
            <h3 className="md:col-span-2 text-lg font-semibold text-[var(--brand-text)]">Questions for {selectedId}</h3>
            {write ? (
              <>
                <div className="md:col-span-2">
                  <Input label="prompt" value={qPrompt} onChange={(e) => setQPrompt(e.target.value)} />
                </div>
                <Input label="question_type" value={qType} onChange={(e) => setQType(e.target.value)} />
                <Input label="points" value={qPoints} onChange={(e) => setQPoints(e.target.value)} />
                <Input label="sort_order" value={qOrder} onChange={(e) => setQOrder(e.target.value)} />
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-[var(--brand-text)]">options (JSON, optional)</label>
                  <textarea
                    className="w-full rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[var(--brand-surface)] px-4 py-2.5 font-mono text-sm text-[var(--brand-text)]"
                    rows={3}
                    value={qOptions}
                    onChange={(e) => setQOptions(e.target.value)}
                    placeholder='["A","B","C"]'
                  />
                </div>
                <Input label="correct_answer (optional)" value={qCorrect} onChange={(e) => setQCorrect(e.target.value)} />
                <Button type="button" onClick={() => void addQuestion()}>
                  Add question
                </Button>
              </>
            ) : null}
          </Card>

          <Card noPadding>
            <div className="border-b border-[var(--brand-border)] p-4">
              <h3 className="text-lg font-semibold text-[var(--brand-text)]">Questions</h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>prompt</TableHead>
                  <TableHead>type</TableHead>
                  <TableHead>points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {questions.map((q, i) => (
                  <TableRow key={String(q.id ?? i)}>
                    <TableCell className="max-w-md truncate">{String(q.prompt ?? '')}</TableCell>
                    <TableCell>{String(q.question_type ?? '')}</TableCell>
                    <TableCell>{String(q.points ?? '')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          <Card noPadding>
            <div className="border-b border-[var(--brand-border)] p-4">
              <h3 className="text-lg font-semibold text-[var(--brand-text)]">Attempts</h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>trainee</TableHead>
                  <TableHead>status</TableHead>
                  <TableHead>score</TableHead>
                  <TableHead>submitted_at</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attempts.map((t, i) => (
                  <TableRow key={String(t.id ?? i)}>
                    <TableCell className="font-mono text-xs">{String(t.trainee_id ?? '')}</TableCell>
                    <TableCell>{String(t.status ?? '')}</TableCell>
                    <TableCell>{String(t.score ?? '')}</TableCell>
                    <TableCell className="text-xs">{String(t.submitted_at ?? '')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      ) : null}

      {write ? (
        <Card className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <h3 className="md:col-span-2 lg:col-span-3 text-lg font-semibold text-[var(--brand-text)]">Learner course progress (upsert)</h3>
          <Input label="trainee_id" value={progTrainee} onChange={(e) => setProgTrainee(e.target.value)} />
          <Input label="course_id" value={progCourse} onChange={(e) => setProgCourse(e.target.value)} />
          <Input label="batch_id (optional)" value={progBatch} onChange={(e) => setProgBatch(e.target.value)} />
          <Input label="progress_pct" value={progPct} onChange={(e) => setProgPct(e.target.value)} />
          <Input label="status" value={progStatus} onChange={(e) => setProgStatus(e.target.value)} />
          <Input label="completed_at (optional)" value={progCompleted} onChange={(e) => setProgCompleted(e.target.value)} />
          <Button type="button" onClick={() => void patchProgress()}>
            Save progress
          </Button>
        </Card>
      ) : null}
    </div>
  );
}
