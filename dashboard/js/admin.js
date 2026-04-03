import { jsonFetch, getAuthHeaders, authUsername } from './shared.js';

export async function loadUsers() {
  const tbody = document.getElementById('usersTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';
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
        document.getElementById('createUserMsg').textContent = 'Password updated.';
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
  const info = document.getElementById('auditPageInfo');
  if (!tbody) return;
  const role = localStorage.getItem('sbs_role') || '';
  if (role !== 'admin') {
    tbody.innerHTML = '';
    return;
  }
  try {
    const data = await jsonFetch(`/.netlify/functions/finance-data?resource=audit&page=${auditPage}&pageSize=30`, {
      headers: getAuthHeaders(),
    });
    tbody.innerHTML = (data.items || [])
      .map((r) => {
        const payload = r.payload != null ? JSON.stringify(r.payload) : '';
        return `<tr><td>${r.created_at || ''}</td><td>${r.actor || ''}</td><td>${r.action || ''}</td><td>${r.entity || ''}</td><td>${r.entity_id || ''}</td><td class="audit-payload">${payload.slice(0, 200)}${payload.length > 200 ? '…' : ''}</td></tr>`;
      })
      .join('');
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

export function initAdmin() {
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
      document.getElementById('createUserMsg').textContent = 'User added.';
      document.getElementById('createUserForm').reset();
      loadUsers();
    } catch (err) {
      document.getElementById('createUserMsg').textContent = err.message;
    }
  });
}
