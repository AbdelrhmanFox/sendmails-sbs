import { jsonFetch, getAuthHeaders, authRole, authUsername } from './shared.js';

let attendanceRowsCache = [];

export function initTrainingTools() {
  document.getElementById('btnLoadSessionsForTools')?.addEventListener('click', loadSessionsForTools);
  document.getElementById('btnSaveAttendance')?.addEventListener('click', saveAttendanceRow);
  document.getElementById('btnLoadAttendance')?.addEventListener('click', loadAttendanceRows);
  document.getElementById('btnExportAttendanceCsv')?.addEventListener('click', exportAttendanceCsv);
  document.getElementById('btnAddMaterial')?.addEventListener('click', addMaterial);
  document.getElementById('btnLoadMaterials')?.addEventListener('click', loadMaterialsRows);
  document.getElementById('toolsGroupSelect')?.addEventListener('change', (e) => {
    const v = String(e.target.value || '').trim();
    const gid = document.getElementById('toolsGroupId');
    if (gid) gid.value = v;
  });
}

function exportAttendanceCsv() {
  if (!attendanceRowsCache.length) return;
  const headers = ['attendance_date', 'participant_name', 'status', 'notes'];
  const lines = [headers.join(',')];
  attendanceRowsCache.forEach((r) => {
    const vals = [r.attendance_date, r.participant_name, r.status, r.notes].map((v) => {
      const s = v == null ? '' : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    });
    lines.push(vals.join(','));
  });
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'attendance.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}

async function loadSessionsForTools() {
  const box = document.getElementById('toolsSessionsList');
  const sel = document.getElementById('toolsGroupSelect');
  if (!box) return;
  try {
    const data = await jsonFetch('/.netlify/functions/training-sessions', { headers: getAuthHeaders() });
    const sessions = data.sessions || [];
    box.innerHTML = sessions
      .map((s) => {
        const groups = (s.training_groups || [])
          .map((g) => `<li>Group ${g.group_number}: group id <code>${g.id}</code></li>`)
          .join('');
        return `<div class="tools-session-block"><strong>${s.title}</strong> — session <code>${s.id}</code><ul>${groups}</ul></div>`;
      })
      .join('');
    if (sel) {
      const opts = ['<option value="">— Pick a group —</option>'];
      sessions.forEach((s) => {
        (s.training_groups || []).forEach((g) => {
          opts.push(`<option value="${g.id}">${s.title} — Group ${g.group_number}</option>`);
        });
      });
      sel.innerHTML = opts.join('');
    }
  } catch (err) {
    box.textContent = err.message;
  }
}

async function saveAttendanceRow() {
  const msg = document.getElementById('toolsAttMsg');
  const group_id = String(document.getElementById('toolsGroupId').value || '').trim();
  const participant_name = String(document.getElementById('toolsParticipant').value || '').trim();
  const attendance_date = String(document.getElementById('toolsAttDate').value || '');
  const status = String(document.getElementById('toolsAttStatus').value || 'present');
  try {
    await jsonFetch('/.netlify/functions/training-data?resource=attendance', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ group_id, participant_name, attendance_date, status }),
    });
    if (msg) msg.textContent = 'Saved.';
    loadAttendanceRows();
  } catch (err) {
    if (msg) msg.textContent = err.message;
  }
}

