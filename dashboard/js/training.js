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
  whiteboardAllowed: false,
  whiteboardSubscribed: false,
  voiceRoomUrl: null,
  joinToken: null,
  sessionEnded: false,
  /** True after chat Realtime channel subscribes successfully (voice uses same client). */
  realtimeReady: false,
};

let trainingMessagesIntervalId = null;
let trainingSessionAliveIntervalId = null;
let trainingSessionAliveMisses = 0;

function clearTrainingParticipantPolls() {
  if (trainingMessagesIntervalId) {
    clearInterval(trainingMessagesIntervalId);
    trainingMessagesIntervalId = null;
  }
  if (trainingSessionAliveIntervalId) {
    clearInterval(trainingSessionAliveIntervalId);
    trainingSessionAliveIntervalId = null;
  }
  trainingSessionAliveMisses = 0;
}

/* ── Voice: in-page WebRTC (mesh) + Supabase Realtime presence & broadcast ─ */

const STUN_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];
const VOICE_EVENT = 'voice';

let voiceChannel = null;
let voiceJoined = false;
let voiceMuted = false;
let voiceMyStickerIdx = 1;
let localStream = null;
const voicePeers = new Map(); // participantId → { name, muted, self, side, stickerIdx }
const rtcPeers = new Map(); // remote participantId → RTCPeerConnection
const remoteAudios = new Map(); // participantId → HTMLAudioElement
const pendingIceCandidates = new Map(); // remoteId → RTCIceCandidateInit[]

function vsEsc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function nextVoiceSide() {
  let r = 0;
  let l = 0;
  for (const p of voicePeers.values()) {
    if (p.side === 'right') r++;
    else l++;
  }
  return r <= l ? 'right' : 'left';
}

function renderVoiceStickers() {
  const leftCol = document.getElementById('voiceStickersLeft');
  const rightCol = document.getElementById('voiceStickersRight');
  if (!leftCol || !rightCol) return;
  leftCol.innerHTML = '';
  rightCol.innerHTML = '';
  for (const [id, peer] of voicePeers) {
    const col = peer.side === 'right' ? rightCol : leftCol;
    const wrap = document.createElement('div');
    wrap.className = `voice-sticker${peer.self ? ' voice-sticker--self' : ''}`;
    wrap.id = `vs-${CSS.escape(id)}`;
    const idx = Math.max(1, Math.min(3, Number(peer.stickerIdx) || 1));
    wrap.innerHTML = `
      <div class="voice-sticker-avatar">
        <div class="voice-sticker-circle">
          <img class="voice-sticker-img" src="assets/stickers/sticker-${idx}.jpg" alt="" width="54" height="54" />
        </div>
        <span class="voice-sticker-mute-x${peer.muted ? '' : ' hidden'}" title="Muted">
          <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true" focusable="false" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </span>
      </div>
      <span class="voice-sticker-name">${vsEsc(peer.name)}</span>
    `;
    col.appendChild(wrap);
  }
}

function addVoicePeer(id, name, isSelf, stickerIdx = 1, muted = false) {
  const pid = String(id);
  const idx = Math.max(1, Math.min(3, Number(stickerIdx) || 1));
  const existing = voicePeers.get(pid);
  if (existing) {
    existing.name = String(name || existing.name);
    existing.muted = Boolean(muted);
    existing.stickerIdx = idx;
    renderVoiceStickers();
    return;
  }
  voicePeers.set(pid, {
    name: String(name || 'User'),
    muted: Boolean(muted),
    self: Boolean(isSelf),
    side: nextVoiceSide(),
    stickerIdx: idx,
  });
  renderVoiceStickers();
}

function removeVoicePeer(id) {
  const pid = String(id);
  if (voicePeers.has(pid)) {
    voicePeers.delete(pid);
    renderVoiceStickers();
  }
}

function setVoicePeerMuted(id, muted) {
  const peer = voicePeers.get(String(id));
  if (peer) {
    peer.muted = Boolean(muted);
    renderVoiceStickers();
  }
}

function voiceBroadcastSig(payload) {
  if (!voiceChannel) return;
  void voiceChannel.send({ type: 'broadcast', event: VOICE_EVENT, payload }).catch(() => {});
}

function playRemoteAudio(remoteId, stream) {
  let el = remoteAudios.get(remoteId);
  if (!el) {
    el = document.createElement('audio');
    el.autoplay = true;
    el.setAttribute('playsinline', '');
    el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(el);
    remoteAudios.set(remoteId, el);
  }
  el.srcObject = stream;
  void el.play().catch(() => {});
}

