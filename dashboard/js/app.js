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
import { initAdmin } from './admin.js';
import { initFinance } from './finance.js';

const loginError = document.getElementById('loginError');

const loggedInUserEl = document.getElementById('loggedInUser');
if (loggedInUserEl && authUsername) loggedInUserEl.textContent = `${authUsername} (${authRole || 'user'})`;

async function bootAuth() {
  if (!authToken || !authRole) {
    showLogin();
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
  initBulkEnrollment();
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

bootAuth();
