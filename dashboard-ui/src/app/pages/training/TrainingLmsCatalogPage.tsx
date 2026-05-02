import { useCallback, useEffect, useState } from 'react';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { Input } from '../../components/design-system/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/design-system/Table';
import { functionsBase, getAuthHeaders, jsonFetch } from '../../../lib/api';

type TabId = 'programs' | 'cohorts' | 'enrollments' | 'rubrics' | 'criteria' | 'certificates' | 'transcripts';

export function TrainingLmsCatalogPage() {
  const [tab, setTab] = useState<TabId>('programs');
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [programFilter, setProgramFilter] = useState('');
  const [cohortIdEnroll, setCohortIdEnroll] = useState('');
  const [rubricIdCrit, setRubricIdCrit] = useState('');
  const [traineeCert, setTraineeCert] = useState('');
  const [traineeTrans, setTraineeTrans] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    setRows([]);
    const headers = getAuthHeaders();
    const base = functionsBase();
    try {
      if (tab === 'programs') {
        const data = await jsonFetch<{ items: Record<string, unknown>[] }>(`${base}/lms-admin-data?resource=programs`, {
          headers,
        });
        setRows(data.items || []);
        return;
      }
      if (tab === 'cohorts') {
        const q = programFilter.trim() ? `&program_id=${encodeURIComponent(programFilter.trim())}` : '';
        const data = await jsonFetch<{ items: Record<string, unknown>[] }>(`${base}/lms-admin-data?resource=cohorts${q}`, {
          headers,
        });
        setRows(data.items || []);
        return;
      }
      if (tab === 'enrollments') {
        if (!cohortIdEnroll.trim()) {
          setRows([]);
          setLoading(false);
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
        const data = await jsonFetch<{ items: Record<string, unknown>[] }>(
          `${base}/lms-admin-data?resource=rubric-templates`,
          { headers },
        );
        setRows(data.items || []);
        return;
      }
      if (tab === 'criteria') {
        if (!rubricIdCrit.trim()) {
          setRows([]);
          setLoading(false);
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

  const tabs: { id: TabId; label: string }[] = [
    { id: 'programs', label: 'Programs' },
    { id: 'cohorts', label: 'Cohorts' },
    { id: 'enrollments', label: 'Cohort enrollments' },
    { id: 'rubrics', label: 'Rubric templates' },
    { id: 'criteria', label: 'Rubric criteria' },
    { id: 'certificates', label: 'Certificates' },
    { id: 'transcripts', label: 'Transcripts' },
  ];

  const renderTable = () => {
    if (!rows.length && !loading && (tab === 'enrollments' || tab === 'criteria')) {
      return <p className="p-4 text-sm text-[var(--brand-muted)]">Enter an ID above and load.</p>;
    }
    if (!rows.length && !loading) {
      return <p className="p-4 text-sm text-[var(--brand-muted)]">No rows.</p>;
    }
    const keys = rows.length ? Object.keys(rows[0]) : [];
    return (
      <Table>
        <TableHeader>
          <TableRow>
            {keys.slice(0, 8).map((k) => (
              <TableHead key={k}>
                {k.replace(/_/g, ' ')}
              </TableHead>
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

  return (
    <div className="space-y-6">
      <p className="text-sm text-[var(--brand-muted)]">
        Read-only catalog (GET). Staff create and edit records under Operations → LMS admin.
      </p>
      {err ? (
        <div className="rounded-lg border border-[var(--brand-danger)]/30 bg-[var(--brand-danger)]/10 p-3 text-sm text-[var(--brand-danger)]">
          {err}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              tab === t.id
                ? 'bg-[var(--brand-primary)] text-white'
                : 'border border-[var(--brand-border)] text-[var(--brand-muted)] hover:bg-[var(--brand-surface-2)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'cohorts' ? (
        <Card className="flex flex-wrap items-end gap-3">
          <div className="w-full max-w-md">
            <Input label="Filter by program_id (optional)" value={programFilter} onChange={(e) => setProgramFilter(e.target.value)} />
          </div>
          <Button type="button" onClick={() => void load()}>
            Reload
          </Button>
        </Card>
      ) : null}

      {tab === 'enrollments' ? (
        <Card className="flex flex-wrap items-end gap-3">
          <div className="w-full max-w-md">
            <Input label="Cohort ID" value={cohortIdEnroll} onChange={(e) => setCohortIdEnroll(e.target.value)} />
          </div>
          <Button type="button" onClick={() => void load()}>
            Load enrollments
          </Button>
        </Card>
      ) : null}

      {tab === 'criteria' ? (
        <Card className="flex flex-wrap items-end gap-3">
          <div className="w-full max-w-md">
            <Input label="Rubric template ID" value={rubricIdCrit} onChange={(e) => setRubricIdCrit(e.target.value)} />
          </div>
          <Button type="button" onClick={() => void load()}>
            Load criteria
          </Button>
        </Card>
      ) : null}

      {tab === 'certificates' ? (
        <Card className="flex flex-wrap items-end gap-3">
          <div className="w-full max-w-md">
            <Input label="Filter by trainee_id (optional)" value={traineeCert} onChange={(e) => setTraineeCert(e.target.value)} />
          </div>
          <Button type="button" onClick={() => void load()}>
            Reload
          </Button>
        </Card>
      ) : null}

      {tab === 'transcripts' ? (
        <Card className="flex flex-wrap items-end gap-3">
          <div className="w-full max-w-md">
            <Input label="Filter by trainee_id (optional)" value={traineeTrans} onChange={(e) => setTraineeTrans(e.target.value)} />
          </div>
          <Button type="button" onClick={() => void load()}>
            Reload
          </Button>
        </Card>
      ) : null}

      {tab === 'programs' || tab === 'rubrics' ? (
        <div>
          <Button type="button" variant="secondary" className="mb-2" onClick={() => void load()}>
            Reload
          </Button>
        </div>
      ) : null}

      {loading ? <p className="text-sm text-[var(--brand-muted)]">Loading…</p> : null}

      <Card noPadding>{renderTable()}</Card>
    </div>
  );
}