function closeRtcPeer(remoteId) {
  const id = String(remoteId);
  const pc = rtcPeers.get(id);
  if (pc) {
    try {
      pc.close();
    } catch (_) {
      /* ignore */
    }
    rtcPeers.delete(id);
  }
  const el = remoteAudios.get(id);
  if (el) {
    try {
      el.srcObject = null;
      el.remove();
    } catch (_) {
      /* ignore */
    }
    remoteAudios.delete(id);
  }
  pendingIceCandidates.delete(id);
}

async function flushPendingIce(remoteId) {
  const id = String(remoteId);
  const pc = rtcPeers.get(id);
  const pending = pendingIceCandidates.get(id);
  if (!pc || !pending || !pending.length) return;
  for (const c of pending) {
    try {
      await pc.addIceCandidate(new RTCIceCandidate(c));
    } catch (_) {
      /* ignore */
    }
  }
  pendingIceCandidates.delete(id);
}

async function addIceFromRemote(remoteId, candidateInit) {
  const id = String(remoteId);
  const pc = rtcPeers.get(id);
  if (!candidateInit) return;
  if (!pc) return;
  if (!pc.remoteDescription) {
    let arr = pendingIceCandidates.get(id);
    if (!arr) {
      arr = [];
      pendingIceCandidates.set(id, arr);
    }
    arr.push(candidateInit);
    return;
  }
  try {
    await pc.addIceCandidate(new RTCIceCandidate(candidateInit));
  } catch (_) {
    /* ignore */
  }
}

function attachRtcHandlers(pc, remoteId) {
  const rid = String(remoteId);
  const myPid = String(trainingState.participantId);
  pc.onicecandidate = (e) => {
    if (e.candidate) {
      voiceBroadcastSig({ t: 'ice', from: myPid, to: rid, c: e.candidate.toJSON() });
    }
  };
  pc.ontrack = (e) => {
    const [stream] = e.streams;
    if (stream) playRemoteAudio(rid, stream);
  };
}

async function createOfferToPeer(remoteId) {
  const rid = String(remoteId);
  const myPid = String(trainingState.participantId);
  if (rid === myPid || rtcPeers.has(rid) || !localStream || !voiceChannel) return;
  const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });
  rtcPeers.set(rid, pc);
  localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));
  attachRtcHandlers(pc, rid);
  try {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    voiceBroadcastSig({ t: 'offer', from: myPid, to: rid, sdp: offer.sdp });
  } catch (e) {
    console.warn('WebRTC offer failed:', e);
    closeRtcPeer(rid);
  }
}

async function handleRemoteOffer(fromPid, sdp) {
  const rid = String(fromPid);
  const myPid = String(trainingState.participantId);
  if (!localStream || !voiceChannel || rid === myPid || !sdp) return;
  let pc = rtcPeers.get(rid);
  if (!pc) {
    pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });
    rtcPeers.set(rid, pc);
    localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));
    attachRtcHandlers(pc, rid);
  }
  try {
    await pc.setRemoteDescription({ type: 'offer', sdp });
    await flushPendingIce(rid);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    voiceBroadcastSig({ t: 'answer', from: myPid, to: rid, sdp: answer.sdp });
  } catch (e) {
    console.warn('WebRTC answer failed:', e);
    closeRtcPeer(rid);
  }
}

async function handleRemoteAnswer(fromPid, sdp) {
  const rid = String(fromPid);
  const pc = rtcPeers.get(rid);
  if (!pc || !sdp) return;
  try {
    await pc.setRemoteDescription({ type: 'answer', sdp });
    await flushPendingIce(rid);
  } catch (e) {
    console.warn('WebRTC setRemoteDescription (answer) failed:', e);
    closeRtcPeer(rid);
  }
}

async function handleVoicePayload(raw) {
  const p = raw && typeof raw === 'object' ? raw : {};
  const myPid = String(trainingState.participantId || '');
  const t = p.t;
  const from = String(p.from || '');
  const to = String(p.to || '');
  if (!myPid || to !== myPid) return;
  if (t === 'offer') await handleRemoteOffer(from, p.sdp);
  else if (t === 'answer') await handleRemoteAnswer(from, p.sdp);
  else if (t === 'ice') await addIceFromRemote(from, p.c);
}

