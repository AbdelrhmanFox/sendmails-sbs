import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { SegmentedNav } from '../../components/design-system/SegmentedNav';
import { Input } from '../../components/design-system/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/design-system/Table';
import { functionsBase, getAuthHeaders, jsonFetch } from '../../../lib/api';

type TabId = 'programs' | 'cohorts' | 'enrollments' | 'rubrics' | 'criteria' | 'certificates' | 'transcripts';

const TAB_META: Record<
  TabId,
  { title: string; description: string; primaryAction: string; idHint?: string }
> = {
  programs: {
    title: 'Programs',
    description: 'Top-level curriculum products. Use cohorts to see scheduled runs of a program.',
    primaryAction: 'Reload programs',
  },
  cohorts: {
    title: 'Cohorts',
    description: 'Scheduled instances of programs. Optionally filter the list by program_id.',
    primaryAction: 'Reload cohorts',
  },
  enrollments: {
    title: 'Cohort enrollments',
    description: 'Trainees linked to a specific cohort. Enter the cohort UUID from the cohorts table.',
    primaryAction: 'Load enrollments',
    idHint: 'Paste a cohort_id, then load. Rows stay empty until you load.',
  },
  rubrics: {
    title: 'Rubric templates',
    description: 'Reusable scoring templates. Open rubric criteria after you copy a template id.',
    primaryAction: 'Reload rubrics',
  },
  criteria: {
    title: 'Rubric criteria',
    description: 'Line items and weights for one rubric template.',
    primaryAction: 'Load criteria',
    idHint: 'Paste a rubric template id from the rubrics tab, then load.',
  },
  certificates: {
    title: 'Certificates',
    description: 'Issued credentials. Optionally filter by trainee_id.',
    primaryAction: 'Reload certificates',
  },
  transcripts: {
    title: 'Transcripts',
    description: 'Formal learning history rows. Optionally filter by trainee_id.',
    primaryAction: 'Reload transcripts',
  },
};

const CATALOG_TABS_CURRICULUM: { value: TabId; label: string }[] = [
  { value: 'programs', label: 'Programs' },
  { value: 'cohorts', label: 'Cohorts' },
  { value: 'enrollments', label: 'Cohort enrollments' },
];