async function loadAttendanceRows() {
  const body = document.getElementById('attendanceBody');
  const msg = document.getElementById('toolsAttMsg');
  const group_id = String(document.getElementById('toolsGroupId').value || '').trim();
  if (!group_id) {
    if (msg) msg.textContent = 'Enter group id.';
    return;
  }
  try {
    const data = await jsonFetch(`/.netlify/functions/training-data?resource=attendance&group_id=${encodeURIComponent(group_id)}`, {
      headers: getAuthHeaders(),
    });
    attendanceRowsCache = data.items || [];
    body.innerHTML = attendanceRowsCache
      .map(
        (r) =>
          `<tr><td>${r.attendance_date || ''}</td><td>${r.participant_name || ''}</td><td>${r.status || ''}</td><td><button type="button" class="btn btn-secondary btn-att-del" data-id="${r.id}">Remove</button></td></tr>`,
      )
      .join('');
    body.querySelectorAll('.btn-att-del').forEach((b) => {
      b.addEventListener('click', async () => {
        const id = b.getAttribute('data-id');
        await jsonFetch(`/.netlify/functions/training-data?resource=attendance&id=${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        });
        loadAttendanceRows();
      });
    });
    if (msg) msg.textContent = '';
  } catch (err) {
    if (msg) msg.textContent = err.message;
  }
}

async function loadMaterialsRows() {
  const list = document.getElementById('toolsMaterialsList');
  const msg = document.getElementById('toolsMatMsg');
  const session_id = String(document.getElementById('toolsMatSessionId').value || '').trim();
  const group_id = String(document.getElementById('toolsMatGroupId').value || '').trim();
  const q = new URLSearchParams({ resource: 'materials' });
  if (session_id) q.set('session_id', session_id);
  if (group_id) q.set('group_id', group_id);
  try {
    const data = await jsonFetch(`/.netlify/functions/training-data?${q}`, { headers: getAuthHeaders() });
    list.innerHTML = (data.items || [])
      .map(
        (m) =>
          `<li><a href="${m.url}" target="_blank" rel="noopener">${m.title}</a> <button type="button" class="btn btn-secondary btn-mat-del" data-id="${m.id}">Remove</button></li>`,
      )
      .join('');
    list.querySelectorAll('.btn-mat-del').forEach((b) => {
      b.addEventListener('click', async () => {
        const id = b.getAttribute('data-id');
        await jsonFetch(`/.netlify/functions/training-data?resource=materials&id=${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        });
        loadMaterialsRows();
      });
    });
    if (msg) msg.textContent = '';
  } catch (err) {
    if (msg) msg.textContent = err.message;
  }
}

async function addMaterial() {
  const msg = document.getElementById('toolsMatMsg');
  const session_id = String(document.getElementById('toolsMatSessionId').value || '').trim();
  const group_id = String(document.getElementById('toolsMatGroupId').value || '').trim();
  const title = String(document.getElementById('toolsMatTitle').value || '').trim();
  const url = String(document.getElementById('toolsMatUrl').value || '').trim();
  if (!title || !url) {
    if (msg) msg.textContent = 'Title and URL required.';
    return;
  }
  if (!session_id && !group_id) {
    if (msg) msg.textContent = 'Provide session ID or group ID.';
    return;
  }
  try {
    await jsonFetch('/.netlify/functions/training-data?resource=materials', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ session_id: session_id || null, group_id: group_id || null, title, url }),
    });
    if (msg) msg.textContent = 'Material added.';
    loadMaterialsRows();
  } catch (err) {
    if (msg) msg.textContent = err.message;
  }
}

const trainingState = {
  groupId: null,
  participantId: null,
  senderName: null,
  channel: null,
  supabase: null,
};

let whiteboardChannel = null;
let boardDrawing = false;
let boardLast = null;
let boardThrottleUntil = 0;
const BOARD_THROTTLE_MS = 0;
const WHITE_EVENT = 'white';

function scrollTrainingChatToBottom() {
  const el = document.getElementById('trainChatScroll');
  if (!el) return;
  requestAnimationFrame(() => {
    el.scrollTop = el.scrollHeight;
  });
}

function appendChatMessage(m) {
  const box = document.getElementById('chatMessages');
  if (!box) return;
  const sender = String(m.sender_name || 'User').trim();
  const mine =
    trainingState.senderName && sender.toLowerCase() === String(trainingState.senderName).trim().toLowerCase();
  const row = document.createElement('div');
  row.className = `chat-line ${mine ? 'chat-line--out' : 'chat-line--in'}`;
  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble';
  if (!mine) {
    const who = document.createElement('div');
    who.className = 'chat-bubble-name';
    who.textContent = sender || 'User';
    bubble.appendChild(who);
  }
  const text = document.createElement('div');
  text.className = 'chat-bubble-text';
  text.textContent = m.body != null ? String(m.body) : '';
  const foot = document.createElement('div');
  foot.className = 'chat-bubble-meta';
  const ts = new Date(m.created_at || Date.now());
  foot.textContent = ts.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  bubble.appendChild(text);
  bubble.appendChild(foot);
  row.appendChild(bubble);
  box.appendChild(row);
  scrollTrainingChatToBottom();
}

async function loadRecentMessages() {
  if (!trainingState.groupId) return;
  const data = await jsonFetch(`/.netlify/functions/training-messages?groupId=${encodeURIComponent(trainingState.groupId)}`);
  const box = document.getElementById('chatMessages');
  if (box) box.innerHTML = '';
  (data.messages || []).forEach(appendChatMessage);
  scrollTrainingChatToBottom();
}