function presenceMetaFrom(key, metas) {
  const meta = Array.isArray(metas) && metas[0] ? metas[0] : null;
  if (!meta || typeof meta !== 'object') return null;
  const pid = String(meta.participantId || key);
  return {
    participantId: pid,
    name: String(meta.name || 'User'),
    stickerIdx: Number(meta.stickerIdx) || 1,
    muted: Boolean(meta.muted),
  };
}

function ingestPresenceState() {
  if (!voiceChannel) return;
  const state = voiceChannel.presenceState();
  for (const key of Object.keys(state)) {
    const row = presenceMetaFrom(key, state[key]);
    if (!row) continue;
    const isSelf = row.participantId === String(trainingState.participantId);
    addVoicePeer(row.participantId, row.name, isSelf, row.stickerIdx, row.muted);
  }
}

function connectAllRemotePeers() {
  if (!voiceChannel || !localStream) return;
  const myPid = String(trainingState.participantId);
  const state = voiceChannel.presenceState();
  for (const key of Object.keys(state)) {
    const row = presenceMetaFrom(key, state[key]);
    if (!row || row.participantId === myPid) continue;
    if (myPid < row.participantId) {
      void createOfferToPeer(row.participantId);
    }
  }
}

function handleVoicePresenceLeave(key) {
  const pid = String(key);
  removeVoicePeer(pid);
  closeRtcPeer(pid);
}

async function initVoiceRealtimeChannel() {
  if (!trainingState.supabase || !trainingState.groupId || !trainingState.participantId) return;
  const topic = `voice:${String(trainingState.groupId)}`;
  const myKey = String(trainingState.participantId);
  const ch = trainingState.supabase.channel(topic, {
    config: {
      broadcast: { self: false },
      presence: { key: myKey },
    },
  });
  voiceChannel = ch;

  ch.on('broadcast', { event: VOICE_EVENT }, (msg) => {
    const raw = msg && typeof msg === 'object' ? msg : {};
    const pl = raw.payload !== undefined ? raw.payload : raw;
    void handleVoicePayload(pl);
  });

  ch.on('presence', { event: 'sync' }, () => {
    ingestPresenceState();
    connectAllRemotePeers();
  });
  ch.on('presence', { event: 'join' }, () => {
    ingestPresenceState();
    connectAllRemotePeers();
  });
  ch.on('presence', { event: 'leave' }, ({ key }) => {
    handleVoicePresenceLeave(key);
  });

  await new Promise((resolve, reject) => {
    const ms = 20000;
    const t = setTimeout(() => reject(new Error('TIMED_OUT')), ms);
    ch.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        clearTimeout(t);
        resolve();
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        clearTimeout(t);
        reject(new Error(status));
      }
    });
  });

  const preCount = Object.keys(ch.presenceState()).length;
  voiceMyStickerIdx = (preCount % 3) + 1;

  await ch.track({
    participantId: myKey,
    name: trainingState.senderName || 'Guest',
    stickerIdx: voiceMyStickerIdx,
    muted: voiceMuted,
  });

  ingestPresenceState();
  connectAllRemotePeers();
}

function updateVoiceControlsUi() {
  const controls = document.getElementById('chatVoiceControls');
  const joinBtn = document.getElementById('btnJoinVoice');
  const leaveBtn = document.getElementById('btnLeaveVoice');
  const muteBtn = document.getElementById('btnToggleMute');
  if (!controls) return;
  const showVoice = Boolean(trainingState.realtimeReady && trainingState.groupId && !trainingState.sessionEnded);
  controls.classList.toggle('hidden', !showVoice);
  if (!showVoice) return;

  if (voiceJoined) {
    joinBtn?.classList.add('hidden');
    leaveBtn?.classList.remove('hidden');
    muteBtn?.classList.remove('hidden');
    if (muteBtn) {
      const label = muteBtn.querySelector('.btn-voice__label');
      if (label) label.textContent = voiceMuted ? 'Unmute' : 'Mute';
      muteBtn.querySelector('.btn-voice__icon--mic')?.classList.toggle('hidden', voiceMuted);
      muteBtn.querySelector('.btn-voice__icon--mic-off')?.classList.toggle('hidden', !voiceMuted);
      muteBtn.setAttribute('data-muted', String(voiceMuted));
      muteBtn.setAttribute('aria-pressed', String(voiceMuted));
    }
  } else {
    joinBtn?.classList.remove('hidden');
    leaveBtn?.classList.add('hidden');
    muteBtn?.classList.add('hidden');
  }
}

