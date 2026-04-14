/**
 * In-dashboard presenter helpers: QR (client), script reader (speechSynthesis), teleprompter.
 * Global shortcuts only apply while #view-training-presenter-tools is active.
 */

const VIEW_ID = 'training-presenter-tools';

function viewSection() {
  return document.getElementById(`view-${VIEW_ID}`);
}

function isPresenterViewActive() {
  return Boolean(viewSection()?.classList.contains('active'));
}

let qrModulePromise = null;
function loadQrModule() {
  if (!qrModulePromise) {
    qrModulePromise = import('https://esm.sh/qrcode@1.5.4').then((m) => m.default || m);
  }
  return qrModulePromise;
}

/* ---------- Tabs ---------- */

function setPresenterTab(which) {
  document.querySelectorAll('#view-training-presenter-tools [data-presenter-tab]').forEach((btn) => {
    const on = btn.getAttribute('data-presenter-tab') === which;
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  ['qr', 'script', 'tele'].forEach((id) => {
    const panel = document.getElementById(`presenterPanel${id === 'qr' ? 'Qr' : id === 'script' ? 'Script' : 'Tele'}`);
    if (!panel) return;
    const show = id === which;
    panel.classList.toggle('hidden', !show);
  });
}

/* ---------- QR ---------- */

async function onQrGenerate() {
  const urlEl = document.getElementById('presenterQrUrl');
  const msg = document.getElementById('presenterQrMsg');
  const img = document.getElementById('presenterQrImg');
  const dl = document.getElementById('presenterQrDownload');
  const raw = String(urlEl?.value || '').trim();
  if (!raw) {
    if (msg) msg.textContent = 'Enter a URL first.';
    return;
  }
  let urlToEncode = raw;
  if (!/^https?:\/\//i.test(urlToEncode)) urlToEncode = `https://${urlToEncode}`;
  try {
    new URL(urlToEncode);
  } catch {
    if (msg) msg.textContent = 'That does not look like a valid URL.';
    return;
  }
  if (msg) msg.textContent = 'Generating…';
  try {
    const QRCode = await loadQrModule();
    const dataUrl = await QRCode.toDataURL(urlToEncode, {
      width: 300,
      margin: 2,
      color: { dark: '#1e293b', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    });
    if (img) {
      img.src = dataUrl;
      img.classList.remove('hidden');
    }
    if (dl) dl.disabled = false;
    if (msg) msg.textContent = '';
    img?.setAttribute('data-download-url', dataUrl);
  } catch (e) {
    console.error(e);
    if (msg) {
      msg.textContent =
        'Could not load the QR library (network or blocker). Try again on a connection that allows https://esm.sh.';
    }
    if (img) img.classList.add('hidden');
    if (dl) dl.disabled = true;
  }
}

function onQrDownload() {
  const img = document.getElementById('presenterQrImg');
  const dataUrl = img?.getAttribute('data-download-url');
  if (!dataUrl) return;
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `qr-${Date.now()}.png`;
  a.click();
}

/* ---------- Script reader ---------- */

const scriptState = {
  isPlaying: false,
  isPaused: false,
  currentPosition: 0,
  speed: 1,
  volume: 1,
  isMuted: false,
  selectedVoiceName: '',
  highlightedText: '',
  utterance: null,
};

function scriptText() {
  return String(document.getElementById('presenterScriptText')?.value || '');
}

function updateScriptCounts() {
  const t = scriptText();
  const words = t.trim() ? t.trim().split(/\s+/).length : 0;
  const el = document.getElementById('presenterScriptCounts');
  if (el) el.textContent = `${t.length} characters · ${words} words`;
}

function fillVoiceSelect() {
  const sel = document.getElementById('presenterScriptVoice');
  if (!sel) return;
  const voices = window.speechSynthesis.getVoices() || [];
  const prev = scriptState.selectedVoiceName;
  sel.innerHTML = '';
  voices.forEach((v) => {
    const opt = document.createElement('option');
    opt.value = v.name;
    opt.textContent = `${v.name} (${v.lang})`;
    sel.appendChild(opt);
  });
  if (voices.length) {
    const still = voices.find((v) => v.name === prev);
    const english = voices.find((v) => v.lang.startsWith('en') && v.localService) || voices[0];
    scriptState.selectedVoiceName = (still || english).name;
    sel.value = scriptState.selectedVoiceName;
  }
}

function setScriptProgress() {
  const t = scriptText();
  const pct = t.length ? Math.min(100, Math.round((scriptState.currentPosition / t.length) * 100)) : 0;
  const fill = document.getElementById('presenterScriptProgressFill');
  const label = document.getElementById('presenterScriptProgressPct');
  if (fill) fill.style.width = `${pct}%`;
  if (label) label.textContent = `${pct}%`;
}

function scriptSyncButtons() {
  const play = document.getElementById('presenterScriptPlay');
  const pause = document.getElementById('presenterScriptPause');
  const stop = document.getElementById('presenterScriptStop');
  if (play) {
    play.textContent = scriptState.isPaused ? 'Resume' : 'Play';
    play.disabled = !scriptText().trim() || (scriptState.isPlaying && !scriptState.isPaused);
  }
  if (pause) pause.disabled = !scriptState.isPlaying;
  if (stop) stop.disabled = !scriptState.isPlaying && !scriptState.isPaused;
}

function scriptStop(resetPos) {
  window.speechSynthesis.cancel();
  scriptState.isPlaying = false;
  scriptState.isPaused = false;
  if (resetPos) scriptState.currentPosition = 0;
  scriptState.highlightedText = '';
  const read = document.getElementById('presenterScriptReading');
  if (read) {
    read.textContent = '';
    read.classList.add('hidden');
  }
  setScriptProgress();
  scriptSyncButtons();
}

function scriptPlay() {
  const text = scriptText();
  if (!text.trim()) return;

  if (scriptState.isPaused) {
    window.speechSynthesis.resume();
    scriptState.isPaused = false;
    scriptState.isPlaying = true;
    scriptSyncButtons();
    return;
  }

  window.speechSynthesis.cancel();
  const utterStart = scriptState.currentPosition;
  const slice = text.substring(utterStart);
  const utter = new SpeechSynthesisUtterance(slice);
  utter.rate = scriptState.speed;
  utter.volume = scriptState.isMuted ? 0 : scriptState.volume;
  const voices = window.speechSynthesis.getVoices() || [];
  const voice = voices.find((v) => v.name === scriptState.selectedVoiceName) || voices[0];
  if (voice) utter.voice = voice;

  utter.onboundary = (event) => {
    if (event.name === 'word' && typeof event.charIndex === 'number') {
      scriptState.currentPosition = Math.min(text.length, utterStart + event.charIndex);
      const at = scriptState.currentPosition;
      const sentences = text.split(/[.!?]+/);
      let sentenceStart = 0;
      let currentSentence = '';
      for (const sentence of sentences) {
        const sentenceEnd = sentenceStart + sentence.length;
        if (at >= sentenceStart && at <= sentenceEnd) {
          currentSentence = sentence.trim();
          break;
        }
        sentenceStart = sentenceEnd + 1;
      }
      scriptState.highlightedText = currentSentence;
      const read = document.getElementById('presenterScriptReading');
      if (read && currentSentence) {
        read.textContent = `Reading: ${currentSentence}`;
        read.classList.remove('hidden');
      }
      setScriptProgress();
    }
  };

  utter.onend = () => {
    scriptState.isPlaying = false;
    scriptState.isPaused = false;
    scriptState.currentPosition = 0;
    scriptState.highlightedText = '';
    scriptState.utterance = null;
    setScriptProgress();
    scriptSyncButtons();
    const read = document.getElementById('presenterScriptReading');
    if (read) read.classList.add('hidden');
  };

  utter.onerror = () => {
    scriptState.isPlaying = false;
    scriptState.isPaused = false;
    scriptSyncButtons();
  };

  scriptState.utterance = utter;
  window.speechSynthesis.speak(utter);
  scriptState.isPlaying = true;
  scriptState.isPaused = false;
  scriptSyncButtons();
}

function scriptPause() {
  window.speechSynthesis.pause();
  scriptState.isPaused = true;
  scriptState.isPlaying = false;
  scriptSyncButtons();
}

/* ---------- Teleprompter ---------- */

const teleState = {
  isPlaying: false,
  scrollPosition: 0,
  scrollSpeed: 50,
  fontSize: 48,
  textColor: '#ffffff',
  bgColor: '#000000',
  raf: null,
  lastTime: 0,
};

function teleText() {
  return String(document.getElementById('presenterTeleText')?.value || '');
}

function updateTeleCounts() {
  const t = teleText();
  const words = t.trim() ? t.trim().split(/\s+/).length : 0;
  const el = document.getElementById('presenterTeleCounts');
  if (el) el.textContent = `${words} words`;
}

function applyTeleVisual() {
  const inner = document.getElementById('presenterTeleScrollInner');
  const viewport = document.getElementById('presenterTeleViewport');
  if (inner) {
    inner.textContent = teleText();
    inner.style.fontSize = `${teleState.fontSize}px`;
    inner.style.lineHeight = `${teleState.fontSize * 1.5}px`;
    inner.style.color = teleState.textColor;
  }
  if (viewport) viewport.style.background = teleState.bgColor;
}

function teleMaxScroll() {
  const inner = document.getElementById('presenterTeleScrollInner');
  const viewport = document.getElementById('presenterTeleViewport');
  if (!inner || !viewport) return 0;
  return Math.max(0, inner.scrollHeight - viewport.clientHeight);
}

function teleApplyTransform() {
  const inner = document.getElementById('presenterTeleScrollInner');
  if (inner) inner.style.transform = `translateY(-${teleState.scrollPosition}px)`;
}

function teleTick(time) {
  if (!teleState.isPlaying) return;
  const text = teleText();
  if (!text.trim()) {
    teleState.isPlaying = false;
    teleSyncPlayButton();
    return;
  }
  const maxScroll = teleMaxScroll();
  if (maxScroll <= 0) {
    teleState.isPlaying = false;
    teleState.lastTime = 0;
    teleSyncPlayButton();
    return;
  }
  if (teleState.lastTime === 0) teleState.lastTime = time;
  const delta = time - teleState.lastTime;
  teleState.lastTime = time;
  const baseSpeed = (teleState.scrollSpeed / 100) * teleState.fontSize * 8;
  const increment = (baseSpeed * delta) / 1000;
  teleState.scrollPosition += increment;
  if (teleState.scrollPosition >= maxScroll) {
    teleState.scrollPosition = maxScroll;
    teleState.isPlaying = false;
    teleState.lastTime = 0;
    teleSyncPlayButton();
  }
  teleApplyTransform();
  if (teleState.isPlaying) teleState.raf = requestAnimationFrame(teleTick);
}

function stopTeleAnimation(resetTime) {
  if (teleState.raf) cancelAnimationFrame(teleState.raf);
  teleState.raf = null;
  teleState.isPlaying = false;
  teleState.lastTime = 0;
  if (resetTime) teleState.lastTime = 0;
  teleSyncPlayButton();
}

function teleTogglePlay() {
  const text = teleText();
  if (!text.trim()) return;
  const wasPlaying = teleState.isPlaying;
  teleState.isPlaying = !wasPlaying;
  teleState.lastTime = 0;
  if (teleState.isPlaying) {
    if (teleMaxScroll() <= 0) {
      teleState.isPlaying = false;
      teleSyncPlayButton();
      return;
    }
    teleState.raf = requestAnimationFrame(teleTick);
  } else if (teleState.raf) {
    cancelAnimationFrame(teleState.raf);
    teleState.raf = null;
  }
  teleSyncPlayButton();
}

function teleSyncPlayButton() {
  const btn = document.getElementById('presenterTelePlayPause');
  if (btn) btn.textContent = teleState.isPlaying ? 'Pause' : 'Play';
}

/* ---------- Global keys ---------- */

function shouldIgnoreSpaceTarget(t) {
  if (!t || !t.tagName) return false;
  const tag = t.tagName.toLowerCase();
  if (tag === 'textarea') return true;
  if (tag === 'select') return true;
  if (tag === 'button') return true;
  if (tag === 'input') {
    const type = String(t.type || '').toLowerCase();
    if (['text', 'url', 'search', 'email', 'password', 'number', 'range', 'color'].includes(type)) return true;
  }
  return false;
}

function onDocumentKeydown(e) {
  if (!isPresenterViewActive()) return;
  const telePanel = document.getElementById('presenterPanelTele');
  const stage = document.getElementById('presenterTeleStage');
  const viewport = document.getElementById('presenterTeleViewport');
  if (!telePanel || telePanel.classList.contains('hidden')) return;

  const fsEl = document.fullscreenElement;
  const inOurFullscreen = fsEl && stage && stage.contains(fsEl);

  if (e.code === 'Escape' && inOurFullscreen) {
    e.preventDefault();
    void document.exitFullscreen();
    return;
  }

  if (e.code !== 'Space') return;
  if (shouldIgnoreSpaceTarget(e.target)) return;

  const onTelePanel = Boolean(e.target && typeof e.target.closest === 'function' && e.target.closest('#presenterPanelTele'));
  if (inOurFullscreen || e.target === viewport || viewport?.contains(e.target) || onTelePanel) {
    e.preventDefault();
    teleTogglePlay();
  }
}

/* ---------- Public lifecycle ---------- */

export function leavePresenterToolsView() {
  scriptStop(true);
  stopTeleAnimation(true);
  const stage = document.getElementById('presenterTeleStage');
  const fs = document.fullscreenElement;
  if (fs && stage && stage.contains(fs)) {
    void document.exitFullscreen().catch(() => {});
  }
}

export function onPresenterToolsViewShown() {
  fillVoiceSelect();
}

let booted = false;

export function initTrainingPresenterTools() {
  if (booted) return;
  booted = true;

  document.querySelectorAll('#view-training-presenter-tools [data-presenter-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-presenter-tab');
      if (tab) setPresenterTab(tab);
    });
  });

  document.getElementById('presenterQrGenerate')?.addEventListener('click', () => void onQrGenerate());
  document.getElementById('presenterQrUrl')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void onQrGenerate();
    }
  });
  document.getElementById('presenterQrDownload')?.addEventListener('click', onQrDownload);

  document.getElementById('presenterScriptText')?.addEventListener('input', () => {
    updateScriptCounts();
    setScriptProgress();
    scriptSyncButtons();
  });
  document.getElementById('presenterScriptPickFile')?.addEventListener('click', () => {
    document.getElementById('presenterScriptFile')?.click();
  });
  document.getElementById('presenterScriptFile')?.addEventListener('change', (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const ta = document.getElementById('presenterScriptText');
      if (ta) ta.value = String(reader.result || '');
      updateScriptCounts();
      scriptStop(true);
      e.target.value = '';
    };
    reader.readAsText(f);
  });
  document.getElementById('presenterScriptClear')?.addEventListener('click', () => {
    const ta = document.getElementById('presenterScriptText');
    if (ta) ta.value = '';
    updateScriptCounts();
    scriptStop(true);
  });
  document.getElementById('presenterScriptPlay')?.addEventListener('click', scriptPlay);
  document.getElementById('presenterScriptPause')?.addEventListener('click', scriptPause);
  document.getElementById('presenterScriptStop')?.addEventListener('click', () => scriptStop(true));
  document.getElementById('presenterScriptReset')?.addEventListener('click', () => {
    scriptStop(true);
    scriptState.currentPosition = 0;
    setScriptProgress();
    scriptSyncButtons();
  });
  document.getElementById('presenterScriptSpeed')?.addEventListener('input', (e) => {
    scriptState.speed = parseFloat(e.target.value) || 1;
    const lab = document.getElementById('presenterScriptSpeedVal');
    if (lab) lab.textContent = String(scriptState.speed);
  });
  document.getElementById('presenterScriptVolume')?.addEventListener('input', (e) => {
    scriptState.volume = parseFloat(e.target.value) || 0;
    const lab = document.getElementById('presenterScriptVolumeVal');
    if (lab) lab.textContent = String(Math.round(scriptState.volume * 100));
  });
  document.getElementById('presenterScriptMute')?.addEventListener('change', (e) => {
    scriptState.isMuted = Boolean(e.target.checked);
  });
  document.getElementById('presenterScriptVoice')?.addEventListener('change', (e) => {
    scriptState.selectedVoiceName = String(e.target.value || '');
  });

  window.speechSynthesis.addEventListener('voiceschanged', fillVoiceSelect);

  document.getElementById('presenterTeleText')?.addEventListener('input', () => {
    updateTeleCounts();
    applyTeleVisual();
    teleState.scrollPosition = 0;
    teleApplyTransform();
  });
  document.getElementById('presenterTelePickFile')?.addEventListener('click', () => {
    document.getElementById('presenterTeleFile')?.click();
  });
  document.getElementById('presenterTeleFile')?.addEventListener('change', (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const ta = document.getElementById('presenterTeleText');
      if (ta) ta.value = String(reader.result || '');
      updateTeleCounts();
      applyTeleVisual();
      teleState.scrollPosition = 0;
      teleApplyTransform();
      e.target.value = '';
    };
    reader.readAsText(f);
  });
  document.getElementById('presenterTeleClear')?.addEventListener('click', () => {
    const ta = document.getElementById('presenterTeleText');
    if (ta) ta.value = '';
    updateTeleCounts();
    stopTeleAnimation(true);
    teleState.scrollPosition = 0;
    applyTeleVisual();
    teleApplyTransform();
  });
  document.getElementById('presenterTelePlayPause')?.addEventListener('click', teleTogglePlay);
  document.getElementById('presenterTeleStop')?.addEventListener('click', () => {
    stopTeleAnimation(true);
    teleState.scrollPosition = 0;
    teleApplyTransform();
  });
  document.getElementById('presenterTeleResetScroll')?.addEventListener('click', () => {
    teleState.scrollPosition = 0;
    teleApplyTransform();
  });
  document.getElementById('presenterTeleSpeed')?.addEventListener('input', (e) => {
    teleState.scrollSpeed = parseInt(e.target.value, 10) || 50;
  });
  document.getElementById('presenterTeleFont')?.addEventListener('input', (e) => {
    teleState.fontSize = parseInt(e.target.value, 10) || 48;
    applyTeleVisual();
    teleApplyTransform();
  });
  document.getElementById('presenterTeleColorFg')?.addEventListener('input', (e) => {
    teleState.textColor = e.target.value;
    applyTeleVisual();
  });
  document.getElementById('presenterTeleColorBg')?.addEventListener('input', (e) => {
    teleState.bgColor = e.target.value;
    applyTeleVisual();
  });
  document.getElementById('presenterTeleFullscreen')?.addEventListener('click', async () => {
    const stage = document.getElementById('presenterTeleStage');
    if (!stage) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await stage.requestFullscreen();
    } catch (err) {
      console.error(err);
    }
  });

  document.addEventListener('fullscreenchange', () => {
    const stage = document.getElementById('presenterTeleStage');
    const fs = document.fullscreenElement;
    if (stage && fs && stage.contains(fs)) {
      stage.style.background = teleState.bgColor;
    } else if (stage) {
      stage.style.background = '';
    }
  });

  document.addEventListener('keydown', onDocumentKeydown, true);

  fillVoiceSelect();
  updateScriptCounts();
  setScriptProgress();
  scriptSyncButtons();
  updateTeleCounts();
  applyTeleVisual();
  teleApplyTransform();
  teleSyncPlayButton();
}