const CATALOG_TABS_ASSESSMENT: { value: TabId; label: string }[] = [
  { value: 'rubrics', label: 'Rubric templates' },
  { value: 'criteria', label: 'Rubric criteria' },
  { value: 'certificates', label: 'Certificates' },
  { value: 'transcripts', label: 'Transcripts' },
];

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
  const reduceMotion = useReducedMotion();

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

  const meta = TAB_META[tab];

  const renderToolbar = () => {
    const primary = (
      <Button type="button" onClick={() => void load()} loading={loading}>
        {meta.primaryAction}
      </Button>
    );

    if (tab === 'cohorts') {
      return (
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="min-w-0 flex-1 sm:max-w-md">
            <Input label="Filter by program_id (optional)" value={programFilter} onChange={(e) => setProgramFilter(e.target.value)} />
          </div>
          {primary}
        </div>
      );
    }
    if (tab === 'enrollments') {
      return (
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="min-w-0 flex-1 sm:max-w-md">
            <Input label="Cohort ID" value={cohortIdEnroll} onChange={(e) => setCohortIdEnroll(e.target.value)} />
          </div>
          {primary}
        </div>
      );
    }
    if (tab === 'criteria') {
      return (
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="min-w-0 flex-1 sm:max-w-md">
            <Input label="Rubric template ID" value={rubricIdCrit} onChange={(e) => setRubricIdCrit(e.target.value)} />
          </div>
          {primary}
        </div>
      );
    }
    if (tab === 'certificates') {
      return (
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="min-w-0 flex-1 sm:max-w-md">
            <Input label="Filter by trainee_id (optional)" value={traineeCert} onChange={(e) => setTraineeCert(e.target.value)} />
          </div>
          {primary}
        </div>
      );
    }
    if (tab === 'transcripts') {
      return (
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="min-w-0 flex-1 sm:max-w-md">
            <Input label="Filter by trainee_id (optional)" value={traineeTrans} onChange={(e) => setTraineeTrans(e.target.value)} />
          </div>
          {primary}
        </div>
      );
    }
    return <div className="flex flex-wrap items-center gap-3">{primary}</div>;
  };

  const renderTable = () => {
    if (!rows.length && !loading && (tab === 'enrollments' || tab === 'criteria')) {
      return <p className="p-4 text-sm text-[var(--brand-muted)]">Enter an ID in the toolbar and load.</p>;
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
    <div className="space-y-5">
      <p className="text-sm text-[var(--brand-muted)]">
        Read-only catalog (GET). Staff create and edit records under Operations → LMS admin.
      </p>

      <section
        className="rounded-[var(--brand-radius)] border border-[var(--brand-border)] bg-[var(--brand-surface)] p-4 shadow-[var(--brand-shadow-soft)]"
        aria-labelledby="lms-catalog-model-heading"
      >
        <h2 id="lms-catalog-model-heading" className="text-sm font-semibold text-[var(--brand-text)]">
          How this catalog fits together
        </h2>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-[var(--brand-muted)]">
          <li>
            <span className="font-medium text-[var(--brand-text)]">Programs</span> define what you teach;{' '}
            <span className="font-medium text-[var(--brand-text)]">cohorts</span> are dated runs of a program.
          </li>
          <li>
            <span className="font-medium text-[var(--brand-text)]">Cohort enrollments</span> link trainees to a cohort (requires cohort_id).
          </li>
          <li>
            <span className="font-medium text-[var(--brand-text)]">Rubric templates</span> and{' '}
            <span className="font-medium text-[var(--brand-text)]">criteria</span> describe how work is scored (criteria needs rubric id).
          </li>
          <li>
            <span className="font-medium text-[var(--brand-text)]">Certificates</span> and{' '}
            <span className="font-medium text-[var(--brand-text)]">transcripts</span> are completion artifacts (optional trainee_id filter).
          </li>
        </ol>
      </section>

      {err ? (
        <div className="rounded-lg border border-[var(--brand-danger)]/30 bg-[var(--brand-danger)]/10 p-3 text-sm text-[var(--brand-danger)]">
          {err}
        </div>
      ) : null}

      <div className="space-y-3">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--brand-muted)]">Curriculum and people</p>
          <div className="-mx-1 overflow-x-auto pb-1 [scrollbar-width:thin] md:mx-0">
            <div className="px-1 md:px-0">
              <SegmentedNav
                aria-label="LMS catalog curriculum views"
                variant="state"
                wrap={false}
                items={CATALOG_TABS_CURRICULUM}
                value={tab}
                onValueChange={setTab}
              />
            </div>
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--brand-muted)]">Assessment and records</p>
          <div className="-mx-1 overflow-x-auto pb-1 [scrollbar-width:thin] md:mx-0">
            <div className="px-1 md:px-0">
              <SegmentedNav
                aria-label="LMS catalog assessment views"
                variant="state"
                wrap={false}
                items={CATALOG_TABS_ASSESSMENT}
                value={tab}
                onValueChange={setTab}
              />
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={reduceMotion ? false : { opacity: 0, y: 4 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
          transition={{ duration: reduceMotion ? 0 : 0.15 }}
        >
          <Card className="mb-4">
            <h3 className="text-base font-semibold text-[var(--brand-text)]">{meta.title}</h3>
            <p className="mt-1 text-sm text-[var(--brand-muted)]">{meta.description}</p>
            {meta.idHint ? <p className="mt-2 text-xs text-[var(--brand-muted)]">{meta.idHint}</p> : null}
            <div className="mt-4 border-t border-[var(--brand-border)] pt-4">{renderToolbar()}</div>
          </Card>

          {loading ? <p className="mb-2 text-sm text-[var(--brand-muted)]">Loading…</p> : null}

          <Card noPadding className="min-h-[12rem] overflow-hidden">
            <div className="overflow-x-auto">{renderTable()}</div>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