/** Alias kept for all existing callers in this file. */
function updateVoiceRoomUi() {
  updateVoiceControlsUi();
}

async function joinVoiceChannel() {
  if (voiceJoined) return;
  if (!trainingState.realtimeReady || !trainingState.supabase || !trainingState.groupId || !trainingState.participantId) {
    const msgEl = document.getElementById('chatVoiceCopyMsg');
    if (msgEl) msgEl.textContent = 'Voice needs live realtime chat. Try again after the session loads, or refresh.';
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    localStream = stream;
    voiceMuted = false;
    const track0 = localStream.getAudioTracks()[0];
    if (track0) track0.enabled = true;
    voiceJoined = true;
    updateVoiceControlsUi();
    try {
      await initVoiceRealtimeChannel();
    } catch (err) {
      console.warn('initVoiceRealtimeChannel:', err);
      const msgEl = document.getElementById('chatVoiceCopyMsg');
      if (msgEl) msgEl.textContent = 'Could not connect to the voice channel. Try again or leave and rejoin.';
      await leaveVoiceChannel();
    }
  } catch (e) {
    console.warn('joinVoiceChannel:', e);
    localStream = null;
    voiceJoined = false;
    const msgEl = document.getElementById('chatVoiceCopyMsg');
    if (msgEl) {
      msgEl.textContent =
        e && e.name === 'NotAllowedError'
          ? 'Microphone permission denied.'
          : e && e.message
            ? String(e.message)
            : 'Could not access microphone.';
    }
  }
  updateVoiceControlsUi();
}

async function leaveVoiceChannel() {
  if (!voiceJoined && !voiceChannel && !localStream) return;
  voiceJoined = false;
  voiceMuted = false;
  voicePeers.clear();
  renderVoiceStickers();
  [...rtcPeers.keys()].forEach((id) => {
    closeRtcPeer(id);
  });
  rtcPeers.clear();
  pendingIceCandidates.clear();
  if (localStream) {
    localStream.getTracks().forEach((t) => {
      try {
        t.stop();
      } catch (_) {
        /* ignore */
      }
    });
    localStream = null;
  }
  voiceMyStickerIdx = 1;
  const ch = voiceChannel;
  voiceChannel = null;
  if (ch && trainingState.supabase) {
    try {
      await ch.untrack();
    } catch (_) {
      /* ignore */
    }
    try {
      await trainingState.supabase.removeChannel(ch);
    } catch (_) {
      try {
        await ch.unsubscribe();
      } catch (__) {
        /* ignore */
      }
    }
  }
  updateVoiceControlsUi();
}

function toggleVoiceMute() {
  if (!voiceJoined || !localStream) return;
  const track = localStream.getAudioTracks()[0];
  if (!track) return;
  track.enabled = !track.enabled;
  voiceMuted = !track.enabled;
  const myPid = String(trainingState.participantId);
  setVoicePeerMuted(myPid, voiceMuted);
  if (voiceChannel) {
    void voiceChannel.track({
      participantId: myPid,
      name: trainingState.senderName || 'Guest',
      stickerIdx: voiceMyStickerIdx,
      muted: voiceMuted,
    });
  }
  updateVoiceControlsUi();
}

function setTrainingChatMobileTab(which) {
  const paneChat = document.getElementById('chatPaneChat');
  const paneBoard = document.getElementById('chatPaneBoard');
  const tabChat = document.getElementById('chatTabChat');
  const tabBoard = document.getElementById('chatTabBoard');
  const wrap = document.getElementById('whiteboardWrap');
  const isChat = which === 'chat';
  paneChat?.classList.toggle('chat-panel-pane--active', isChat);
  paneBoard?.classList.toggle('chat-panel-pane--active', !isChat);
  tabChat?.classList.toggle('active', isChat);
  tabBoard?.classList.toggle('active', !isChat);
  tabChat?.setAttribute('aria-selected', isChat ? 'true' : 'false');
  tabBoard?.setAttribute('aria-selected', isChat ? 'false' : 'true');
  if (trainingState.whiteboardAllowed && wrap && !wrap.classList.contains('whiteboard-wrap--session-off')) {
    wrap.classList.remove('whiteboard-wrap--collapsed');
    wrap.setAttribute('aria-hidden', 'false');
  }
  if (!isChat) {
    requestAnimationFrame(() => {
      resizeBoardToDisplay();
      void ensureWhiteboardRealtime();
    });
  }
}