function getBoardCanvasAndCtx() {
  const canvas = document.getElementById('trainingWhiteboard');
  if (!canvas) return { canvas: null, ctx: null };
  const ctx = canvas.getContext('2d');
  return { canvas, ctx };
}

function setWhiteboardDisabled(msg) {
  const note = document.getElementById('whiteboardNote');
  const wrap = document.getElementById('whiteboardWrap');
  if (note) {
    note.textContent = msg || '';
    note.classList.toggle('hidden', !msg);
  }
  if (wrap) wrap.classList.toggle('whiteboard--off', !!msg);
}

function resizeBoardToDisplay() {
  const { canvas, ctx } = getBoardCanvasAndCtx();
  if (!canvas || !ctx) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.floor(rect.width * dpr));
  const h = Math.max(1, Math.floor(rect.height * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function boardCoord(ev, canvas) {
  const r = canvas.getBoundingClientRect();
  return { x: ev.clientX - r.left, y: ev.clientY - r.top };
}

function drawBoardSegment(x0, y0, x1, y1, color, width, skipBroadcast) {
  const { canvas, ctx } = getBoardCanvasAndCtx();
  if (!ctx) return;
  ctx.save();
  ctx.strokeStyle = color || '#00a99d';
  ctx.lineWidth = width || 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.restore();
  if (!skipBroadcast && whiteboardChannel) {
    const now = Date.now();
    if (now >= boardThrottleUntil) {
      boardThrottleUntil = now + BOARD_THROTTLE_MS;
      const payload = { type: 'line', x0, y0, x1, y1, color: color || '#00a99d', width: width || 2 };
      void whiteboardChannel
        .send({ type: 'broadcast', event: WHITE_EVENT, payload })
        .catch(() => {});
    }
  }
}

function clearBoardLocal(broadcastToo) {
  const { canvas, ctx } = getBoardCanvasAndCtx();
  if (!ctx || !canvas) return;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
  resizeBoardToDisplay();
  if (broadcastToo && whiteboardChannel) {
    void whiteboardChannel
      .send({ type: 'broadcast', event: WHITE_EVENT, payload: { type: 'clear' } })
      .catch(() => {});
  }
}

function applyRemoteBoardPayload(payload) {
  if (!payload || typeof payload !== 'object') return;
  if (payload.type === 'clear') {
    clearBoardLocal(false);
    return;
  }
  if (payload.type === 'line') {
    drawBoardSegment(payload.x0, payload.y0, payload.x1, payload.y1, payload.color, payload.width, true);
  }
}

function teardownWhiteboardCanvasOnly() {
  boardDrawing = false;
  boardLast = null;
  const { canvas } = getBoardCanvasAndCtx();
  if (canvas) {
    canvas.replaceWith(canvas.cloneNode(true));
  }
}

async function teardownWhiteboardUi() {
  const ch = whiteboardChannel;
  whiteboardChannel = null;
  if (ch && trainingState.supabase) {
    try {
      await trainingState.supabase.removeChannel(ch);
    } catch (_) {
      try {
        await ch.unsubscribe();
      } catch (_) {
        /* ignore */
      }
    }
  }
  teardownWhiteboardCanvasOnly();
}

function initWhiteboardUi() {
  teardownWhiteboardCanvasOnly();
  const canvas = document.getElementById('trainingWhiteboard');
  if (!canvas) return;
  resizeBoardToDisplay();
  window.addEventListener('resize', resizeBoardToDisplay);

  const colorEl = document.getElementById('whiteboardColor');
  const widthEl = document.getElementById('whiteboardWidth');
  const modeEl = document.getElementById('whiteboardMode');
  const clearBtn = document.getElementById('whiteboardClearAll');

  function currentColor() {
    return (colorEl && colorEl.value) || '#00a99d';
  }
  function currentWidth() {
    const w = widthEl ? Number(widthEl.value) : 3;
    return Number.isFinite(w) && w > 0 ? w : 3;
  }

  function startDraw(ev) {
    boardDrawing = true;
    boardLast = boardCoord(ev, canvas);
  }
  function moveDraw(ev) {
    if (!boardDrawing || !boardLast) return;
    boardCoord(ev, canvas);
    const p = boardCoord(ev, canvas);
    const mode = modeEl ? modeEl.value : 'pen';
    const col =
      mode === 'eraser'
        ? getComputedStyle(document.documentElement).getPropertyValue('--brand-surface').trim() || '#161a4f'
        : currentColor();
    const lw = mode === 'eraser' ? currentWidth() * 4 : currentWidth();
    drawBoardSegment(boardLast.x, boardLast.y, p.x, p.y, col, lw, false);
    boardLast = p;
  }
  function endDraw() {
    boardDrawing = false;
    boardLast = null;
  }

  canvas.addEventListener('mousedown', startDraw);
  canvas.addEventListener('mousemove', moveDraw);
  window.addEventListener('mouseup', endDraw);
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (e.touches[0]) startDraw(e.touches[0]);
  });
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (e.touches[0]) moveDraw(e.touches[0]);
  });
  canvas.addEventListener('touchend', endDraw);

  clearBtn?.addEventListener('click', () => clearBoardLocal(true));
}

