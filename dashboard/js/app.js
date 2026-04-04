import {
  AUTH_TOKEN,
  AUTH_ROLE,
  AUTH_USER,
  authToken,
  authRole,
  authUsername,
  jsonFetch,
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
  const img = new Image();
  img.onload = () => el.classList.add('login-screen--with-character');
  img.src = 'assets/brand/characters/hero-login.png';
}
initLoginCharacterHero();

bootAuth();
