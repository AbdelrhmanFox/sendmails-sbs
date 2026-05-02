import { useCallback, useEffect, useState } from 'react';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
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

export function OperationsIntegrationEventsPage() {
  const [items, setItems] = useState<IntegrationEventRow[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
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

  useEffect(() => {
    void load();
  }, [load]);

  const markProcessed = async (id: string) => {
    setMsg('');
    setBusyId(id);
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
      return s.length > 120 ? `${s.slice(0, 120)}…` : s;
    } catch {
      return '—';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[var(--brand-text)]">Integration events</h2>
        <p className="mt-1 text-sm text-[var(--brand-muted)]">
          Inbound integration log (admin and staff). External systems POST with{' '}
          <code className="rounded bg-[var(--brand-surface-2)] px-1 text-xs">X-Integration-Secret</code>.
        </p>
      </div>
      {err ? (
        <div className="rounded-lg border border-[var(--brand-danger)]/30 bg-[var(--brand-danger)]/10 p-3 text-sm text-[var(--brand-danger)]">
          {err}
        </div>
      ) : null}
      {msg ? <p className="text-sm text-[var(--brand-text)]">{msg}</p> : null}

      <Card className="flex flex-wrap items-end gap-3">
        <div className="min-w-[12rem]">
          <label className="mb-1.5 block text-sm font-medium text-[var(--brand-text)]">Filter by status</label>
          <input
            className="w-full rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-sm text-[var(--brand-text)]"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            placeholder="e.g. received"
          />
        </div>
        <Button type="button" variant="secondary" onClick={() => void load()}>
          Apply filter
        </Button>
      </Card>

      {loading ? <p className="text-sm text-[var(--brand-muted)]">Loading…</p> : null}

      <Card noPadding>
        <div className="border-b border-[var(--brand-border)] p-4">
          <h3 className="text-lg font-semibold text-[var(--brand-text)]">Recent events</h3>
        </div>
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
            {items.map((row) => (
              <TableRow key={String(row.id)}>
                <TableCell className="whitespace-nowrap font-mono text-xs">
                  {String(row.created_at || '').replace('T', ' ').slice(0, 19)}
                </TableCell>
                <TableCell>{String(row.event_type || '')}</TableCell>
                <TableCell>{String(row.source || '')}</TableCell>
                <TableCell>{String(row.status || '')}</TableCell>
                <TableCell className="max-w-[14rem] truncate font-mono text-xs" title={JSON.stringify(row.payload ?? {})}>
                  {payloadPreview(row.payload)}
                </TableCell>
                <TableCell className="text-right">
                  {String(row.status || '').toLowerCase() !== 'processed' ? (
                    <Button
                      type="button"
                      size="sm"
                      disabled={busyId === String(row.id)}
                      onClick={() => void markProcessed(String(row.id))}
                    >
                      Mark processed
                    </Button>
                  ) : (
                    <span className="text-xs text-[var(--brand-muted)]">Done</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
