import {
  AUTH_TOKEN,
  AUTH_ROLE,
  AUTH_USER,
  authToken,
  authRole,
  authUsername,
  jsonFetch,
  getAuthHeaders,
} from './shared.js';
import { showLogin, showApp, applyRoleVisibility, initShell } from './nav.js';
import { initCampaigns } from './campaigns.js';
import { initOperations, initOpsInsights, initBulkEnrollment } from './operations.js';
import { initTraining, initTrainingTools } from './training.js';
import { initClassroom } from './classroom.js';
import { initCourseLibrary } from './course-library.js';
import { initPublicClassroom } from './public-classroom.js';
import { initAdmin } from './admin.js';
import { initFinance } from './finance.js';

const loginError = document.getElementById('loginError');
let lastDemoError = '';
let demoSupportNumberCache = '';

const loggedInUserEl = document.getElementById('loggedInUser');
if (loggedInUserEl && authUsername) loggedInUserEl.textContent = `${authUsername} (${authRole || 'user'})`;

/** Participant classroom link (?classroom=<token>) works without staff login. */
function hasPublicClassroomQuery() {
  try {
    const q = new URLSearchParams(window.location.search);
    return Boolean(String(q.get('classroom') || '').trim());
  } catch (_) {
    return false;
  }
}

/** Student share links (?session= or ?=group) work without staff login. */
function hasPublicTrainingJoinQuery() {
  try {
    const q = new URLSearchParams(window.location.search);
    const session = String(q.get('session') || '').trim();
    const group = String(q.get('group') || '').trim();
    return Boolean(session || group);
  } catch (_) {
    return false;
  }
}

function toggleChangePasswordPanel() {
  const wrap = document.getElementById('changePasswordWrap');
  if (!wrap) return;
  const u = String(localStorage.getItem(AUTH_USER) || '').trim().toLowerCase();
  if (authToken && u && u !== 'local') wrap.classList.remove('hidden');
  else wrap.classList.add('hidden');
}

function initChangePasswordForm() {
  const form = document.getElementById('changePasswordForm');
  const msg = document.getElementById('changePasswordMsg');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (msg) msg.textContent = '';
    const cur = String(document.getElementById('changePasswordCurrent')?.value || '');
    const neu = String(document.getElementById('changePasswordNew')?.value || '');
    const conf = String(document.getElementById('changePasswordConfirm')?.value || '');
    if (neu !== conf) {
      if (msg) msg.textContent = 'New password and confirmation do not match.';
      return;
    }
    try {
      await jsonFetch('/.netlify/functions/change-password', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ currentPassword: cur, newPassword: neu }),
      });
      if (msg) msg.textContent = 'Password updated. Use your new password next login.';
      form.reset();
    } catch (err) {
      if (msg) msg.textContent = err.message || 'Could not update password.';
    }
  });
}

function getCurrentViewId() {
  const active = document.querySelector('.view.active');
  const id = active && active.id ? String(active.id) : '';
  return id.startsWith('view-') ? id.slice(5) : id;
}

function buildDemoIssueMessage() {
  const viewId = getCurrentViewId() || 'unknown';
  const username = String(localStorage.getItem(AUTH_USER) || '').trim() || 'unknown';
  const role = String(localStorage.getItem(AUTH_ROLE) || '').trim() || 'unknown';
  const at = new Date().toISOString();
  const lines = [
    'I have an issue in Demo.',
    `View: ${viewId}`,
    `User: ${username}`,
    `Role: ${role}`,
    `Time: ${at}`,
  ];
  if (lastDemoError) lines.push(`Error: ${lastDemoError}`);
  return lines.join('\n');
}

async function updateDemoWhatsappCta() {
  const cta = document.getElementById('demoWhatsappCta');
  if (!cta) return;
  if (!demoSupportNumberCache) {
    try {
      const data = await jsonFetch('/.netlify/functions/demo-support-config');
      demoSupportNumberCache = String(data.number || '').trim();
    } catch (_) {
      demoSupportNumberCache = '';
    }
  }
  const number = demoSupportNumberCache;
  if (!number) {
    cta.classList.add('disabled');
    cta.setAttribute('aria-disabled', 'true');
    cta.setAttribute('title', 'Support number not configured');
    cta.setAttribute('href', '#');
    return;
  }
  const msg = buildDemoIssueMessage();
  const normalized = number.replace(/^\+/, '');
  cta.classList.remove('disabled');
  cta.setAttribute('aria-disabled', 'false');
  cta.setAttribute('title', 'Contact demo support on WhatsApp');
  cta.setAttribute('href', `https://wa.me/${encodeURIComponent(normalized)}?text=${encodeURIComponent(msg)}`);
}