function syncChatPanelLayout() {
  const panel = document.getElementById('chatPanel');
  const tabs = document.getElementById('chatPanelMobileTabs');
  const paneChat = document.getElementById('chatPaneChat');
  const paneBoard = document.getElementById('chatPaneBoard');
  const wrap = document.getElementById('whiteboardWrap');
  const split = window.matchMedia('(min-width: 900px)').matches && trainingState.whiteboardAllowed;
  document.getElementById('btnToggleWhiteboard')?.classList.add('hidden');
  panel?.classList.toggle('chat-panel--split', split);

  if (!trainingState.whiteboardAllowed) {
    tabs?.classList.add('hidden');
    paneChat?.classList.add('chat-panel-pane--active');
    paneBoard?.classList.remove('chat-panel-pane--active');
    return;
  }

  if (split) {
    tabs?.classList.add('hidden');
    wrap?.classList.remove('whiteboard-wrap--collapsed');
    wrap?.setAttribute('aria-hidden', 'false');
    paneBoard?.classList.add('chat-panel-pane--active');
    paneChat?.classList.add('chat-panel-pane--active');
    void ensureWhiteboardRealtime();
    requestAnimationFrame(() => resizeBoardToDisplay());
  } else {
    tabs?.classList.remove('hidden');
    setTrainingChatMobileTab('chat');
    wrap?.classList.remove('whiteboard-wrap--collapsed');
    wrap?.setAttribute('aria-hidden', 'false');
  }
}

let whiteboardChannel = null;
let boardDrawing = false;
let boardLast = null;
let boardThrottleUntil = 0;
const BOARD_THROTTLE_MS = 0;
const WHITE_EVENT = 'white';
let whiteboardUiAbort = null;

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

function applyWhiteboardPolicyToChatUi() {
  const wrap = document.getElementById('whiteboardWrap');
  const btn = document.getElementById('btnToggleWhiteboard');
  if (!wrap || !btn) return;
  if (!trainingState.whiteboardAllowed) {
    wrap.classList.add('whiteboard-wrap--session-off');
    wrap.classList.add('whiteboard-wrap--collapsed');
    wrap.setAttribute('aria-hidden', 'true');
    btn.classList.add('hidden');
    btn.textContent = 'Show whiteboard';
    btn.setAttribute('aria-expanded', 'false');
    void teardownWhiteboardUi();
    trainingState.whiteboardSubscribed = false;
    document.getElementById('chatPaneBoard')?.classList.add('chat-panel-pane--hidden');
    syncChatPanelLayout();
    updateVoiceRoomUi();
    return;
  }
  document.getElementById('chatPaneBoard')?.classList.remove('chat-panel-pane--hidden');
  wrap.classList.remove('whiteboard-wrap--session-off');
  btn.setAttribute('aria-expanded', 'false');
  syncChatPanelLayout();
  updateVoiceRoomUi();
}

