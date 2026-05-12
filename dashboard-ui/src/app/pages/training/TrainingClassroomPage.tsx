import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { Badge } from '../../components/design-system/Badge';
import { Skeleton } from '../../components/ui/skeleton';
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
  const [materialModal, setMaterialModal] = useState<ClassroomRow | null>(null);
  const [copiedId, setCopiedId] = useState('');

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
    return () => { c = true; };
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

  const copyLink = async (batchId: string, token: string) => {
    const url = `${window.location.origin}${window.location.pathname.replace(/\/spa\/?.*$/, '/')}?classroom=${encodeURIComponent(token)}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(batchId);
    setTimeout(() => setCopiedId(''), 2000);
  };

  return (
    <div className="space-y-4">
      {err && <p className="rounded-lg border border-[var(--brand-danger)]/30 bg-[var(--brand-danger)]/10 px-3 py-2 text-sm text-[var(--brand-danger)]">{err}</p>}

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 rounded-[var(--brand-radius-dense)]" />
          <Skeleton className="h-16 rounded-[var(--brand-radius-dense)]" />
          <Skeleton className="h-16 rounded-[var(--brand-radius-dense)]" />
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <p className="text-sm text-[var(--brand-muted)]">No classrooms found. Create a batch with enrolled trainees first.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => {
            const tok = tokens[r.batch_id];
            const copied = copiedId === r.batch_id;
            return (
              <div key={r.batch_id} className="flex flex-wrap items-center gap-3 rounded-[var(--brand-radius)] border border-[var(--brand-border)] bg-[var(--brand-surface)] px-4 py-3">
                {/* Batch info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--brand-text)]">{r.batch_name || r.batch_id}</p>
                  <p className="text-xs text-[var(--brand-muted)]">{r.course_name || r.course_id || 'Course'} · {r.trainer || 'No trainer'}</p>
                </div>

                {/* Enrolled count */}
                <Badge variant="info">{r.enrolled_count} enrolled</Badge>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2">
                  {!tok ? (
                    <Button type="button" size="sm" variant="secondary" onClick={() => void loadToken(r.batch_id)}>
                      Get link
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant={copied ? 'primary' : 'secondary'}
                      onClick={() => void copyLink(r.batch_id, tok)}
                    >
                      {copied ? (
                        <>
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                          Copied!
                        </>
                      ) : (
                        <>
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" /></svg>
                          Copy link
                        </>
                      )}
                    </Button>
                  )}

                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => setMaterialModal(r)}
                  >
                    Materials
                  </Button>

                  <Link
                    to={`/training/assignments?batch=${encodeURIComponent(r.batch_id)}`}
                    className="inline-flex h-8 items-center gap-1.5 rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[var(--brand-surface-2)] px-3 text-xs font-medium text-[var(--brand-text)] transition-colors hover:bg-[var(--brand-primary-subtle)] hover:text-[var(--brand-primary-2)]"
                  >
                    Assignments
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Materials modal */}
      {materialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setMaterialModal(null)}>
          <div
            className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-[var(--brand-radius)] border border-[var(--brand-border)] bg-[var(--brand-surface)] shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-start justify-between border-b border-[var(--brand-border)] px-5 py-4">
              <div>
                <h3 className="font-semibold text-[var(--brand-text)]">Materials</h3>
                <p className="text-xs text-[var(--brand-muted)]">{materialModal.batch_name || materialModal.batch_id} · {materialModal.course_name}</p>
              </div>
              <button type="button" onClick={() => setMaterialModal(null)} className="text-[var(--brand-dim)] hover:text-[var(--brand-text)]" aria-label="Close">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              <BatchMaterialManager batchId={materialModal.batch_id} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
