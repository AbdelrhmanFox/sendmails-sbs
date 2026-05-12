import { useCallback, useEffect, useState } from 'react';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { Input } from '../../components/design-system/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/design-system/Table';
import { functionsBase, getAuthHeaders, jsonFetch } from '../../../lib/api';

type TabId = 'programs' | 'cohorts' | 'enrollments' | 'rubrics' | 'criteria' | 'certificates' | 'transcripts';

function canWriteLms(): boolean {
  const r = String(localStorage.getItem('sbs_role') || '').toLowerCase();
  return r === 'admin' || r === 'staff';
}

export function OperationsLmsAdminPage() {
  const [tab, setTab] = useState<TabId>('programs');
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [programFilter, setProgramFilter] = useState('');
  const [cohortIdEnroll, setCohortIdEnroll] = useState('');
  const [rubricIdCrit, setRubricIdCrit] = useState('');
  const [traineeCert, setTraineeCert] = useState('');
  const [traineeTrans, setTraineeTrans] = useState('');

  const [pCode, setPCode] = useState('');
  const [pName, setPName] = useState('');
  const [pDesc, setPDesc] = useState('');
  const [pStatus, setPStatus] = useState('active');

  const [cCode, setCCode] = useState('');
  const [cName, setCName] = useState('');
  const [cProgramId, setCProgramId] = useState('');
  const [cStart, setCStart] = useState('');
  const [cEnd, setCEnd] = useState('');
  const [cStatus, setCStatus] = useState('planned');

  const [ceCohort, setCeCohort] = useState('');
  const [ceTrainee, setCeTrainee] = useState('');
  const [ceState, setCeState] = useState('active');

  const [rtName, setRtName] = useState('');
  const [rtDesc, setRtDesc] = useState('');

  const [rcRubric, setRcRubric] = useState('');
  const [rcCriterion, setRcCriterion] = useState('');
  const [rcMax, setRcMax] = useState('1');
  const [rcWeight, setRcWeight] = useState('1');
  const [rcOrder, setRcOrder] = useState('0');

  const [certTrainee, setCertTrainee] = useState('');
  const [certCourse, setCertCourse] = useState('');
  const [certNo, setCertNo] = useState('');
  const [certBatch, setCertBatch] = useState('');
  const [certExpires, setCertExpires] = useState('');
  const [certStatus, setCertStatus] = useState('active');

  const [trTrainee, setTrTrainee] = useState('');
  const [trCourse, setTrCourse] = useState('');
  const [trBatch, setTrBatch] = useState('');
  const [trCompletion, setTrCompletion] = useState('in_progress');
  const [trScore, setTrScore] = useState('');
  const [trCompletedAt, setTrCompletedAt] = useState('');
  const [trCertId, setTrCertId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    const headers = getAuthHeaders();
    const base = functionsBase();
    try {
      if (tab === 'programs') {
        const data = await jsonFetch<{ items: Record<string, unknown>[] }>(`${base}/lms-admin-data?resource=programs`, { headers });
        setRows(data.items || []);
        return;
      }
      if (tab === 'cohorts') {
        const q = programFilter.trim() ? `&program_id=${encodeURIComponent(programFilter.trim())}` : '';
        const data = await jsonFetch<{ items: Record<string, unknown>[] }>(`${base}/lms-admin-data?resource=cohorts${q}`, { headers });
        setRows(data.items || []);
        return;
      }
      if (tab === 'enrollments') {
        if (!cohortIdEnroll.trim()) {
          setRows([]);
          return;
        }
        const data = await jsonFetch<{ items: Record<string, unknown>[] }>(
          `${base}/lms-admin-data?resource=cohort-enrollments&cohort_id=${encodeURIComponent(cohortIdEnroll.trim())}`,
          { headers },
        );
        setRows(data.items || []);
        return;
      }
      if (tab === 'rubrics') {
        const data = await jsonFetch<{ items: Record<string, unknown>[] }>(`${base}/lms-admin-data?resource=rubric-templates`, {
          headers,
        });
        setRows(data.items || []);
        return;
      }
      if (tab === 'criteria') {
        if (!rubricIdCrit.trim()) {
          setRows([]);
          return;
        }
        const data = await jsonFetch<{ items: Record<string, unknown>[] }>(
          `${base}/lms-admin-data?resource=rubric-criteria&rubric_id=${encodeURIComponent(rubricIdCrit.trim())}`,
          { headers },
        );
        setRows(data.items || []);
        return;
      }
      if (tab === 'certificates') {
        const q = traineeCert.trim() ? `&trainee_id=${encodeURIComponent(traineeCert.trim())}` : '';
        const data = await jsonFetch<{ items: Record<string, unknown>[] }>(
          `${base}/lms-admin-data?resource=certificates${q}`,
          { headers },
        );
        setRows(data.items || []);
        return;
      }
      if (tab === 'transcripts') {
        const q = traineeTrans.trim() ? `&trainee_id=${encodeURIComponent(traineeTrans.trim())}` : '';
        const data = await jsonFetch<{ items: Record<string, unknown>[] }>(
          `${base}/lms-admin-data?resource=transcripts${q}`,
          { headers },
        );
        setRows(data.items || []);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not load data');
    } finally {
      setLoading(false);
    }
  }, [tab, programFilter, cohortIdEnroll, rubricIdCrit, traineeCert, traineeTrans]);

  useEffect(() => {
    void load();
  }, [load]);

  const post = async (path: string, body: Record<string, unknown>) => {
    setMsg('');
    setErr('');
    try {
      await jsonFetch(`${functionsBase()}${path}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });
      setMsg('Saved.');
      void load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Save failed');
    }
  };

  const keys = rows.length ? Object.keys(rows[0]) : [];
  const renderTable = () => {
    if (!rows.length && !loading) {
      return <p className="p-4 text-sm text-[var(--brand-muted)]">No rows.</p>;
    }
    return (
      <Table>
        <TableHeader>
          <TableRow>
            {keys.slice(0, 8).map((k) => (
              <TableHead key={k}>{k.replace(/_/g, ' ')}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={i}>
              {keys.slice(0, 8).map((k) => (
                <TableCell key={k} className="max-w-[12rem] truncate font-mono text-xs">
                  {row[k] != null ? String(row[k] as string | number) : ''}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: 'programs', label: 'Programs' },
    { id: 'cohorts', label: 'Cohorts' },
    { id: 'enrollments', label: 'Cohort enrollments' },
    { id: 'rubrics', label: 'Rubric templates' },
    { id: 'criteria', label: 'Rubric criteria' },
    { id: 'certificates', label: 'Certificates' },
    { id: 'transcripts', label: 'Transcripts' },
  ];

  const write = canWriteLms();

  return (
    <div className="space-y-4">
      {err ? (
        <div className="rounded-lg border border-[var(--brand-danger)]/30 bg-[var(--brand-danger)]/10 p-3 text-sm text-[var(--brand-danger)]">
          {err}
        </div>
      ) : null}
      {msg ? (
        <p className="rounded-lg border border-[var(--brand-success)]/30 bg-[var(--brand-success)]/10 px-3 py-2 text-sm text-[var(--brand-success)]">{msg}</p>
      ) : null}
      {!write ? (
        <p className="rounded-lg border border-[var(--brand-warning)]/30 bg-[var(--brand-warning)]/10 px-3 py-2 text-sm text-[var(--brand-warning)]">Your role cannot create LMS records on this page.</p>
      ) : null}

      <div className="flex flex-wrap gap-1 border-b border-[var(--brand-border)]">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-t-[var(--brand-radius-dense)] px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.id
                ? 'border border-b-0 border-[var(--brand-border)] bg-[var(--brand-surface)] text-[var(--brand-primary-2)]'
                : 'text-[var(--brand-muted)] hover:text-[var(--brand-text)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'programs' && write ? (
        <Card className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <h3 className="md:col-span-2 lg:col-span-3 text-lg font-semibold text-[var(--brand-text)]">Create program</h3>
          <Input label="program_code" value={pCode} onChange={(e) => setPCode(e.target.value)} />
          <Input label="program_name" value={pName} onChange={(e) => setPName(e.target.value)} />
          <Input label="status" value={pStatus} onChange={(e) => setPStatus(e.target.value)} />
          <div className="md:col-span-2 lg:col-span-3">
            <label className="mb-1.5 block text-sm font-medium text-[var(--brand-text)]">description</label>
            <textarea
              className="w-full rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[var(--brand-surface)] px-4 py-2.5 text-sm text-[var(--brand-text)]"
              rows={2}
              value={pDesc}
              onChange={(e) => setPDesc(e.target.value)}
            />
          </div>
          <Button
            type="button"
            onClick={() =>
              void post('/lms-admin-data?resource=programs', {
                program_code: pCode.trim(),
                program_name: pName.trim(),
                description: pDesc.trim() || null,
                status: pStatus.trim(),
              })
            }
          >
            Create program
          </Button>
        </Card>
      ) : null}

      {tab === 'cohorts' && write ? (
        <Card className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <h3 className="md:col-span-2 lg:col-span-3 text-lg font-semibold text-[var(--brand-text)]">Create cohort</h3>
          <Input label="cohort_code" value={cCode} onChange={(e) => setCCode(e.target.value)} />
          <Input label="cohort_name" value={cName} onChange={(e) => setCName(e.target.value)} />
          <Input label="program_id (optional)" value={cProgramId} onChange={(e) => setCProgramId(e.target.value)} />
          <Input label="start_date" value={cStart} onChange={(e) => setCStart(e.target.value)} placeholder="YYYY-MM-DD" />
          <Input label="end_date" value={cEnd} onChange={(e) => setCEnd(e.target.value)} placeholder="YYYY-MM-DD" />
          <Input label="status" value={cStatus} onChange={(e) => setCStatus(e.target.value)} />
          <Button
            type="button"
            onClick={() =>
              void post('/lms-admin-data?resource=cohorts', {
                cohort_code: cCode.trim(),
                cohort_name: cName.trim(),
                program_id: cProgramId.trim() || null,
                start_date: cStart.trim() || null,
                end_date: cEnd.trim() || null,
                status: cStatus.trim(),
              })
            }
          >
            Create cohort
          </Button>
        </Card>
      ) : null}

      {tab === 'cohorts' ? (
        <Card className="flex flex-wrap items-end gap-3">
          <div className="w-full max-w-md">
            <Input label="Filter by program_id (optional)" value={programFilter} onChange={(e) => setProgramFilter(e.target.value)} />
          </div>
          <Button type="button" variant="secondary" onClick={() => void load()}>
            Reload list
          </Button>
        </Card>
      ) : null}

      {tab === 'enrollments' && write ? (
        <Card className="grid gap-3 md:grid-cols-2">
          <h3 className="md:col-span-2 text-lg font-semibold text-[var(--brand-text)]">Add cohort enrollment</h3>
          <Input label="cohort_id" value={ceCohort} onChange={(e) => setCeCohort(e.target.value)} />
          <Input label="trainee_id" value={ceTrainee} onChange={(e) => setCeTrainee(e.target.value)} />
          <Input label="enrollment_state" value={ceState} onChange={(e) => setCeState(e.target.value)} />
          <Button
            type="button"
            onClick={() =>
              void post('/lms-admin-data?resource=cohort-enrollments', {
                cohort_id: ceCohort.trim(),
                trainee_id: ceTrainee.trim(),
                enrollment_state: ceState.trim(),
              })
            }
          >
            Upsert enrollment
          </Button>
        </Card>
      ) : null}

      {tab === 'enrollments' ? (
        <Card className="flex flex-wrap items-end gap-3">
          <div className="w-full max-w-md">
            <Input label="Load cohort_id" value={cohortIdEnroll} onChange={(e) => setCohortIdEnroll(e.target.value)} />
          </div>
          <Button type="button" variant="secondary" onClick={() => void load()}>
            Load enrollments
          </Button>
        </Card>
      ) : null}

      {tab === 'rubrics' && write ? (
        <Card className="grid gap-3 md:grid-cols-2">
          <h3 className="md:col-span-2 text-lg font-semibold text-[var(--brand-text)]">Create rubric template</h3>
          <Input label="name" value={rtName} onChange={(e) => setRtName(e.target.value)} />
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-[var(--brand-text)]">description</label>
            <textarea
              className="w-full rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[var(--brand-surface)] px-4 py-2.5 text-sm text-[var(--brand-text)]"
              rows={2}
              value={rtDesc}
              onChange={(e) => setRtDesc(e.target.value)}
            />
          </div>
          <Button type="button" onClick={() => void post('/lms-admin-data?resource=rubric-templates', { name: rtName.trim(), description: rtDesc.trim() || null })}>
            Create template
          </Button>
        </Card>
      ) : null}

      {tab === 'criteria' && write ? (
        <Card className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <h3 className="md:col-span-2 lg:col-span-3 text-lg font-semibold text-[var(--brand-text)]">Add rubric criterion</h3>
          <Input label="rubric_id" value={rcRubric} onChange={(e) => setRcRubric(e.target.value)} />
          <Input label="criterion" value={rcCriterion} onChange={(e) => setRcCriterion(e.target.value)} />
          <Input label="max_points" value={rcMax} onChange={(e) => setRcMax(e.target.value)} />
          <Input label="weight" value={rcWeight} onChange={(e) => setRcWeight(e.target.value)} />
          <Input label="sort_order" value={rcOrder} onChange={(e) => setRcOrder(e.target.value)} />
          <Button
            type="button"
            onClick={() =>
              void post('/lms-admin-data?resource=rubric-criteria', {
                rubric_id: rcRubric.trim(),
                criterion: rcCriterion.trim(),
                max_points: rcMax,
                weight: rcWeight,
                sort_order: rcOrder,
              })
            }
          >
            Create criterion
          </Button>
        </Card>
      ) : null}

      {tab === 'criteria' ? (
        <Card className="flex flex-wrap items-end gap-3">
          <div className="w-full max-w-md">
            <Input label="Load rubric_id" value={rubricIdCrit} onChange={(e) => setRubricIdCrit(e.target.value)} />
          </div>
          <Button type="button" variant="secondary" onClick={() => void load()}>
            Load criteria
          </Button>
        </Card>
      ) : null}

      {tab === 'certificates' && write ? (
        <Card className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <h3 className="md:col-span-2 lg:col-span-3 text-lg font-semibold text-[var(--brand-text)]">Issue certificate</h3>
          <Input label="trainee_id" value={certTrainee} onChange={(e) => setCertTrainee(e.target.value)} />
          <Input label="course_id" value={certCourse} onChange={(e) => setCertCourse(e.target.value)} />
          <Input label="certificate_no" value={certNo} onChange={(e) => setCertNo(e.target.value)} />
          <Input label="batch_id (optional)" value={certBatch} onChange={(e) => setCertBatch(e.target.value)} />
          <Input label="expires_at (optional)" value={certExpires} onChange={(e) => setCertExpires(e.target.value)} />
          <Input label="status" value={certStatus} onChange={(e) => setCertStatus(e.target.value)} />
          <Button
            type="button"
            onClick={() =>
              void post('/lms-admin-data?resource=certificates', {
                trainee_id: certTrainee.trim(),
                course_id: certCourse.trim(),
                certificate_no: certNo.trim(),
                batch_id: certBatch.trim() || null,
                expires_at: certExpires.trim() || null,
                status: certStatus.trim(),
              })
            }
          >
            Create certificate
          </Button>
        </Card>
      ) : null}

      {tab === 'certificates' ? (
        <Card className="flex flex-wrap items-end gap-3">
          <div className="w-full max-w-md">
            <Input label="Filter trainee_id (optional)" value={traineeCert} onChange={(e) => setTraineeCert(e.target.value)} />
          </div>
          <Button type="button" variant="secondary" onClick={() => void load()}>
            Reload list
          </Button>
        </Card>
      ) : null}

      {tab === 'transcripts' && write ? (
        <Card className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <h3 className="md:col-span-2 lg:col-span-3 text-lg font-semibold text-[var(--brand-text)]">Create transcript entry</h3>
          <Input label="trainee_id" value={trTrainee} onChange={(e) => setTrTrainee(e.target.value)} />
          <Input label="course_id" value={trCourse} onChange={(e) => setTrCourse(e.target.value)} />
          <Input label="batch_id (optional)" value={trBatch} onChange={(e) => setTrBatch(e.target.value)} />
          <Input label="completion_status" value={trCompletion} onChange={(e) => setTrCompletion(e.target.value)} />
          <Input label="final_score (optional)" value={trScore} onChange={(e) => setTrScore(e.target.value)} />
          <Input label="completed_at (optional)" value={trCompletedAt} onChange={(e) => setTrCompletedAt(e.target.value)} />
          <Input label="certificate_id (optional)" value={trCertId} onChange={(e) => setTrCertId(e.target.value)} />
          <Button
            type="button"
            onClick={() =>
              void post('/lms-admin-data?resource=transcripts', {
                trainee_id: trTrainee.trim(),
                course_id: trCourse.trim(),
                batch_id: trBatch.trim() || null,
                completion_status: trCompletion.trim(),
                final_score: trScore.trim() || null,
                completed_at: trCompletedAt.trim() || null,
                certificate_id: trCertId.trim() || null,
              })
            }
          >
            Create transcript row
          </Button>
        </Card>
      ) : null}

      {tab === 'transcripts' ? (
        <Card className="flex flex-wrap items-end gap-3">
          <div className="w-full max-w-md">
            <Input label="Filter trainee_id (optional)" value={traineeTrans} onChange={(e) => setTraineeTrans(e.target.value)} />
          </div>
          <Button type="button" variant="secondary" onClick={() => void load()}>
            Reload list
          </Button>
        </Card>
      ) : null}

      {tab === 'programs' || tab === 'rubrics' ? (
        <Button type="button" variant="secondary" onClick={() => void load()}>
          Reload list
        </Button>
      ) : null}

      {loading ? <p className="text-sm text-[var(--brand-muted)]">Loading…</p> : null}

      <Card noPadding>{renderTable()}</Card>
    </div>
  );
}
