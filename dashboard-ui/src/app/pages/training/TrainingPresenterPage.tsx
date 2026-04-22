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
  const [mode, setMode] = useState<'links' | 'tools'>('links');
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
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant={mode === 'links' ? 'primary' : 'secondary'} onClick={() => setMode('links')}>
          Session links
        </Button>
        <Button type="button" variant={mode === 'tools' ? 'primary' : 'secondary'} onClick={() => setMode('tools')}>
          Presenter tools
        </Button>
      </div>
      {mode === 'links' ? (
        <p className="text-sm text-[var(--brand-muted)]">
          Use your session title and participant link when presenting. Optional voice room URL is stored on the session when created.
        </p>
      ) : (
        <p className="text-sm text-[var(--brand-muted)]">
          Full legacy presenter suite (QR, script reader, teleprompter, shortcuts) is opened here until native React parity is completed.
        </p>
      )}
      {err ? <p className="text-sm text-[var(--brand-danger)]">{err}</p> : null}
      {mode === 'links' ? (
        <>
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
        </>
      ) : (
        <Card noPadding>
          <iframe
            title="Presenter tools"
            src="/classic/index.html#/training/training-presenter-tools"
            className="h-[calc(100vh-240px)] min-h-[700px] w-full border-0"
          />
        </Card>
      )}
    </div>
  );
}
