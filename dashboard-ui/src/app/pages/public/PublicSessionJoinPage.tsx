import { useEffect, useRef, useState } from 'react';
import { createClient, type RealtimeChannel } from '@supabase/supabase-js';
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

type JoinResponse = {
  groupId: string;
  groupNumber: number;
  sessionTitle: string;
  whiteboardEnabled: boolean;
  voiceRoomUrl: string | null;
  participant: { id: string; display_name: string };
};

type ChatMessage = { id: string; sender_name: string; body: string; created_at: string };
type PresencePeer = { id: string; name: string; muted: boolean; sticker: string };
type Reaction = { id: string; text: string };
type JoinStage = 'loadingGroups' | 'pickGroup' | 'enterName' | 'joining' | 'joined';

const STICKERS = ['😀', '🔥', '👏'];

export function PublicSessionJoinPage({ sessionId, groupToken }: { sessionId?: string; groupToken?: string }) {
  const [displayName, setDisplayName] = useState('');
  const [meta, setMeta] = useState<SessionMeta | null>(null);
  const [selectedToken, setSelectedToken] = useState(groupToken || '');
  const [stage, setStage] = useState<JoinStage>(sessionId ? 'loadingGroups' : 'enterName');
  const [joinData, setJoinData] = useState<JoinResponse | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [muted, setMuted] = useState(false);
  const [sticker, setSticker] = useState(STICKERS[0]);
  const [peers, setPeers] = useState<PresencePeer[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (groupToken) {
      setSelectedToken(groupToken);
      if (!sessionId) setStage('enterName');
    }
  }, [groupToken, sessionId]);

  useEffect(() => {
    if (!sessionId) {
      setStage('enterName');
      return;
    }
    let cancelled = false;
    setStage('loadingGroups');
    setErr('');
    (async () => {
      try {
        const data = await jsonFetch<SessionMeta>(`${functionsBase()}/public-training-session?sessionId=${encodeURIComponent(sessionId)}`);
        if (cancelled) return;
        setMeta(data);
        setStage('pickGroup');
      } catch (e) {
        if (cancelled) return;
        setErr(e instanceof Error ? e.message : 'Could not load session groups');
        setStage('pickGroup');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const addReaction = (text: string) => {
    setReactions((prev) => [{ id: `${Date.now()}-${Math.random()}`, text }, ...prev].slice(0, 20));
  };

  const fetchMessages = async (groupId: string) => {
    try {
      const data = await jsonFetch<{ messages: ChatMessage[] }>(`${functionsBase()}/training-messages?groupId=${encodeURIComponent(groupId)}`);
      setMessages(data.messages || []);
    } catch (_) {
      // keep last known state
    }
  };

  const drawLine = (x1: number, y1: number, x2: number, y2: number) => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  };

  const broadcast = async (event: string, payload: Record<string, unknown>) => {
    if (!channelRef.current) return;
    await channelRef.current.send({ type: 'broadcast', event, payload });
  };

  const startRealtime = async (joined: JoinResponse) => {
    const cfg = await jsonFetch<{ supabaseUrl: string; supabaseAnonKey: string; realtimeEnabled: boolean }>(`${functionsBase()}/public-config`);
    if (!cfg.realtimeEnabled || !cfg.supabaseUrl || !cfg.supabaseAnonKey) return;
    const client = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
    supabaseRef.current = client;
    const topic = `public-live-${joined.groupId}`;
    const ch = client.channel(topic, { config: { presence: { key: joined.participant.id } } });
    channelRef.current = ch;

    ch.on('broadcast', { event: 'chat' }, ({ payload }) => {
      const msg = payload as ChatMessage;
      setMessages((prev) => [...prev, msg].slice(-300));
    });
    ch.on('broadcast', { event: 'draw' }, ({ payload }) => {
      const p = payload as { x1: number; y1: number; x2: number; y2: number };
      drawLine(p.x1, p.y1, p.x2, p.y2);
    });
    ch.on('broadcast', { event: 'clear-board' }, () => {
      const cvs = canvasRef.current;
      if (!cvs) return;
      const ctx = cvs.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, cvs.width, cvs.height);
    });
    ch.on('broadcast', { event: 'reaction' }, ({ payload }) => {
      const p = payload as { name: string; reaction: string };
      addReaction(`${p.name}: ${p.reaction}`);
    });
    ch.on('broadcast', { event: 'join' }, ({ payload }) => {
      const p = payload as { name: string };
      addReaction(`${p.name} joined`);
    });
    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState();
      const all: PresencePeer[] = [];
      Object.values(state).forEach((arr) => {
        (arr || []).forEach((item: Record<string, unknown>) => {
          all.push({
            id: String(item.presence_ref || item.id || ''),
            name: String(item.name || 'Guest'),
            muted: Boolean(item.muted),
            sticker: String(item.sticker || STICKERS[0]),
          });
        });
      });
      setPeers(all);
    });

    await ch.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await ch.track({
          id: joined.participant.id,
          name: joined.participant.display_name,
          muted: false,
          sticker,
          online_at: new Date().toISOString(),
        });
        await broadcast('join', { name: joined.participant.display_name });
      }
    });
  };

  useEffect(() => {
    if (!joinData) return;
    void fetchMessages(joinData.groupId);
    const t = window.setInterval(() => void fetchMessages(joinData.groupId), 5000);
    return () => {
      window.clearInterval(t);
    };
  }, [joinData]);

  useEffect(() => {
    if (!joinData || !channelRef.current) return;
    void channelRef.current.track({
      id: joinData.participant.id,
      name: joinData.participant.display_name,
      muted,
      sticker,
      online_at: new Date().toISOString(),
    });
  }, [muted, sticker, joinData]);

  useEffect(
    () => () => {
      if (channelRef.current) void channelRef.current.unsubscribe();
      if (supabaseRef.current) void supabaseRef.current.removeAllChannels();
    },
    [],
  );

  const toNameStep = (token: string) => {
    setErr('');
    setSelectedToken(token);
    setStage('enterName');
  };

  const doJoin = async (token: string) => {
    setErr('');
    setStage('joining');
    setBusy(true);
    try {
      const joined = await jsonFetch<JoinResponse>(`${functionsBase()}/training-join?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: displayName.trim() }),
      });
      setJoinData(joined);
      await startRealtime(joined);
      setStage('joined');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not join session');
      setStage('enterName');
    } finally {
      setBusy(false);
    }
  };

  const sendChat = async () => {
    if (!joinData || !chatInput.trim()) return;
    const body = chatInput.trim();
    setChatInput('');
    try {
      const sent = await jsonFetch<{ message: ChatMessage }>(`${functionsBase()}/training-messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: joinData.groupId,
          participantId: joinData.participant.id,
          senderName: joinData.participant.display_name,
          body,
        }),
      });
      setMessages((prev) => [...prev, sent.message].slice(-300));
      await broadcast('chat', sent.message as unknown as Record<string, unknown>);
    } catch (_) {
      // keep flow smooth even on send errors
    }
  };

  const toLocalPoint = (evt: React.MouseEvent<HTMLCanvasElement>) => {
    const cvs = canvasRef.current!;
    const rect = cvs.getBoundingClientRect();
    return { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
  };

  const onMouseDown = (evt: React.MouseEvent<HTMLCanvasElement>) => {
    drawingRef.current = true;
    lastPointRef.current = toLocalPoint(evt);
  };

  const onMouseUp = () => {
    drawingRef.current = false;
    lastPointRef.current = null;
  };

  const onMouseMove = (evt: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || !joinData || !joinData.whiteboardEnabled) return;
    const curr = toLocalPoint(evt);
    const prev = lastPointRef.current;
    if (!prev) return;
    drawLine(prev.x, prev.y, curr.x, curr.y);
    lastPointRef.current = curr;
    void broadcast('draw', { x1: prev.x, y1: prev.y, x2: curr.x, y2: curr.y });
  };

  return (
    <div className="space-y-4">
      <Card className="space-y-2">
        <h1 className="text-xl font-semibold text-[var(--brand-text)]">{joinData?.sessionTitle || meta?.title || 'Live session'}</h1>
        <p className="text-sm text-[var(--brand-muted)]">
          Enter your name, pick a group, then use live chat, whiteboard, voice, reactions, and presence from this React page.
        </p>
        {err ? <p className="text-sm text-[var(--brand-danger)]">{err}</p> : null}
      </Card>

      {stage === 'loadingGroups' ? (
        <Card className="space-y-3">
          <p className="text-sm text-[var(--brand-muted)]">Loading available groups…</p>
        </Card>
      ) : null}

      {stage === 'pickGroup' && sessionId ? (
        <Card className="space-y-3">
          <p className="text-sm text-[var(--brand-muted)]">Choose your group first.</p>
          <div className="flex flex-wrap gap-2">
            {(meta?.groups || []).map((g) => (
              <Button key={g.join_token} type="button" variant="secondary" onClick={() => toNameStep(g.join_token)}>
                Group {g.group_number}
              </Button>
            ))}
          </div>
          {meta && meta.groups.length === 0 ? <p className="text-sm text-[var(--brand-muted)]">No groups available yet.</p> : null}
        </Card>
      ) : null}

      {stage === 'enterName' ? (
        <Card className="space-y-3">
          <Input label="Your name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          <Button
            type="button"
            loading={busy}
            disabled={!selectedToken || displayName.trim().length < 2}
            onClick={() => void doJoin(selectedToken)}
          >
            Join now
          </Button>
        </Card>
      ) : null}

      {stage === 'joining' ? (
        <Card className="space-y-3">
          <p className="text-sm text-[var(--brand-muted)]">Joining session…</p>
        </Card>
      ) : null}

      {stage === 'joined' && joinData ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="space-y-3 lg:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-[var(--brand-text)]">
                Group {joinData.groupNumber} · {joinData.participant.display_name}
              </p>
              <div className="flex items-center gap-2">
                <Button size="sm" type="button" variant={muted ? 'danger' : 'secondary'} onClick={() => setMuted((m) => !m)}>
                  {muted ? 'Muted' : 'Mute'}
                </Button>
                {joinData.voiceRoomUrl ? (
                  <a href={joinData.voiceRoomUrl} target="_blank" rel="noreferrer">
                    <Button size="sm" type="button" variant="secondary">
                      Join voice
                    </Button>
                  </a>
                ) : null}
              </div>
            </div>
            {joinData.whiteboardEnabled ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-[var(--brand-muted)]">Shared whiteboard</p>
                  <Button
                    size="sm"
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      const cvs = canvasRef.current;
                      if (!cvs) return;
                      const ctx = cvs.getContext('2d');
                      if (!ctx) return;
                      ctx.clearRect(0, 0, cvs.width, cvs.height);
                      void broadcast('clear-board', {});
                    }}
                  >
                    Clear
                  </Button>
                </div>
                <canvas
                  ref={canvasRef}
                  width={980}
                  height={420}
                  className="w-full rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[#0b1230]"
                  onMouseDown={onMouseDown}
                  onMouseMove={onMouseMove}
                  onMouseUp={onMouseUp}
                  onMouseLeave={onMouseUp}
                />
              </div>
            ) : null}
          </Card>

          <Card className="space-y-3">
            <h3 className="font-semibold text-[var(--brand-text)]">Chat</h3>
            <div className="h-[260px] space-y-2 overflow-auto rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] p-2">
              {messages.map((m) => (
                <div key={m.id} className="rounded bg-[var(--brand-surface-2)] p-2">
                  <p className="text-xs font-semibold text-[var(--brand-text)]">{m.sender_name}</p>
                  <p className="text-sm text-[var(--brand-text)]">{m.body}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Type a message" />
              <Button type="button" onClick={() => void sendChat()}>
                Send
              </Button>
            </div>
          </Card>

          <Card className="space-y-3">
            <h3 className="font-semibold text-[var(--brand-text)]">Reactions & presence</h3>
            <div className="flex gap-2">
              {STICKERS.map((s) => (
                <Button
                  key={s}
                  size="sm"
                  type="button"
                  variant={sticker === s ? 'primary' : 'secondary'}
                  onClick={() => {
                    setSticker(s);
                    void broadcast('reaction', { name: joinData.participant.display_name, reaction: s });
                  }}
                >
                  {s}
                </Button>
              ))}
            </div>
            <div className="space-y-1 rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] p-2">
              <p className="text-xs font-semibold text-[var(--brand-muted)]">Online</p>
              {peers.map((p) => (
                <p key={p.id} className="text-sm text-[var(--brand-text)]">
                  {p.sticker} {p.name} {p.muted ? '(muted)' : ''}
                </p>
              ))}
            </div>
            <div className="space-y-1 rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] p-2">
              <p className="text-xs font-semibold text-[var(--brand-muted)]">Activity</p>
              {reactions.map((r) => (
                <p key={r.id} className="text-sm text-[var(--brand-text)]">
                  {r.text}
                </p>
              ))}
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
