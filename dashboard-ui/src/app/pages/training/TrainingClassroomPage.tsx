import { useEffect, useState } from 'react';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { Input } from '../../components/design-system/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/design-system/Table';
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
              return (
                <TableRow key={r.batch_id}>
                  <TableCell>
                    <span className="font-mono text-xs">{r.batch_id}</span>
                    <div className="text-sm">{r.batch_name || '—'}</div>
                  </TableCell>
                  <TableCell>{r.course_name || r.course_id || '—'}</TableCell>
                  <TableCell>{r.enrolled_count}</TableCell>
                  <TableCell>
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
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
