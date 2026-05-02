import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient, type RealtimeChannel } from '@supabase/supabase-js';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { Input } from '../../components/design-system/Input';
import { functionsBase, jsonFetch } from '../../../lib/api';
import sbsVoiceBrandUrl from '../../../assets/sbs-voice-brand.svg';
import { absoluteAssetUrl, createJitsiEmbed, loadJitsiScript, parseJitsiVoiceUrl, type JitsiApiInstance } from '../../../lib/jitsiVoice';

const BOARD_BG = '#0b1230';

type SessionMeta = {
  title: string;
  whiteboardEnabled: boolean;
  voiceRoomUrl: string | null;
  groups: Array<{ group_number: number; join_token: string }>;
};

type JoinResponse = {
  groupId: string;
  groupNumber: number;
  sessionId: string;
  sessionTitle: string;
  whiteboardEnabled: boolean;
  voiceRoomUrl: string | null;
  participant: { id: string; display_name: string };
};

type ChatMessage = { id: string; sender_name: string; body: string; created_at: string };
type PresencePeer = { id: string; name: string; muted: boolean; sticker: string };
type Reaction = { id: string; text: string };
type JoinStage = 'loadingGroups' | 'pickGroup' | 'enterName' | 'joining' | 'joined';

type MobileTab = 'chat' | 'board';
type WbMode = 'pen' | 'line' | 'text' | 'eraser';

type PollState = {
  pollId: string;
  question: string;
  options: string[];
  votes: Record<string, number>;
};

const STICKERS = ['😀', '🔥', '👏'];

function strokeLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width: number,
  erase: boolean,
) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = width;
  ctx.strokeStyle = erase ? BOARD_BG : color;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