async function attachWhiteboardRealtime() {
  setWhiteboardDisabled('');
  await teardownWhiteboardUi();
  if (!trainingState.groupId) return;
  const panel = document.getElementById('chatPanel');
  if (!panel || panel.classList.contains('hidden')) return;

  let ch = null;
  try {
    const cfg = await jsonFetch('/.netlify/functions/public-config');
    if (!cfg.realtimeEnabled || !window.supabase || !trainingState.supabase) {
      setWhiteboardDisabled('Shared board unavailable (realtime not configured).');
      return;
    }
    const topic = `whiteboard:${String(trainingState.groupId)}`;
    ch = trainingState.supabase.channel(topic, {
      config: { broadcast: { self: false } },
    });
    ch.on('broadcast', { event: WHITE_EVENT }, (msg) => {
      const raw = msg && typeof msg === 'object' ? msg : {};
      const pl = raw.payload !== undefined ? raw.payload : raw;
      applyRemoteBoardPayload(pl);
    });
    await new Promise((resolve, reject) => {
      const ms = 15000;
      const t = setTimeout(() => reject(new Error('TIMED_OUT')), ms);
      ch.subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          clearTimeout(t);
          resolve();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          clearTimeout(t);
          reject(err || new Error(status));
        }
      });
    });
    initWhiteboardUi();
    whiteboardChannel = ch;
    ch = null;
  } catch (_) {
    if (ch && trainingState.supabase) {
      try {
        await trainingState.supabase.removeChannel(ch);
      } catch (__) {
        /* ignore */
      }
    }
    setWhiteboardDisabled('Shared board unavailable.');
  }
}

