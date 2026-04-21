import { useEffect, useMemo, useState } from 'react';
import { Card, CardHeader } from '../components/design-system/Card';
import { Button } from '../components/design-system/Button';
import { Badge } from '../components/design-system/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/design-system/Table';
import { functionsBase, getAuthHeaders, jsonFetch } from '../../lib/api';

type TrainingSession = {
  id: string;
  title: string | null;
  trainer_username?: string | null;
  groups_count?: number | null;
  whiteboard_enabled?: boolean | null;
  created_at?: string | null;
  training_groups?: { id: string; group_number?: number; join_token?: string }[] | null;
};

export function TrainingPage() {
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr('');
      try {
        const data = await jsonFetch<{ sessions: TrainingSession[] }>(`${functionsBase()}/training-sessions`, {
          headers: getAuthHeaders(),
        });
        if (!cancelled) setSessions(data.sessions || []);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'Could not load sessions');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const groupCount = sessions.reduce((acc, s) => {
      const g = Array.isArray(s.training_groups) ? s.training_groups.length : Number(s.groups_count || 0);
      return acc + g;
    }, 0);
    return { sessions: sessions.length, groups: groupCount };
  }, [sessions]);

  const shareHref = (sessionId: string) => {
    const base = `${window.location.origin}${window.location.pathname.replace(/\/spa\/?.*$/, '/')}`;
    return `${base}?session=${encodeURIComponent(sessionId)}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--brand-text)]">Live Training Sessions</h1>
          <p className="mt-1 text-sm text-[var(--brand-muted)]">Manage real-time training sessions and groups</p>
        </div>
        <Button type="button" onClick={() => (window.location.href = '/#/training/training')}>
          New session (classic UI)
        </Button>
      </div>

      {err && (
        <div className="rounded-lg border border-[var(--brand-danger)]/30 bg-[var(--brand-danger)]/10 p-3 text-sm text-[var(--brand-danger)]">
          {err}
        </div>
      )}
      {loading && <p className="text-sm text-[var(--brand-muted)]">Loading…</p>}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--brand-success)]/10">
              <svg className="h-6 w-6 text-[var(--brand-success)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--brand-text)]">{stats.sessions}</p>
              <p className="text-sm text-[var(--brand-muted)]">Sessions (loaded)</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--brand-accent)]/10">
              <svg className="h-6 w-6 text-[var(--brand-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--brand-text)]">{stats.groups}</p>
              <p className="text-sm text-[var(--brand-muted)]">Total groups</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--brand-primary)]/10">
              <svg className="h-6 w-6 text-[var(--brand-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--brand-text)]">—</p>
              <p className="text-sm text-[var(--brand-muted)]">Participants (see classic)</p>
            </div>
          </div>
        </Card>
      </div>

      <Card noPadding>
        <div className="border-b border-[var(--brand-border)] p-6">
          <h3 className="text-lg font-semibold text-[var(--brand-text)]">Training Sessions</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Trainer</TableHead>
              <TableHead>Groups</TableHead>
              <TableHead>Features</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((session) => {
              const groups = Array.isArray(session.training_groups) ? session.training_groups.length : Number(session.groups_count || 0);
              const created = session.created_at ? new Date(session.created_at).toLocaleString() : '—';
              return (
                <TableRow key={session.id} interactive>
                  <TableCell>
                    <span className="font-medium">{session.title || 'Session'}</span>
                  </TableCell>
                  <TableCell>{session.trainer_username || '—'}</TableCell>
                  <TableCell>
                    <Badge size="sm" variant="info">
                      {groups} groups
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-2">
                      {session.whiteboard_enabled !== false && <Badge size="sm" variant="primary">Whiteboard</Badge>}
                      <Badge size="sm" variant="info">
                        Chat
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-[var(--brand-muted)]">{created}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        type="button"
                        onClick={() => {
                          void navigator.clipboard.writeText(shareHref(session.id));
                        }}
                      >
                        Copy student link
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <Card>
        <CardHeader title="Session features" subtitle="Available tools for training sessions" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg bg-[var(--brand-surface-2)] p-4">
            <h4 className="mb-2 font-semibold text-[var(--brand-text)]">Real-time chat</h4>
            <p className="text-sm text-[var(--brand-muted)]">Participants chat within their groups.</p>
          </div>
          <div className="rounded-lg bg-[var(--brand-surface-2)] p-4">
            <h4 className="mb-2 font-semibold text-[var(--brand-text)]">Shared whiteboard</h4>
            <p className="text-sm text-[var(--brand-muted)]">Optional collaborative board (not persisted).</p>
          </div>
          <div className="rounded-lg bg-[var(--brand-surface-2)] p-4">
            <h4 className="mb-2 font-semibold text-[var(--brand-text)]">Multi-group</h4>
            <p className="text-sm text-[var(--brand-muted)]">Up to 12 groups per session with join tokens.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
