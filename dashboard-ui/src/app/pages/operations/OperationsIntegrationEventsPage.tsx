import { useCallback, useEffect, useState } from 'react';
import { Badge } from '../../components/design-system/Badge';
import { Button } from '../../components/design-system/Button';
import { Card } from '../../components/design-system/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/design-system/Table';
import { functionsBase, getAuthHeaders, jsonFetch } from '../../../lib/api';

type IntegrationEventRow = {
  id: string;
  event_type?: string;
  source?: string;
  status?: string;
  payload?: unknown;
  created_at?: string;
  processed_at?: string | null;
};

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'info' | 'neutral'> = {
  processed: 'success',
  received: 'info',
  pending: 'warning',
  failed: 'warning',
};

export function OperationsIntegrationEventsPage() {
  const [items, setItems] = useState<IntegrationEventRow[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const q = statusFilter.trim() ? `?status=${encodeURIComponent(statusFilter.trim())}` : '';
      const data = await jsonFetch<{ items: IntegrationEventRow[] }>(
        `${functionsBase()}/integration-events${q}`,
        { headers: getAuthHeaders() },
      );
      setItems(data.items || []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not load integration events');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { void load(); }, [load]);

  const markProcessed = async (id: string) => {
    setMsg(''); setBusyId(id);
    try {
      await jsonFetch(`${functionsBase()}/integration-events`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id, status: 'processed' }),
      });
      setMsg('Event marked as processed.');
      void load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setBusyId(null);
    }
  };

  const payloadPreview = (payload: unknown) => {
    try {
      const s = JSON.stringify(payload);
      return s.length > 100 ? `${s.slice(0, 100)}…` : s;
    } catch { return '—'; }
  };

  return (
    <div className="space-y-4">
      {err && (
        <div className="rounded-lg border border-[var(--brand-danger)]/30 bg-[var(--brand-danger)]/10 p-3 text-sm text-[var(--brand-danger)]">{err}</div>
      )}
      {msg && (
        <p className="rounded-lg border border-[var(--brand-success)]/30 bg-[var(--brand-success)]/10 px-3 py-2 text-sm text-[var(--brand-success)]">{msg}</p>
      )}

      {/* Filter toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-[var(--brand-radius)] border border-[var(--brand-border)] bg-[var(--brand-surface)] px-4 py-3">
        <label className="text-xs font-medium text-[var(--brand-muted)]">Status</label>
        <input
          className="w-40 rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[var(--brand-surface-2)] px-2 py-1.5 text-sm text-[var(--brand-text)]"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          placeholder="e.g. received"
          onKeyDown={(e) => e.key === 'Enter' && void load()}
        />
        <Button type="button" size="sm" variant="secondary" onClick={() => void load()}>
          Apply
        </Button>
        {loading && <span className="text-xs text-[var(--brand-muted)]">Loading…</span>}
        {!loading && (
          <span className="ml-auto text-xs text-[var(--brand-muted)]">{items.length} event{items.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      <Card noPadding>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payload</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && !loading ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <p className="text-sm text-[var(--brand-muted)]">No integration events found.</p>
                </TableCell>
              </TableRow>
            ) : items.map((row) => {
              const status = String(row.status || '').toLowerCase();
              const isProcessed = status === 'processed';
              return (
                <TableRow key={String(row.id)}>
                  <TableCell className="whitespace-nowrap font-mono text-xs text-[var(--brand-muted)]">
                    {String(row.created_at || '').replace('T', ' ').slice(0, 19)}
                  </TableCell>
                  <TableCell className="font-medium text-[var(--brand-text)]">{String(row.event_type || '—')}</TableCell>
                  <TableCell className="text-xs text-[var(--brand-muted)]">{String(row.source || '—')}</TableCell>
                  <TableCell>
                    <Badge size="sm" variant={STATUS_VARIANT[status] ?? 'neutral'}>
                      {String(row.status || '—')}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className="max-w-[14rem] truncate font-mono text-xs text-[var(--brand-muted)]"
                    title={JSON.stringify(row.payload ?? {})}
                  >
                    {payloadPreview(row.payload)}
                  </TableCell>
                  <TableCell className="text-right">
                    {!isProcessed ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={busyId === String(row.id)}
                        onClick={() => void markProcessed(String(row.id))}
                      >
                        Mark processed
                      </Button>
                    ) : (
                      <span className="text-xs text-[var(--brand-success)]">Done</span>
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
