import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardHeader } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { Badge } from '../../components/design-system/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/design-system/Table';
import { EmptyState } from '../../components/design-system/EmptyState';
import { functionsBase, getAuthHeaders, jsonFetch } from '../../../lib/api';
import { TrainingSessionCreateModal } from './TrainingSessionCreateModal';

type TrainingSession = {
  id: string;
  title: string | null;
  trainer_username?: string | null;
  groups_count?: number | null;
  whiteboard_enabled?: boolean | null;
  created_at?: string | null;
  training_groups?: { id: string; group_number?: number; join_token?: string }[] | null;
};

export function TrainingSessionsPage() {
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const data = await jsonFetch<{ sessions: TrainingSession[] }>(`${functionsBase()}/training-sessions`, {
        headers: getAuthHeaders(),
      });
      setSessions(data.sessions || []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not load sessions');
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const groupCount = sessions.reduce((acc, s) => {
      const g = Array.isArray(s.training_groups) ? s.training_groups.length : Number(s.groups_count || 0);
      return acc + g;
    }, 0);
    const activeSessions = sessions.filter((s) => {
      const g = Array.isArray(s.training_groups) ? s.training_groups.length : Number(s.groups_count || 0);
      return g > 0;
    }).length;
    return { sessions: sessions.length, groups: groupCount, activeSessions };
  }, [sessions]);

  const shareHref = (sessionId: string) => {
    const base = `${window.location.origin}${window.location.pathname.replace(/\/spa\/?.*$/, '/')}`;
    return `${base}?session=${encodeURIComponent(sessionId)}`;
  };

  return (
    <div className="space-y-6">
      <TrainingSessionCreateModal open={createOpen} onOpenChange={setCreateOpen} onCreated={() => void load()} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[var(--brand-text)]">Live training sessions</h2>
          <p className="mt-1 text-sm text-[var(--brand-muted)]">Manage sessions and participant links</p>
        </div>
        <Button type="button" onClick={() => setCreateOpen(true)}>
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New session
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
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--brand-text)]">{stats.activeSessions}</p>
              <p className="text-sm text-[var(--brand-muted)]">Active sessions</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--brand-primary)]/10">
              <svg className="h-6 w-6 text-[var(--brand-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--brand-text)]">—</p>
              <p className="text-sm text-[var(--brand-muted)]">Total participants</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--brand-accent)]/10">
              <svg className="h-6 w-6 text-[var(--brand-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--brand-text)]">{stats.groups}</p>
              <p className="text-sm text-[var(--brand-muted)]">Active groups</p>
            </div>
          </div>
        </Card>
      </div>

      <Card noPadding>
        <div className="border-b border-[var(--brand-border)] p-6">
          <h3 className="text-lg font-semibold text-[var(--brand-text)]">Sessions</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Trainer</TableHead>
              <TableHead>Groups</TableHead>
              <TableHead>Participants</TableHead>
              <TableHead>Features</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!sessions.length && !loading ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <EmptyState title="No sessions" description="Create a session with New session above." />
                </TableCell>
              </TableRow>
            ) : null}
            {sessions.map((session) => {
              const groups = Array.isArray(session.training_groups)
                ? session.training_groups.length
                : Number(session.groups_count || 0);
              const created = session.created_at ? new Date(session.created_at).toLocaleString() : '—';
              const isActive = groups > 0;
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
                    <div className="flex items-center gap-2">
                      <svg className="h-4 w-4 text-[var(--brand-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                        />
                      </svg>
                      <span>—</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {session.whiteboard_enabled !== false && (
                        <Badge size="sm" variant="primary">
                          Whiteboard
                        </Badge>
                      )}
                      <Badge size="sm" variant="info">
                        Chat
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    {isActive ? (
                      <Badge variant="success" dot>
                        Live
                      </Badge>
                    ) : (
                      <Badge variant="neutral">Ended</Badge>
                    )}
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
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                          />
                        </svg>
                        Share link
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
            <p className="text-sm text-[var(--brand-muted)]">Participants can chat within their groups with message persistence</p>
          </div>
          <div className="rounded-lg bg-[var(--brand-surface-2)] p-4">
            <h4 className="mb-2 font-semibold text-[var(--brand-text)]">Shared whiteboard</h4>
            <p className="text-sm text-[var(--brand-muted)]">
              Optional collaborative whiteboard with real-time broadcast (no persistence)
            </p>
          </div>
          <div className="rounded-lg bg-[var(--brand-surface-2)] p-4">
            <h4 className="mb-2 font-semibold text-[var(--brand-text)]">Multi-group support</h4>
            <p className="text-sm text-[var(--brand-muted)]">Create up to 12 groups per session with unique join tokens</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
