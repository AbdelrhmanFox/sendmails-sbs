import { useEffect, useState } from 'react';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/design-system/Table';
import { functionsBase, getAuthHeaders, jsonFetch } from '../../../lib/api';

type Session = {
  id: string;
  title: string | null;
  voice_room_url?: string | null;
  trainer_username?: string | null;
};

export function TrainingPresenterPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let c = false;
    (async () => {
      setLoading(true);
      try {
        const data = await jsonFetch<{ sessions: Session[] }>(`${functionsBase()}/training-sessions`, { headers: getAuthHeaders() });
        if (!c) setSessions(data.sessions || []);
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

  const share = (id: string) =>
    `${window.location.origin}${window.location.pathname.replace(/\/spa\/?.*$/, '/')}?session=${encodeURIComponent(id)}`;

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--brand-muted)]">
        Use your session title and participant link when presenting. Optional voice room URL is stored on the session when created.
      </p>
      {err ? <p className="text-sm text-[var(--brand-danger)]">{err}</p> : null}
      {loading ? <p className="text-sm text-[var(--brand-muted)]">Loading…</p> : null}
      <Card noPadding>
        <div className="border-b border-[var(--brand-border)] p-4">
          <h2 className="text-lg font-semibold text-[var(--brand-text)]">Sessions for presenting</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Trainer</TableHead>
              <TableHead>Voice room</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.title || 'Session'}</TableCell>
                <TableCell>{s.trainer_username || '—'}</TableCell>
                <TableCell className="max-w-[200px] truncate text-xs">
                  {s.voice_room_url ? (
                    <a className="text-[var(--brand-primary)] underline" href={s.voice_room_url} target="_blank" rel="noreferrer">
                      Open room
                    </a>
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="secondary" type="button" onClick={() => void navigator.clipboard.writeText(share(s.id))}>
                    Copy participant link
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
