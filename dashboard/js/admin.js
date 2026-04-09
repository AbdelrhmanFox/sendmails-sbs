import {
  jsonFetch,
  getAuthHeaders,
  authUsername,
  normalizePhone,
  COPY,
} from './shared.js';

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function mobileField(label, value) {
  return `<div class="ops-mobile-card-field"><span class="ops-mobile-card-label">${esc(label)}</span><span class="ops-mobile-card-value">${esc(
    value == null || value === '' ? '—' : value,
  )}</span></div>`;
}

export async function loadUsers() {
  const tbody = document.getElementById('usersTableBody');
  const cards = document.getElementById('usersCards');
  if (!tbody) return;
  tbody.innerHTML = '';
  if (cards) cards.innerHTML = '';
  try {
    const data = await jsonFetch('/.netlify/functions/list-users', { headers: getAuthHeaders() });
    const users = data.users || [];
    users.forEach((u) => {
      const tr = document.createElement('tr');
      const canDelete = u.role !== 'admin' && u.username !== authUsername;
      tr.innerHTML = `
          <td>${u.username}</td>
          <td>${u.role}</td>
          <td>
            <button class="btn btn-secondary btn-reset" data-user="${u.username}">Reset password</button>
            ${canDelete ? `<button class="btn btn-secondary btn-del" data-user="${u.username}">Delete</button>` : ''}
          </td>
        `;
      tbody.appendChild(tr);
    });
    if (cards) {
      cards.innerHTML = users
        .map((u) => {
          const canDelete = u.role !== 'admin' && u.username !== authUsername;
          return `<article class="ops-mobile-card">
          <h4 class="ops-mobile-card-title">${esc(u.username)}</h4>
          <div class="ops-mobile-card-grid">${mobileField('Role', u.role || '')}</div>
          <div class="ops-mobile-card-actions">
            <button class="btn btn-secondary btn-sm btn-reset" data-user="${esc(u.username)}">Reset password</button>
            ${canDelete ? `<button class="btn btn-secondary btn-sm btn-del" data-user="${esc(u.username)}">Delete</button>` : ''}
          </div>
        </article>`;
        })
        .join('');
    }
    tbody.querySelectorAll('.btn-reset').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const username = btn.getAttribute('data-user');
        const newPassword = prompt(`New password for ${username}:`);
        if (!newPassword || newPassword.length < 4) return;
        await jsonFetch('/.netlify/functions/reset-password', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ username, newPassword }),
        });
        document.getElementById('createUserMsg').textContent = 'Password updated successfully.';
      });
    });
    tbody.querySelectorAll('.btn-del').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const username = btn.getAttribute('data-user');
        if (!confirm(`Delete ${username}?`)) return;
        await jsonFetch('/.netlify/functions/delete-user', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ username }),
        });
        loadUsers();
      });
    });
  } catch (err) {
    document.getElementById('createUserMsg').textContent = err.message;
  }
}

let auditPage = 1;

export async function loadFinanceAudit() {
  const tbody = document.getElementById('financeAuditBody');
  const cards = document.getElementById('financeAuditCards');
  const info = document.getElementById('auditPageInfo');
  if (!tbody) return;
  const role = localStorage.getItem('sbs_role') || '';
  if (role !== 'admin') {
    tbody.innerHTML = '';
    if (cards) cards.innerHTML = '';
    return;
  }
  try {
    const data = await jsonFetch(`/.netlify/functions/finance-data?resource=audit&page=${auditPage}&pageSize=30`, {
      headers: getAuthHeaders(),
    });
    const items = data.items || [];
    tbody.innerHTML = items
      .map((r) => {
        const payload = r.payload != null ? JSON.stringify(r.payload) : '';
        return `<tr><td>${r.created_at || ''}</td><td>${r.actor || ''}</td><td>${r.action || ''}</td><td>${r.entity || ''}</td><td>${r.entity_id || ''}</td><td class="audit-payload">${payload.slice(0, 200)}${payload.length > 200 ? '…' : ''}</td></tr>`;
      })
      .join('');
    if (cards) {
      cards.innerHTML = items
        .map((r) => {
          const payload = r.payload != null ? JSON.stringify(r.payload) : '';
          return `<article class="ops-mobile-card">
          <h4 class="ops-mobile-card-title">${esc(r.action || 'Action')}</h4>
          <div class="ops-mobile-card-grid">
            ${mobileField('When', r.created_at || '')}
            ${mobileField('Actor', r.actor || '')}
            ${mobileField('Entity', r.entity || '')}
            ${mobileField('ID', r.entity_id || '')}
            ${mobileField('Payload', `${payload.slice(0, 200)}${payload.length > 200 ? '…' : ''}`)}
          </div>
        </article>`;
        })
        .join('');
    }
    const total = data.total != null ? data.total : 0;
    const pages = Math.max(1, Math.ceil(total / 30));
    if (info) info.textContent = `Page ${auditPage} of ${pages}`;
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6">${err.message}</td></tr>`;
  }
}

export function getAuditPage() {
  return auditPage;
}

export function setAuditPage(page) {
  auditPage = page;
}

async function loadDemoSupportNumber() {
  const input = document.getElementById('demoSupportWhatsappNumber');
  const msg = document.getElementById('demoSupportMsg');
  if (!input) return;
  try {
    const data = await jsonFetch('/.netlify/functions/demo-support-config');
    input.value = String(data.number || '').trim();
  } catch (err) {
    if (msg) msg.textContent = err.message || 'Could not load configuration.';
  }
}

function initDemoSupportForm() {
  const form = document.getElementById('demoSupportForm');
  const msg = document.getElementById('demoSupportMsg');
  const input = document.getElementById('demoSupportWhatsappNumber');
  if (!form || !msg || !input) return;
  void loadDemoSupportNumber();
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.textContent = '';
    const normalized = normalizePhone(input.value);
    if (!normalized) {
      msg.textContent = 'WhatsApp number is required.';
      return;
    }
    const valid = /^\+?\d{8,15}$/.test(normalized);
    if (!valid) {
      msg.textContent = 'Use a valid international number, e.g. +201234567890.';
      return;
    }
    try {
      await jsonFetch('/.netlify/functions/demo-support-config', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ number: normalized }),
      });
      input.value = normalized;
      msg.textContent = COPY.common.changesSaved;
      window.dispatchEvent(new CustomEvent('sbs:demo-support-number-updated'));
    } catch (err) {
      msg.textContent = err.message || 'Could not save configuration.';
    }
  });
}

export function initAdmin() {
  initDemoSupportForm();
  document.getElementById('createUserForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = String(document.getElementById('newUsername').value || '').trim();
    const password = String(document.getElementById('newPassword').value || '');
    if (!username || !password) return;
    try {
      const role = String(document.getElementById('newUserRole')?.value || 'user');
      await jsonFetch('/.netlify/functions/create-user', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ username, password, role }),
      });
      document.getElementById('createUserMsg').textContent = 'User created successfully.';
      document.getElementById('createUserForm').reset();
      loadUsers();
    } catch (err) {
      document.getElementById('createUserMsg').textContent = err.message;
    }
  });
}
