import { useMemo, useState } from 'react';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { Input } from '../../components/design-system/Input';
import { functionsBase, jsonFetch } from '../../../lib/api';

type SessionMeta = {
  title: string;
  whiteboardEnabled: boolean;
  voiceRoomUrl: string | null;
  groups: Array<{ group_number: number; join_token: string }>;
};

type JoinResult = {
  sessionTitle: string;
  groupNumber: number;
  participant?: { display_name?: string };
  whiteboardEnabled: boolean;
  voiceRoomUrl: string | null;
};

export function PublicSessionJoinPage({ sessionId, groupToken }: { sessionId?: string; groupToken?: string }) {
  const [meta, setMeta] = useState<SessionMeta | null>(null);
  const [selectedToken, setSelectedToken] = useState(groupToken || '');
  const [displayName, setDisplayName] = useState('');
  const [joined, setJoined] = useState<JoinResult | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const title = useMemo(() => joined?.sessionTitle || meta?.title || 'Join session', [joined, meta]);

  const loadSession = async () => {
    if (!sessionId) return;
    setBusy(true);
    setError('');
    try {
      const data = await jsonFetch<SessionMeta>(`${functionsBase()}/public-training-session?sessionId=${encodeURIComponent(sessionId)}`);
      setMeta(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load session');
    } finally {
      setBusy(false);
    }
  };

  const loadGroup = async () => {
    if (!selectedToken) return;
    setBusy(true);
    setError('');
    try {
      const data = await jsonFetch<JoinResult>(`${functionsBase()}/training-join?token=${encodeURIComponent(selectedToken)}`);
      setJoined(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid group link');
    } finally {
      setBusy(false);
    }
  };

  const submitJoin = async () => {
    if (!selectedToken || displayName.trim().length < 2) return;
    setBusy(true);
    setError('');
    try {
      const data = await jsonFetch<JoinResult>(`${functionsBase()}/training-join?token=${encodeURIComponent(selectedToken)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: displayName.trim() }),
      });
      setJoined(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not join');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <h1 className="text-xl font-semibold text-[var(--brand-text)]">{title}</h1>
        <p className="text-sm text-[var(--brand-muted)]">
          Pick your group and enter your name. This page is the React replacement for the legacy participant flow.
        </p>
        {error ? <p className="text-sm text-[var(--brand-danger)]">{error}</p> : null}
      </Card>

      {sessionId ? (
        <Card className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => void loadSession()} loading={busy}>
              Load groups
            </Button>
          </div>
          {meta ? (
            <div className="space-y-2">
              <p className="text-sm text-[var(--brand-text)]">Session: {meta.title}</p>
              <div className="flex flex-wrap gap-2">
                {meta.groups.map((g) => (
                  <Button
                    key={g.join_token}
                    type="button"
                    variant={selectedToken === g.join_token ? 'primary' : 'secondary'}
                    onClick={() => setSelectedToken(g.join_token)}
                  >
                    Group {g.group_number}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}
        </Card>
      ) : null}

      <Card className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Input
            className="max-w-md"
            placeholder="Group token"
            value={selectedToken}
            onChange={(e) => setSelectedToken(e.target.value)}
          />
          <Button type="button" variant="secondary" onClick={() => void loadGroup()} loading={busy}>
            Validate link
          </Button>
        </div>
        <Input
          label="Display name"
          placeholder="Your name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        <Button type="button" onClick={() => void submitJoin()} loading={busy}>
          Join now
        </Button>
      </Card>

      {joined ? (
        <Card>
          <h2 className="text-lg font-semibold text-[var(--brand-text)]">You are in</h2>
          <p className="mt-2 text-sm text-[var(--brand-text)]">
            {joined.sessionTitle} - Group {joined.groupNumber}
          </p>
          {joined.participant?.display_name ? (
            <p className="text-sm text-[var(--brand-muted)]">Participant: {joined.participant.display_name}</p>
          ) : null}
          {joined.voiceRoomUrl ? (
            <a className="mt-2 inline-block text-sm text-[var(--brand-primary)] underline" href={joined.voiceRoomUrl} target="_blank" rel="noreferrer">
              Open voice room
            </a>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}
