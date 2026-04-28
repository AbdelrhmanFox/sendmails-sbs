import { Fragment, useEffect, useState } from 'react';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { Input } from '../../components/design-system/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/design-system/Table';
import { BatchMaterialManager } from '../../components/training/BatchMaterialManager';
import { functionsBase, getAuthHeaders, jsonFetch } from '../../../lib/api';

type ClassroomRow = {
  batch_id: string;
  batch_name: string | null;
  course_id: string | null;
  course_name: string;
  trainer: string | null;
  enrolled_count: number;
};

export function TrainingClassroomPage() {
  const [rows, setRows] = useState<ClassroomRow[]>([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [tokens, setTokens] = useState<Record<string, string>>({});
  const [openMaterialBatchId, setOpenMaterialBatchId] = useState('');

  useEffect(() => {
    let c = false;
    (async () => {
      setLoading(true);
      try {
        const data = await jsonFetch<{ items: ClassroomRow[] }>(`${functionsBase()}/classroom-data?resource=classrooms`, {
          headers: getAuthHeaders(),
        });
        if (!c) setRows(data.items || []);
      } catch (e) {
        if (!c) setErr(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, []);

  const loadToken = async (batchId: string) => {
    try {
      const data = await jsonFetch<{ token: string }>(
        `${functionsBase()}/classroom-data?resource=share-link&batch_id=${encodeURIComponent(batchId)}`,
        { headers: getAuthHeaders() },
      );
      setTokens((prev) => ({ ...prev, [batchId]: data.token }));
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not load share link');
    }
  };

  const publicClassroomUrl = (token: string) =>
    `${window.location.origin}${window.location.pathname.replace(/\/spa\/?.*$/, '/')}?classroom=${encodeURIComponent(token)}`;

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--brand-muted)]">Classroom batches and participant links (same APIs as the legacy trainer classroom).</p>
      {err ? <p className="text-sm text-[var(--brand-danger)]">{err}</p> : null}
      {loading ? <p className="text-sm text-[var(--brand-muted)]">Loading…</p> : null}
      <Card noPadding>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Batch</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Enrolled</TableHead>
              <TableHead>Participant link</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const tok = tokens[r.batch_id];
              const isOpen = openMaterialBatchId === r.batch_id;
              return (
                <Fragment key={r.batch_id}>
                  <TableRow>
                    <TableCell>
                      <span className="font-mono text-xs">{r.batch_id}</span>
                      <div className="text-sm">{r.batch_name || '—'}</div>
                    </TableCell>
                    <TableCell>{r.course_name || r.course_id || '—'}</TableCell>
                    <TableCell>{r.enrolled_count}</TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        {!tok ? (
                          <Button size="sm" type="button" variant="secondary" onClick={() => void loadToken(r.batch_id)}>
                            Get link
                          </Button>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <Input readOnly value={publicClassroomUrl(tok)} className="text-xs" />
                            <Button
                              size="sm"
                              type="button"
                              variant="secondary"
                              onClick={() => void navigator.clipboard.writeText(publicClassroomUrl(tok))}
                            >
                              Copy
                            </Button>
                          </div>
                        )}
                        <Button
                          size="sm"
                          type="button"
                          variant={isOpen ? 'primary' : 'secondary'}
                          onClick={() => setOpenMaterialBatchId((prev) => (prev === r.batch_id ? '' : r.batch_id))}
                        >
                          {isOpen ? 'Hide materials' : 'Manage materials'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {isOpen ? (
                    <TableRow>
                      <TableCell colSpan={4}>
                        <div className="rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] p-3">
                          <h3 className="mb-3 text-sm font-semibold text-[var(--brand-text)]">
                            Materials for {r.batch_name || r.batch_id}
                          </h3>
                          <BatchMaterialManager batchId={r.batch_id} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : null}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