async function initRealtime() {
  try {
    const cfg = await jsonFetch('/.netlify/functions/public-config');
    if (!cfg.realtimeEnabled || !window.supabase) return;
    trainingState.supabase = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
    trainingState.channel = trainingState.supabase
      .channel(`group-${trainingState.groupId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'training_messages', filter: `group_id=eq.${trainingState.groupId}` }, (payload) => {
        appendChatMessage(payload.new);
      });
    await trainingState.channel.subscribe();
    await attachWhiteboardRealtime();
  } catch (_) {
    // keep polling fallback only
  }
}

function setTrainingParticipantHero(title, subtitle) {
  const trainerHero = document.getElementById('trainingTrainerHero');
  const studentHero = document.getElementById('trainingStudentHero');
  if (trainerHero) trainerHero.classList.add('hidden');
  if (studentHero) {
    studentHero.classList.remove('hidden');
    const t = document.getElementById('trainingStudentTitle');
    const s = document.getElementById('trainingStudentSubtitle');
    if (t) t.textContent = title || 'Join session';
    if (s) s.textContent = subtitle || '';
  }
}

async function showSessionGroupPickerFlow(sessionId) {
  document.body.classList.add('participant-join');
  const trainerPanel = document.getElementById('trainerPanel');
  if (trainerPanel) trainerPanel.classList.add('hidden');
  document.getElementById('trainerSessionsCard')?.classList.add('hidden');
  document.getElementById('participantLanding')?.classList.add('hidden');
  document.getElementById('joinPanel')?.classList.add('hidden');
  document.getElementById('chatPanel')?.classList.add('hidden');

  const picker = document.getElementById('participantGroupPicker');
  const buttonsEl = document.getElementById('groupPickerButtons');
  const errEl = document.getElementById('groupPickerError');
  if (errEl) errEl.textContent = '';
  if (buttonsEl) buttonsEl.innerHTML = '';

  try {
    const data = await jsonFetch(`/.netlify/functions/public-training-session?sessionId=${encodeURIComponent(sessionId)}`);
    setTrainingParticipantHero(
      data.title || 'Live session',
      'Choose a group below. You will enter your display name on the next step.',
    );
    if (picker) picker.classList.remove('hidden');
    if (buttonsEl) {
      (data.groups || []).forEach((g) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-primary';
        btn.textContent = `Group ${g.group_number}`;
        btn.onclick = () => {
          if (picker) picker.classList.add('hidden');
          const base = `${window.location.origin}${window.location.pathname}`;
          history.replaceState({}, '', `${base}?group=${encodeURIComponent(g.join_token)}`);
          joinByTokenFlow(g.join_token);
        };
        buttonsEl.appendChild(btn);
      });
    }
  } catch (e) {
    setTrainingParticipantHero('Session', String(e.message || 'Could not load session.'));
    if (errEl) errEl.textContent = e.message || 'Could not load groups.';
    if (picker) picker.classList.remove('hidden');
  }
}

async function joinByTokenFlow(token) {
  document.body.classList.add('participant-join');
  document.getElementById('participantGroupPicker')?.classList.add('hidden');
  const trainerPanel = document.getElementById('trainerPanel');
  if (trainerPanel) trainerPanel.classList.add('hidden');
  document.getElementById('trainerSessionsCard')?.classList.add('hidden');
  const landing = document.getElementById('participantLanding');
  const panel = document.getElementById('joinPanel');
  const joinData = await jsonFetch(`/.netlify/functions/training-join?token=${encodeURIComponent(token)}`);
  setTrainingParticipantHero(
    joinData.sessionTitle || 'Live session',
    `Group ${joinData.groupNumber} — continue to enter your display name and open the chat.`,
  );
  document.getElementById('participantLandingTitle').textContent = joinData.sessionTitle || 'Live session';
  document.getElementById('participantLandingSubtitle').textContent = `Group ${joinData.groupNumber} — continue to enter your display name and open the chat.`;
  if (landing) landing.classList.remove('hidden');
  if (panel) panel.classList.add('hidden');
  document.getElementById('chatPanel').classList.add('hidden');

  const startJoin = () => {
    if (landing) landing.classList.add('hidden');
    if (panel) panel.classList.remove('hidden');
    document.getElementById('joinHeading').textContent = `${joinData.sessionTitle} — Group ${joinData.groupNumber}`;
    document.getElementById('joinForm').onsubmit = async (e) => {
      e.preventDefault();
      const displayName = String(document.getElementById('joinName').value || '').trim();
      if (!displayName) return;
      const joined = await jsonFetch(`/.netlify/functions/training-join?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName }),
      });
      trainingState.groupId = joined.groupId;
      trainingState.participantId = joined.participant.id;
      trainingState.senderName = joined.participant.display_name;
      panel.classList.add('hidden');
      document.getElementById('chatPanel').classList.remove('hidden');
      const sub = document.getElementById('chatPanelSub');
      if (sub) {
        sub.textContent = `${joined.sessionTitle || joinData.sessionTitle || 'Live session'} · Group ${joined.groupNumber ?? joinData.groupNumber}`;
      }
      loadRecentMessages();
      initRealtime();
      setInterval(loadRecentMessages, 10000);
    };
  };

  document.getElementById('btnParticipantContinue').onclick = startJoin;
}

function switchToTrainingView() {
  document.querySelectorAll('.area-tab').forEach((t) => t.classList.toggle('active', t.getAttribute('data-area') === 'training'));
  document.querySelectorAll('.subnav').forEach((s) => s.classList.toggle('hidden', s.getAttribute('data-for-area') !== 'training'));
  const trSub = document.querySelector('.subnav[data-for-area="training"]');
  if (trSub) {
    trSub.querySelectorAll('.subnav-item').forEach((b) => b.classList.toggle('active', b.getAttribute('data-view') === 'training'));
  }
  document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
  document.getElementById('view-training').classList.add('active');
}