async function ensureWhiteboardRealtime() {
  if (!trainingState.whiteboardAllowed || trainingState.whiteboardSubscribed) return;
  await attachWhiteboardRealtime();
  trainingState.whiteboardSubscribed = Boolean(whiteboardChannel);
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

function boardCoordClamped(ev, canvas) {
  const r = canvas.getBoundingClientRect();
  let x = ev.clientX - r.left;
  let y = ev.clientY - r.top;
  x = Math.max(0, Math.min(r.width, x));
  y = Math.max(0, Math.min(r.height, y));
  return { x, y };
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

function drawBoardText(x, y, text, color, fontSize, skipBroadcast) {
  const { canvas, ctx } = getBoardCanvasAndCtx();
  if (!ctx || !canvas) return;
  const t = String(text || '').trim().slice(0, 500);
  if (!t) return;
  const fsRaw = Number(fontSize);
  const fs = Number.isFinite(fsRaw) ? Math.max(8, Math.min(96, fsRaw)) : 22;
  ctx.save();
  ctx.fillStyle = color || '#00a99d';
  ctx.font = `${fs}px system-ui, -apple-system, Segoe UI, sans-serif`;
  ctx.textBaseline = 'top';
  ctx.fillText(t, x, y);
  ctx.restore();
  if (!skipBroadcast && whiteboardChannel) {
    const payload = { type: 'text', x, y, text: t, color: color || '#00a99d', fontSize: fs };
    void whiteboardChannel
      .send({ type: 'broadcast', event: WHITE_EVENT, payload })
      .catch(() => {});
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
    return;
  }
  if (payload.type === 'text') {
    drawBoardText(payload.x, payload.y, payload.text, payload.color, payload.fontSize, true);
  }
}

function teardownWhiteboardCanvasOnly() {
  boardDrawing = false;
  boardLast = null;
  const overlay = document.getElementById('whiteboardTextOverlay');
  const input = document.getElementById('whiteboardTextInput');
  if (overlay) overlay.classList.add('hidden');
  if (input) input.value = '';
  const { canvas } = getBoardCanvasAndCtx();
  if (canvas) {
    canvas.replaceWith(canvas.cloneNode(true));
  }
}

async function teardownWhiteboardUi() {
  whiteboardUiAbort?.abort();
  whiteboardUiAbort = null;
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

function syncWhiteboardToolUi() {
  const modeEl = document.getElementById('whiteboardMode');
  const strokeWrap = document.getElementById('whiteboardStrokeWidthWrap');
  const textWrap = document.getElementById('whiteboardTextSizeWrap');
  const mode = modeEl ? modeEl.value : 'pen';
  const isText = mode === 'text';
  strokeWrap?.classList.toggle('hidden', isText);
  textWrap?.classList.toggle('hidden', !isText);
}

function initWhiteboardUi() {
  teardownWhiteboardCanvasOnly();
  const canvas = document.getElementById('trainingWhiteboard');
  if (!canvas) return;
  whiteboardUiAbort?.abort();
  whiteboardUiAbort = new AbortController();
  const sig = whiteboardUiAbort.signal;
  resizeBoardToDisplay();
  window.addEventListener('resize', resizeBoardToDisplay, { signal: sig });

  const colorEl = document.getElementById('whiteboardColor');
  const widthEl = document.getElementById('whiteboardWidth');
  const textSizeEl = document.getElementById('whiteboardTextSize');
  const modeEl = document.getElementById('whiteboardMode');
  const clearBtn = document.getElementById('whiteboardClearAll');
  const textOverlay = document.getElementById('whiteboardTextOverlay');
  const textInput = document.getElementById('whiteboardTextInput');
  const textPlaceBtn = document.getElementById('whiteboardTextPlace');
  const textCancelBtn = document.getElementById('whiteboardTextCancel');

  let lineStart = null;
  let activeStrokeMode = null;
  let textAnchor = { x: 0, y: 0 };

  function currentColor() {
    return (colorEl && colorEl.value) || '#00a99d';
  }
  function currentWidth() {
    const w = widthEl ? Number(widthEl.value) : 3;
    return Number.isFinite(w) && w > 0 ? w : 3;
  }
  function currentTextSize() {
    const w = textSizeEl ? Number(textSizeEl.value) : 22;
    return Number.isFinite(w) ? Math.max(8, Math.min(96, w)) : 22;
  }

  function hideTextOverlay() {
    textOverlay?.classList.add('hidden');
    if (textInput) textInput.value = '';
  }

  function showTextOverlayAtCanvasPoint(p) {
    if (!textOverlay || !textInput || !canvas) return;
    const shell = textOverlay.parentElement;
    if (!shell) return;
    textAnchor = { x: p.x, y: p.y };
    const canvasRect = canvas.getBoundingClientRect();
    const shellRect = shell.getBoundingClientRect();
    const left = p.x + (canvasRect.left - shellRect.left);
    const top = p.y + (canvasRect.top - shellRect.top);
    textOverlay.style.left = `${Math.max(0, left)}px`;
    textOverlay.style.top = `${Math.max(0, top)}px`;
    textOverlay.classList.remove('hidden');
    textInput.focus();
  }

  function commitTextOverlay() {
    const raw = textInput ? String(textInput.value || '').trim() : '';
    if (!raw) {
      hideTextOverlay();
      return;
    }
    drawBoardText(textAnchor.x, textAnchor.y, raw, currentColor(), currentTextSize(), false);
    hideTextOverlay();
  }

  function startDraw(ev) {
    const mode = modeEl ? modeEl.value : 'pen';
    const p = boardCoordClamped(ev, canvas);
    if (mode === 'text') {
      showTextOverlayAtCanvasPoint(p);
      return;
    }
    activeStrokeMode = mode;
    if (mode === 'line') {
      lineStart = p;
      boardDrawing = true;
      boardLast = null;
      return;
    }
    lineStart = null;
    boardDrawing = true;
    boardLast = p;
  }
  function moveDraw(ev) {
    if (!boardDrawing || activeStrokeMode === 'line') return;
    if (!boardLast) return;
    const p = boardCoordClamped(ev, canvas);
    const mode = activeStrokeMode || 'pen';
    const col =
      mode === 'eraser'
        ? getComputedStyle(document.documentElement).getPropertyValue('--brand-surface').trim() || '#161a4f'
        : currentColor();
    const lw = mode === 'eraser' ? currentWidth() * 4 : currentWidth();
    drawBoardSegment(boardLast.x, boardLast.y, p.x, p.y, col, lw, false);
    boardLast = p;
  }
  function endDraw(ev) {
    if (activeStrokeMode === 'line' && lineStart && boardDrawing && ev) {
      const p = boardCoordClamped(ev, canvas);
      const col = currentColor();
      const lw = currentWidth();
      drawBoardSegment(lineStart.x, lineStart.y, p.x, p.y, col, lw, false);
    }
    lineStart = null;
    activeStrokeMode = null;
    boardDrawing = false;
    boardLast = null;
  }

  canvas.addEventListener('mousedown', startDraw, { signal: sig });
  canvas.addEventListener('mousemove', moveDraw, { signal: sig });
  window.addEventListener('mouseup', endDraw, { signal: sig });
  canvas.addEventListener(
    'touchstart',
    (e) => {
      e.preventDefault();
      if (e.touches[0]) startDraw(e.touches[0]);
    },
    { signal: sig, passive: false },
  );
  canvas.addEventListener(
    'touchmove',
    (e) => {
      e.preventDefault();
      if (e.touches[0]) moveDraw(e.touches[0]);
    },
    { signal: sig, passive: false },
  );
  canvas.addEventListener(
    'touchend',
    (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      if (t) endDraw(t);
      else endDraw();
    },
    { signal: sig, passive: false },
  );

  modeEl?.addEventListener('change', syncWhiteboardToolUi, { signal: sig });
  syncWhiteboardToolUi();

  textInput?.addEventListener(
    'keydown',
    (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitTextOverlay();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        hideTextOverlay();
      }
    },
    { signal: sig },
  );
  textPlaceBtn?.addEventListener('click', () => commitTextOverlay(), { signal: sig });
  textCancelBtn?.addEventListener('click', () => hideTextOverlay(), { signal: sig });

  clearBtn?.addEventListener('click', () => clearBoardLocal(true), { signal: sig });
}

async function attachWhiteboardRealtime() {
  setWhiteboardDisabled('');
  if (!trainingState.whiteboardAllowed) return;
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

async function teardownTrainingChatRealtime() {
  const ch = trainingState.channel;
  trainingState.channel = null;
  if (!ch) return;
  const client = trainingState.supabase;
  if (client) {
    try {
      await client.removeChannel(ch);
    } catch (_) {
      try {
        await ch.unsubscribe();
      } catch (__) {
        /* ignore */
      }
    }
  }
}

async function initRealtime() {
  trainingState.realtimeReady = false;
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
    trainingState.realtimeReady = true;
  } catch (_) {
    // keep polling fallback only
  }
}

async function verifyTrainingSessionAlive() {
  const token = trainingState.joinToken;
  if (!token || trainingState.sessionEnded || !trainingState.groupId) return;
  try {
    await jsonFetch(`/.netlify/functions/training-join?token=${encodeURIComponent(token)}`);
    trainingSessionAliveMisses = 0;
  } catch (_) {
    trainingSessionAliveMisses += 1;
    if (trainingSessionAliveMisses >= 2) {
      trainingSessionAliveMisses = 0;
      await handleTrainingSessionEnded();
    }
  }
}

async function handleTrainingSessionEnded() {
  if (trainingState.sessionEnded) return;
  trainingState.sessionEnded = true;
  clearTrainingParticipantPolls();
  trainingState.joinToken = null;
  trainingState.groupId = null;
  trainingState.participantId = null;
  trainingState.senderName = null;
  trainingState.voiceRoomUrl = null;
  trainingState.whiteboardAllowed = false;
  trainingState.whiteboardSubscribed = false;
  trainingState.realtimeReady = false;

  await teardownTrainingChatRealtime();
  await teardownWhiteboardUi();

  await leaveVoiceChannel();

  const chatPanel = document.getElementById('chatPanel');
  chatPanel?.classList.add('chat-panel--session-ended');
  document.getElementById('chatSessionEndedBanner')?.classList.remove('hidden');

  const chatForm = document.getElementById('chatForm');
  if (chatForm) {
    chatForm.querySelectorAll('input, button').forEach((el) => {
      el.disabled = true;
    });
  }

  updateVoiceRoomUi();

  const base = `${window.location.origin}${window.location.pathname}`;
  try {
    history.replaceState({}, '', base);
  } catch (_) {
    /* ignore */
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
    const subHint =
      'Choose a group below. Then enter your display name to open chat, the optional shared board, and in-page voice (when live realtime is enabled).';
    setTrainingParticipantHero(data.title || 'Live session', subHint);
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
  document.getElementById('participantLanding')?.classList.add('hidden');
  const panel = document.getElementById('joinPanel');
  const joinData = await jsonFetch(`/.netlify/functions/training-join?token=${encodeURIComponent(token)}`);
  trainingState.whiteboardAllowed = joinData.whiteboardEnabled !== false;
  setTrainingParticipantHero(
    joinData.sessionTitle || 'Live session',
    `Group ${joinData.groupNumber}. Enter your display name below — then chat, the optional shared board, and voice (Join voice in the header when realtime is available) stay on this page.`,
  );
  if (panel) panel.classList.remove('hidden');
  document.getElementById('chatPanel').classList.add('hidden');
  document.getElementById('joinHeading').textContent = `${joinData.sessionTitle || 'Live session'} — Group ${joinData.groupNumber}`;
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
    trainingState.whiteboardAllowed = joined.whiteboardEnabled !== false;
    panel.classList.add('hidden');
    document.getElementById('chatPanel').classList.remove('hidden');
    const sub = document.getElementById('chatPanelSub');
    if (sub) {
      sub.textContent = `${joined.sessionTitle || joinData.sessionTitle || 'Live session'} · Group ${joined.groupNumber ?? joinData.groupNumber}`;
    }
    applyWhiteboardPolicyToChatUi();
    loadRecentMessages();
    await initRealtime();
    updateVoiceRoomUi();
    clearTrainingParticipantPolls();
    trainingMessagesIntervalId = setInterval(loadRecentMessages, 10000);
    trainingSessionAliveIntervalId = setInterval(() => {
      void verifyTrainingSessionAlive();
    }, 15000);
  };
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
      const wbEl = document.getElementById('trainingWhiteboardEnabled');
      const data = await jsonFetch('/.netlify/functions/training-sessions', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          title,
          groupsCount,
          whiteboardEnabled: wbEl ? wbEl.checked : true,
        }),
      });
      const base = `${window.location.origin}${window.location.pathname}`;
      const sorted = (data.groups || []).slice().sort((a, b) => a.group_number - b.group_number);
      const session = data.session;
      const href = session && session.id ? `${base}?session=${session.id}` : base;
      const escV = (v) =>
        String(v)
          .replace(/&/g, '&amp;')
          .replace(/"/g, '&quot;')
          .replace(/</g, '&lt;');
      links.innerHTML =
        session && session.id
          ? `<h4>Share link for students</h4><p class="share-link-wrap"><a href="${escV(href)}" target="_blank" rel="noopener">${escV(href)}</a></p>${
              sorted.length > 1 ? `<p class="muted small-margin">Students choose their group after opening this link.</p>` : ''
            }<p class="muted small-margin">Participants use <strong>Join voice</strong> in the chat header for in-page audio (requires Supabase Realtime).</p>`
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

  document.getElementById('chatTabChat')?.addEventListener('click', () => setTrainingChatMobileTab('chat'));
  document.getElementById('chatTabBoard')?.addEventListener('click', () => setTrainingChatMobileTab('board'));
  document.getElementById('btnJoinVoice')?.addEventListener('click', () => void joinVoiceChannel());
  document.getElementById('btnLeaveVoice')?.addEventListener('click', () => void leaveVoiceChannel());
  document.getElementById('btnToggleMute')?.addEventListener('click', () => toggleVoiceMute());
  window.addEventListener('resize', () => {
    if (document.getElementById('chatPanel') && !document.getElementById('chatPanel').classList.contains('hidden')) {
      syncChatPanelLayout();
      resizeBoardToDisplay();
    }
  });

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