function pulseDemoWhatsappCta(errorText) {
  const cta = document.getElementById('demoWhatsappCta');
  if (!cta) return;
  if (errorText) lastDemoError = String(errorText).replace(/\s+/g, ' ').slice(0, 220);
  void updateDemoWhatsappCta();
  cta.classList.add('attention');
  window.setTimeout(() => cta.classList.remove('attention'), 5500);
}

function initDemoSupportCta() {
  void updateDemoWhatsappCta();
  document.addEventListener('click', (e) => {
    const cta = document.getElementById('demoWhatsappCta');
    if (!cta) return;
    if (e.target instanceof Node && cta.contains(e.target)) {
      if (cta.classList.contains('disabled')) e.preventDefault();
      else void updateDemoWhatsappCta();
    }
  });
  window.addEventListener('sbs:demo-support-number-updated', () => {
    demoSupportNumberCache = '';
    void updateDemoWhatsappCta();
  });
  window.addEventListener('error', (ev) => {
    const msg = ev && ev.message ? ev.message : 'Unhandled error';
    pulseDemoWhatsappCta(msg);
  });
  window.addEventListener('unhandledrejection', (ev) => {
    const reason = ev && ev.reason ? String(ev.reason.message || ev.reason) : 'Unhandled promise rejection';
    pulseDemoWhatsappCta(reason);
  });
}

function dismissAppPreloader() {
  const el = document.getElementById('app-preloader');
  if (!el) return;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.classList.add('app-preloader--done');
      el.setAttribute('aria-busy', 'false');
    });
  });
}

function bootPublicClassroomGuest() {
  try {
    const q = new URLSearchParams(window.location.search);
    const token = String(q.get('classroom') || '').trim();
    document.body.classList.add('public-classroom-guest');
    showApp();
    document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
    document.getElementById('view-public-classroom')?.classList.add('active');
    void initPublicClassroom(token);
  } catch (_) {
    /* ignore */
  }
  dismissAppPreloader();
}

function bootPublicTrainingGuest() {
  document.body.classList.add('public-training-guest');
  showApp();
  document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
  document.getElementById('view-training')?.classList.add('active');
  void initTraining();
  dismissAppPreloader();
}

async function bootAuth() {
  if (!authToken || !authRole) {
    if (hasPublicClassroomQuery()) {
      bootPublicClassroomGuest();
      return;
    }
    if (hasPublicTrainingJoinQuery()) {
      bootPublicTrainingGuest();
      return;
    }
    showLogin();
    dismissAppPreloader();
    return;
  }
  showApp();
  applyRoleVisibility();
  toggleChangePasswordPanel();
  initShell();
  initCampaigns();
  initOperations();
  initTraining();
  initAdmin();
  initFinance();
  initOpsInsights();
  initTrainingTools();
  initClassroom();
  initCourseLibrary();
  initBulkEnrollment();
  dismissAppPreloader();
}

document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = String(document.getElementById('loginUsername').value || '').trim();
  const password = String(document.getElementById('loginPassword').value || '');
  loginError.textContent = '';
  if (!username || !password) return;
  try {
    const data = await jsonFetch('/.netlify/functions/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    localStorage.setItem(AUTH_TOKEN, data.token);
    localStorage.setItem(AUTH_ROLE, data.role);
    localStorage.setItem(AUTH_USER, data.username || username);
    window.location.reload();
  } catch (err) {
    loginError.textContent = err.message || 'Login failed';
  }
});

document.getElementById('btnLogout')?.addEventListener('click', () => {
  localStorage.removeItem(AUTH_TOKEN);
  localStorage.removeItem(AUTH_ROLE);
  localStorage.removeItem(AUTH_USER);
  localStorage.removeItem('sbs_sendmails_webhook');
  window.location.reload();
});

/** Enable login character deco when `assets/brand/characters/hero-login.png` is deployed. */
function initLoginCharacterHero() {
  const el = document.getElementById('login-screen');
  if (!el) return;
  const heroPath = 'assets/brand/characters/hero-login.png';
  fetch(heroPath, { method: 'HEAD' })
    .then((res) => {
      if (res.ok) el.classList.add('login-screen--with-character');
    })
    .catch(() => {
      // Ignore optional asset lookup failures to keep console clean.
    });
}
initLoginCharacterHero();
initChangePasswordForm();
initDemoSupportCta();

bootAuth();