async function loadTrainerSessions() {
  const list = document.getElementById('trainerSessionsList');
  const msg = document.getElementById('trainerSessionsMsg');
  if (!list || !['admin', 'trainer'].includes(authRole)) return;
  if (msg) msg.textContent = 'Loading…';
  try {
    const data = await jsonFetch('/.netlify/functions/training-sessions', { headers: getAuthHeaders() });
    const sessions = data.sessions || [];
    list.innerHTML = '';
    if (msg) msg.textContent = '';
    if (!sessions.length) {
      if (msg) msg.textContent = 'No sessions yet. Create one above.';
      return;
    }
    const base = `${window.location.origin}${window.location.pathname}`;
    sessions.forEach((s) => {
      const row = document.createElement('div');
      row.className = 'trainer-session-row';
      const meta = document.createElement('div');
      meta.className = 'session-meta';
      const titleEl = document.createElement('strong');
      titleEl.textContent = s.title || 'Session';
      meta.appendChild(titleEl);
      const sub = document.createElement('div');
      sub.className = 'muted';
      const created = s.created_at ? new Date(s.created_at).toLocaleString() : '';
      const who = authRole === 'admin' && s.trainer_username ? ` · Trainer: ${s.trainer_username}` : '';
      sub.textContent = `${created} · ${s.groups_count} group(s)${who}`;
      meta.appendChild(sub);
      row.appendChild(meta);
      const href = `${base}?session=${s.id}`;
      const link = document.createElement('a');
      link.href = href;
      link.className = 'btn btn-secondary';
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = 'Student link';
      row.appendChild(link);
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'btn btn-secondary';
      del.textContent = 'Delete';
      del.addEventListener('click', async () => {
        if (
          !confirm(
            'Delete this session? All groups, chat messages, and related attendance rows for this session will be removed. This cannot be undone.',
          )
        ) {
          return;
        }
        if (msg) msg.textContent = '';
        try {
          await jsonFetch(`/.netlify/functions/training-sessions?id=${encodeURIComponent(s.id)}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
          });
          await loadTrainerSessions();
        } catch (e) {
          if (msg) msg.textContent = e.message;
        }
      });
      row.appendChild(del);
      list.appendChild(row);
    });
  } catch (e) {
    if (msg) msg.textContent = e.message;
  }
}

export async function initTraining() {
  const query = new URLSearchParams(window.location.search);
  const sessionId = query.get('session');
  const token = query.get('group');
  if (token) {
    switchToTrainingView();
    await joinByTokenFlow(token);
  } else if (sessionId) {
    switchToTrainingView();
    await showSessionGroupPickerFlow(sessionId);
  }

  document.getElementById('trainingSessionForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = String(document.getElementById('trainingTitle').value || '').trim();
    const groupsCount = Number(document.getElementById('groupsCount').value || 1);
    if (!title) return;
    const msg = document.getElementById('trainingMsg');
    const links = document.getElementById('trainingLinks');
    try {
      const data = await jsonFetch('/.netlify/functions/training-sessions', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ title, groupsCount }),
      });
      const base = `${window.location.origin}${window.location.pathname}`;
      const sorted = (data.groups || []).slice().sort((a, b) => a.group_number - b.group_number);
      const session = data.session;
      const href = session && session.id ? `${base}?session=${session.id}` : base;
      links.innerHTML =
        session && session.id
          ? `<h4>Share link for students</h4><p class="share-link-wrap"><a href="${href}" target="_blank" rel="noopener">${href}</a></p>${
              sorted.length > 1 ? `<p class="muted small-margin">Students choose their group after opening this link.</p>` : ''
            }`
          : '';
      msg.textContent = 'Session created.';
      loadTrainerSessions();
    } catch (err) {
      msg.textContent = err.message;
    }
  });

  document.getElementById('btnRefreshTrainerSessions')?.addEventListener('click', () => loadTrainerSessions());

  if (['admin', 'trainer'].includes(authRole)) {
    loadTrainerSessions();
  }

  document.getElementById('chatForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('chatInput');
    const body = String(input.value || '').trim();
    if (!body || !trainingState.groupId) return;
    try {
      const sent = await jsonFetch('/.netlify/functions/training-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: trainingState.groupId,
          participantId: trainingState.participantId,
          senderName: trainingState.senderName || authUsername || 'User',
          body,
        }),
      });
      if (!trainingState.channel) appendChatMessage(sent.message);
      input.value = '';
      input.focus();
    } catch (_) {
      // no-op
    }
  });
}