function drawTextOnBoard(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, color: string, fontPx: number) {
  ctx.save();
  ctx.font = `${fontPx}px system-ui, sans-serif`;
  ctx.fillStyle = color;
  ctx.textBaseline = 'top';
  ctx.fillText(text, x, y);
  ctx.restore();
}

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
  const [mobileTab, setMobileTab] = useState<MobileTab>('chat');
  const [sessionEnded, setSessionEnded] = useState(false);

  const [wbMode, setWbMode] = useState<WbMode>('pen');
  const [wbColor, setWbColor] = useState('#00a99d');
  const [wbWidth, setWbWidth] = useState(3);
  const [wbTextSize, setWbTextSize] = useState(22);
  const [textDraft, setTextDraft] = useState('');
  const [textAnchor, setTextAnchor] = useState<{ x: number; y: number } | null>(null);

  const [poll, setPoll] = useState<PollState | null>(null);
  const [pollQuestionInput, setPollQuestionInput] = useState('');
  const [pollOptionsInput, setPollOptionsInput] = useState(['', '']);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const lineStartRef = useRef<{ x: number; y: number } | null>(null);
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const jitsiParentRef = useRef<HTMLDivElement | null>(null);
  const jitsiApiRef = useRef<JitsiApiInstance | null>(null);
  const [jitsiError, setJitsiError] = useState('');
  const [voiceRoomActive, setVoiceRoomActive] = useState(false);

  const jitsiParsed = useMemo(() => (joinData?.voiceRoomUrl ? parseJitsiVoiceUrl(joinData.voiceRoomUrl) : null), [joinData?.voiceRoomUrl]);

  const peersLeft = useMemo(() => peers.filter((_, i) => i % 2 === 0), [peers]);
  const peersRight = useMemo(() => peers.filter((_, i) => i % 2 === 1), [peers]);

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
      /* keep */
    }
  };

  const applyLegacyDraw = (p: { x1: number; y1: number; x2: number; y2: number }) => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;
    strokeLine(ctx, p.x1, p.y1, p.x2, p.y2, '#22d3ee', 2, false);
  };

  const broadcast = async (event: string, payload: Record<string, unknown>) => {
    if (!channelRef.current || sessionEnded) return;
    await channelRef.current.send({ type: 'broadcast', event, payload });
  };

  const disposeJitsi = () => {
    try {
      jitsiApiRef.current?.dispose?.();
    } catch {
      /* ignore */
    }
    jitsiApiRef.current = null;
    if (jitsiParentRef.current) jitsiParentRef.current.innerHTML = '';
    setVoiceRoomActive(false);
  };

  const mountJitsi = async () => {
    if (!joinData || !jitsiParsed || sessionEnded) return;
    setJitsiError('');
    disposeJitsi();
    const parent = jitsiParentRef.current;
    if (!parent) return;
    try {
      await loadJitsiScript(jitsiParsed.domain);
      const api = createJitsiEmbed({
        domain: jitsiParsed.domain,
        roomName: jitsiParsed.roomName,
        parentNode: parent,
        displayName: joinData.participant.display_name,
        avatarURL: absoluteAssetUrl(sbsVoiceBrandUrl),
        height: 480,
      });
      jitsiApiRef.current = api;
      setVoiceRoomActive(true);
    } catch (e) {
      setJitsiError(e instanceof Error ? e.message : 'Could not start voice room');
    }
  };

  useEffect(() => {
    if (stage !== 'joined' || sessionEnded) {
      disposeJitsi();
    }
  }, [stage, sessionEnded]);

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
      applyLegacyDraw(payload as { x1: number; y1: number; x2: number; y2: number });
    });
    ch.on('broadcast', { event: 'wb-stroke' }, ({ payload }) => {
      const p = payload as { x1: number; y1: number; x2: number; y2: number; color: string; width: number; erase?: boolean };
      const cvs = canvasRef.current;
      if (!cvs) return;
      const ctx = cvs.getContext('2d');
      if (!ctx) return;
      strokeLine(ctx, p.x1, p.y1, p.x2, p.y2, p.color || '#00a99d', p.width || 3, Boolean(p.erase));
    });
    ch.on('broadcast', { event: 'wb-line' }, ({ payload }) => {
      const p = payload as { x1: number; y1: number; x2: number; y2: number; color: string; width: number; erase?: boolean };
      const cvs = canvasRef.current;
      if (!cvs) return;
      const ctx = cvs.getContext('2d');
      if (!ctx) return;
      strokeLine(ctx, p.x1, p.y1, p.x2, p.y2, p.color, p.width, Boolean(p.erase));
    });
    ch.on('broadcast', { event: 'wb-text' }, ({ payload }) => {
      const p = payload as { x: number; y: number; text: string; color: string; fontPx: number };
      const cvs = canvasRef.current;
      if (!cvs) return;
      const ctx = cvs.getContext('2d');
      if (!ctx) return;
      drawTextOnBoard(ctx, p.x, p.y, p.text, p.color, p.fontPx || 22);
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
    ch.on('broadcast', { event: 'poll-start' }, ({ payload }) => {
      const p = payload as { pollId: string; question: string; options: string[] };
      setPoll({ pollId: p.pollId, question: p.question, options: p.options || [], votes: {} });
    });
    ch.on('broadcast', { event: 'poll-vote' }, ({ payload }) => {
      const p = payload as { pollId: string; participantId: string; optionIndex: number };
      setPoll((prev) => {
        if (!prev || prev.pollId !== p.pollId) return prev;
        return { ...prev, votes: { ...prev.votes, [p.participantId]: p.optionIndex } };
      });
    });
    ch.on('broadcast', { event: 'poll-end' }, ({ payload }) => {
      const p = payload as { pollId: string };
      setPoll((prev) => (prev && prev.pollId === p.pollId ? null : prev));
    });
    ch.on('broadcast', { event: 'session-ended' }, () => {
      setSessionEnded(true);
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
    if (!joinData || sessionEnded) return;
    void fetchMessages(joinData.groupId);
    const t = window.setInterval(() => void fetchMessages(joinData.groupId), 5000);
    return () => {
      window.clearInterval(t);
    };
  }, [joinData, sessionEnded]);

  useEffect(() => {
    if (!joinData?.sessionId || stage !== 'joined' || sessionEnded) return;
    const sid = joinData.sessionId;
    const tick = async () => {
      try {
        await jsonFetch<SessionMeta>(`${functionsBase()}/public-training-session?sessionId=${encodeURIComponent(sid)}`);
      } catch {
        setSessionEnded(true);
      }
    };
    const iv = window.setInterval(() => void tick(), 20000);
    void tick();
    return () => window.clearInterval(iv);
  }, [joinData?.sessionId, stage, sessionEnded]);

  useEffect(() => {
    if (!joinData || !channelRef.current || sessionEnded) return;
    void channelRef.current.track({
      id: joinData.participant.id,
      name: joinData.participant.display_name,
      muted,
      sticker,
      online_at: new Date().toISOString(),
    });
  }, [muted, sticker, joinData, sessionEnded]);

  useEffect(() => {
    if (!sessionEnded) return;
    disposeJitsi();
    if (channelRef.current) void channelRef.current.unsubscribe();
    channelRef.current = null;
    if (supabaseRef.current) void supabaseRef.current.removeAllChannels();
    supabaseRef.current = null;
  }, [sessionEnded]);

  useEffect(
    () => () => {
      disposeJitsi();
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
      const raw = await jsonFetch<Record<string, unknown>>(`${functionsBase()}/training-join?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: displayName.trim() }),
      });
      const participant = raw.participant as { id: string; display_name?: string; displayName?: string };
      const joined: JoinResponse = {
        groupId: String(raw.groupId),
        groupNumber: Number(raw.groupNumber),
        sessionId: String(raw.sessionId),
        sessionTitle: String(raw.sessionTitle || 'Live session'),
        whiteboardEnabled: raw.whiteboardEnabled !== false,
        voiceRoomUrl: (raw.voiceRoomUrl as string | null) ?? null,
        participant: {
          id: participant.id,
          display_name: String(participant.display_name ?? participant.displayName ?? displayName.trim()),
        },
      };
      setJoinData(joined);
      setSessionEnded(false);
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
    if (!joinData || !chatInput.trim() || sessionEnded) return;
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
      /* ignore */
    }
  };

  const toLocalPoint = (evt: React.MouseEvent<HTMLCanvasElement>) => {
    const cvs = canvasRef.current!;
    const rect = cvs.getBoundingClientRect();
    const sx = cvs.width / rect.width;
    const sy = cvs.height / rect.height;
    return { x: (evt.clientX - rect.left) * sx, y: (evt.clientY - rect.top) * sy };
  };

  const clearBoard = () => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    void broadcast('clear-board', {});
  };

  const onMouseDown = (evt: React.MouseEvent<HTMLCanvasElement>) => {
    if (!joinData?.whiteboardEnabled || sessionEnded) return;
    const p = toLocalPoint(evt);
    if (wbMode === 'text') {
      setTextAnchor(p);
      setTextDraft('');
      return;
    }
    drawingRef.current = true;
    lastPointRef.current = p;
    if (wbMode === 'line') lineStartRef.current = p;
  };

  const onMouseUp = (evt: React.MouseEvent<HTMLCanvasElement>) => {
    if (!joinData?.whiteboardEnabled || sessionEnded) return;
    if (wbMode === 'line' && lineStartRef.current) {
      const cvs = canvasRef.current;
      const ctx = cvs?.getContext('2d');
      const a = lineStartRef.current;
      const b = toLocalPoint(evt);
      if (ctx) strokeLine(ctx, a.x, a.y, b.x, b.y, wbColor, wbWidth, false);
      void broadcast('wb-line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, color: wbColor, width: wbWidth, erase: false });
    }
    drawingRef.current = false;
    lastPointRef.current = null;
    lineStartRef.current = null;
  };

  const onMouseMove = (evt: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || !joinData?.whiteboardEnabled || sessionEnded) return;
    if (wbMode === 'line' || wbMode === 'text') return;
    const curr = toLocalPoint(evt);
    const prev = lastPointRef.current;
    if (!prev) return;
    const cvs = canvasRef.current;
    const ctx = cvs?.getContext('2d');
    const erase = wbMode === 'eraser';
    if (ctx) strokeLine(ctx, prev.x, prev.y, curr.x, curr.y, wbColor, erase ? Math.max(wbWidth, 12) : wbWidth, erase);
    void broadcast('wb-stroke', {
      x1: prev.x,
      y1: prev.y,
      x2: curr.x,
      y2: curr.y,
      color: wbColor,
      width: erase ? Math.max(wbWidth, 12) : wbWidth,
      erase,
    });
    lastPointRef.current = curr;
  };

  const placeText = () => {
    if (!textAnchor || !textDraft.trim() || !joinData?.whiteboardEnabled || sessionEnded) return;
    const cvs = canvasRef.current;
    const ctx = cvs?.getContext('2d');
    if (ctx) drawTextOnBoard(ctx, textAnchor.x, textAnchor.y, textDraft.trim(), wbColor, wbTextSize);
    void broadcast('wb-text', { x: textAnchor.x, y: textAnchor.y, text: textDraft.trim(), color: wbColor, fontPx: wbTextSize });
    setTextAnchor(null);
    setTextDraft('');
  };

  const startPoll = () => {
    const q = pollQuestionInput.trim();
    const opts = pollOptionsInput.map((o) => o.trim()).filter(Boolean);
    if (!q || opts.length < 2) return;
    const pollId = `poll-${Date.now()}`;
    void broadcast('poll-start', { pollId, question: q, options: opts });
    setPollQuestionInput('');
    setPollOptionsInput(['', '']);
  };

  const votePoll = (optionIndex: number) => {
    if (!poll || !joinData || sessionEnded) return;
    void broadcast('poll-vote', { pollId: poll.pollId, participantId: joinData.participant.id, optionIndex });
  };

  const endPoll = () => {
    if (!poll || sessionEnded) return;
    void broadcast('poll-end', { pollId: poll.pollId });
  };

  const addPollOptionRow = () => setPollOptionsInput((rows) => [...rows, '']);

  const peerTile = (p: PresencePeer) => (
    <div
      key={p.id}
      className="flex flex-col items-center gap-1 rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[var(--brand-surface-2)] p-2 text-center"
    >
      <span className="text-2xl" aria-hidden>
        {p.sticker}
      </span>
      <span className="max-w-[88px] truncate text-xs font-medium text-[var(--brand-text)]">{p.name}</span>
      {p.muted ? <span className="text-[10px] text-[var(--brand-muted)]">Muted</span> : null}
    </div>
  );

  const tabBtn = (id: MobileTab, label: string) => (
    <button
      key={id}
      type="button"
      role="tab"
      aria-selected={mobileTab === id}
      className={`rounded-[var(--brand-radius-dense)] px-3 py-2 text-sm font-medium ${
        mobileTab === id ? 'bg-[var(--brand-primary)] text-white' : 'border border-[var(--brand-border)] bg-[var(--brand-surface-2)] text-[var(--brand-text)]'
      }`}
      onClick={() => setMobileTab(id)}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-4">
      <Card className="space-y-2">
        <h1 className="text-xl font-semibold text-[var(--brand-text)]">{joinData?.sessionTitle || meta?.title || 'Live session'}</h1>
        <p className="text-sm text-[var(--brand-muted)]">
          Pick a group, enter your name, then use chat, shared board, optional Jitsi voice (starts only when you choose), polls, and presence. Session status is checked periodically; when the trainer removes the session, this room closes here.
        </p>
        {err ? <p className="text-sm text-[var(--brand-danger)]">{err}</p> : null}
      </Card>

      {sessionEnded ? (
        <Card className="border-[var(--brand-danger)] bg-[var(--brand-surface-2)] p-4" role="alert">
          <p className="text-sm font-semibold text-[var(--brand-danger)]">Session ended.</p>
          <p className="mt-1 text-sm text-[var(--brand-text)]">
            This session was removed or is no longer available. Chat, voice, and the live board are closed for this link.
          </p>
        </Card>
      ) : null}

      {stage === 'loadingGroups' ? (
        <Card className="space-y-3 p-4">
          <p className="text-sm text-[var(--brand-muted)]">Loading available groups…</p>
        </Card>
      ) : null}

      {stage === 'pickGroup' && sessionId ? (
        <Card className="space-y-3 p-4">
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
        <Card className="space-y-3 p-4">
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
        <Card className="space-y-3 p-4">
          <p className="text-sm text-[var(--brand-muted)]">Joining session…</p>
        </Card>
      ) : null}

      {stage === 'joined' && joinData && !sessionEnded ? (
        <>
          <div className="flex flex-wrap gap-2 lg:hidden" role="tablist" aria-label="Room section">
            {tabBtn('chat', 'Chat')}
            {joinData.whiteboardEnabled ? tabBtn('board', 'Board') : null}
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,140px)_minmax(0,1fr)_minmax(0,140px)]">
            <aside className="hidden lg:flex flex-col gap-2" aria-label="Participants left">
              {peersLeft.map(peerTile)}
            </aside>

            <div className="min-w-0 space-y-4">
              <Card className={`space-y-3 p-4 ${mobileTab === 'chat' ? '' : 'hidden'} lg:block`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-[var(--brand-text)]">
                    Group {joinData.groupNumber} · {joinData.participant.display_name}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" type="button" variant={muted ? 'danger' : 'secondary'} onClick={() => setMuted((m) => !m)}>
                      {muted ? 'Muted' : 'Mute'}
                    </Button>
                    {jitsiParsed ? (
                      voiceRoomActive ? (
                        <Button
                          size="sm"
                          type="button"
                          variant="secondary"
                          onClick={() => {
                            disposeJitsi();
                          }}
                        >
                          Leave voice
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          type="button"
                          variant="secondary"
                          onClick={() => {
                            void mountJitsi();
                            document.getElementById('voice-room-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                          }}
                        >
                          Join voice room
                        </Button>
                      )
                    ) : null}
                  </div>
                </div>
                <h3 className="font-semibold text-[var(--brand-text)]">Chat</h3>
                <div className="h-[220px] space-y-2 overflow-auto rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] p-2">
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

              {joinData.whiteboardEnabled ? (
                <Card className={`space-y-3 p-4 ${mobileTab === 'board' ? '' : 'hidden'} lg:block`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm text-[var(--brand-muted)]">Shared whiteboard (live only)</p>
                    <Button size="sm" type="button" variant="secondary" onClick={clearBoard}>
                      Clear all
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="text-xs text-[var(--brand-text)]">
                      Tool
                      <select
                        className="ml-1 rounded border border-[var(--brand-border)] bg-[var(--brand-surface)] px-2 py-1 text-sm text-[var(--brand-text)]"
                        value={wbMode}
                        onChange={(e) => setWbMode(e.target.value as WbMode)}
                      >
                        <option value="pen">Pen</option>
                        <option value="line">Straight line</option>
                        <option value="text">Text</option>
                        <option value="eraser">Eraser</option>
                      </select>
                    </label>
                    <label className="text-xs text-[var(--brand-text)]">
                      Color
                      <input type="color" value={wbColor} onChange={(e) => setWbColor(e.target.value)} className="ml-1 h-8 w-10 cursor-pointer" />
                    </label>
                    <label className="text-xs text-[var(--brand-text)]">
                      Stroke
                      <input
                        type="range"
                        min={1}
                        max={12}
                        value={wbWidth}
                        onChange={(e) => setWbWidth(Number(e.target.value))}
                        className="ml-1 w-24 align-middle"
                      />
                    </label>
                    {wbMode === 'text' ? (
                      <label className="text-xs text-[var(--brand-text)]">
                        Text size
                        <input
                          type="range"
                          min={14}
                          max={44}
                          value={wbTextSize}
                          onChange={(e) => setWbTextSize(Number(e.target.value))}
                          className="ml-1 w-20 align-middle"
                        />
                      </label>
                    ) : null}
                  </div>
                  <p className="text-xs text-[var(--brand-muted)]">
                    {wbMode === 'text' ? 'Click the board to place text, then type and confirm below.' : null}
                  </p>
                  <div className="relative">
                    <canvas
                      ref={canvasRef}
                      width={980}
                      height={420}
                      className="w-full cursor-crosshair rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[#0b1230]"
                      style={{ touchAction: 'none' }}
                      onMouseDown={onMouseDown}
                      onMouseMove={onMouseMove}
                      onMouseUp={onMouseUp}
                      onMouseLeave={onMouseUp}
                    />
                  </div>
                  {textAnchor ? (
                    <div className="flex flex-wrap items-end gap-2 rounded border border-[var(--brand-border)] bg-[var(--brand-surface-2)] p-3">
                      <Input label="Text on board" value={textDraft} onChange={(e) => setTextDraft(e.target.value)} placeholder="Type text" />
                      <Button type="button" onClick={placeText}>
                        Place
                      </Button>
                      <Button type="button" variant="secondary" onClick={() => setTextAnchor(null)}>
                        Cancel
                      </Button>
                    </div>
                  ) : null}

                  <div className="rounded border border-[var(--brand-border)] bg-[var(--brand-surface)] p-3">
                    <h4 className="text-sm font-semibold text-[var(--brand-text)]">Group poll (live only)</h4>
                    {poll ? (
                      <div className="mt-2 space-y-2">
                        <p className="text-sm font-medium text-[var(--brand-text)]">{poll.question}</p>
                        <div className="flex flex-col gap-2" role="radiogroup">
                          {poll.options.map((opt, i) => (
                            <label key={i} className="flex cursor-pointer items-center gap-2 text-sm text-[var(--brand-text)]">
                              <input
                                type="radio"
                                name="poll-opt"
                                checked={poll.votes[joinData.participant.id] === i}
                                onChange={() => votePoll(i)}
                              />
                              {opt} ({Object.values(poll.votes).filter((v) => v === i).length} votes)
                            </label>
                          ))}
                        </div>
                        <Button size="sm" type="button" variant="secondary" onClick={() => void endPoll()}>
                          End poll
                        </Button>
                      </div>
                    ) : (
                      <div className="mt-2 space-y-2">
                        <Input label="Poll question" value={pollQuestionInput} onChange={(e) => setPollQuestionInput(e.target.value)} maxLength={200} />
                        {pollOptionsInput.map((row, i) => (
                          <Input
                            key={i}
                            label={`Choice ${i + 1}`}
                            value={row}
                            maxLength={80}
                            onChange={(e) =>
                              setPollOptionsInput((prev) => {
                                const next = [...prev];
                                next[i] = e.target.value;
                                return next;
                              })
                            }
                          />
                        ))}
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" type="button" variant="secondary" onClick={addPollOptionRow}>
                            Add choice
                          </Button>
                          <Button size="sm" type="button" onClick={() => void startPoll()}>
                            Start poll
                          </Button>
                        </div>
                        <p className="text-xs text-[var(--brand-muted)]">Anyone in the group can start or end a poll (same as classic ephemeral flow).</p>
                      </div>
                    )}
                  </div>
                </Card>
              ) : null}

              {jitsiParsed ? (
                <Card id="voice-room-anchor" className="space-y-2 p-4">
                  <p className="text-sm font-medium text-[var(--brand-text)]">SBS voice (in page)</p>
                  {!voiceRoomActive ? (
                    <p className="text-sm text-[var(--brand-muted)]">
                      Start voice when you are ready. Use the button below or &quot;Join voice room&quot; in the chat header. Your name is already set; the SBS mark appears as your voice tile avatar.
                    </p>
                  ) : null}
                  {voiceRoomActive ? (
                    <div className="flex items-center gap-3 rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[var(--brand-surface-2)] px-3 py-2">
                      <img src={sbsVoiceBrandUrl} alt="" width={44} height={44} className="h-11 w-11 shrink-0 rounded-lg object-cover" />
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--brand-muted)]">SBS voice</p>
                        <p className="text-sm font-medium text-[var(--brand-text)]">Joined as {joinData.participant.display_name}</p>
                      </div>
                    </div>
                  ) : null}
                  {jitsiError ? <p className="text-sm text-[var(--brand-danger)]">{jitsiError}</p> : null}
                  {!voiceRoomActive ? (
                    <Button type="button" onClick={() => void mountJitsi()}>
                      Join voice room
                    </Button>
                  ) : null}
                  <div
                    ref={jitsiParentRef}
                    className={
                      voiceRoomActive
                        ? 'min-h-[480px] w-full overflow-hidden rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-black'
                        : 'sr-only'
                    }
                    aria-hidden={!voiceRoomActive}
                  />
                </Card>
              ) : joinData.voiceRoomUrl ? (
                <Card className="p-4">
                  <p className="text-sm text-[var(--brand-muted)]">Voice URL is not a Jitsi room; open it externally if needed.</p>
                </Card>
              ) : null}
            </div>

            <aside className="hidden lg:flex flex-col gap-2" aria-label="Participants right">
              {peersRight.map(peerTile)}
            </aside>
          </div>

          <Card className="space-y-3 p-4">
            <h3 className="font-semibold text-[var(--brand-text)]">Reactions & activity</h3>
            <div className="flex flex-wrap gap-2">
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
            <div className="grid gap-3 sm:grid-cols-2 lg:hidden">
              <div className="space-y-1 rounded border border-[var(--brand-border)] p-2">
                <p className="text-xs font-semibold text-[var(--brand-muted)]">Online</p>
                {peers.map((p) => (
                  <p key={p.id} className="text-sm text-[var(--brand-text)]">
                    {p.sticker} {p.name} {p.muted ? '(muted)' : ''}
                  </p>
                ))}
              </div>
              <div className="space-y-1 rounded border border-[var(--brand-border)] p-2">
                <p className="text-xs font-semibold text-[var(--brand-muted)]">Activity</p>
                {reactions.map((r) => (
                  <p key={r.id} className="text-sm text-[var(--brand-text)]">
                    {r.text}
                  </p>
                ))}
              </div>
            </div>
            <div className="hidden lg:block space-y-1 rounded border border-[var(--brand-border)] p-2">
              <p className="text-xs font-semibold text-[var(--brand-muted)]">Activity</p>
              {reactions.map((r) => (
                <p key={`d-${r.id}`} className="text-sm text-[var(--brand-text)]">
                  {r.text}
                </p>
              ))}
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
}
