export const AUTH_TOKEN = 'sbs_token';
export const AUTH_ROLE = 'sbs_role';
export const AUTH_USER = 'sbs_username';
export const DEMO_WHATSAPP_SUPPORT_NUMBER = 'sbs_demo_whatsapp_support_number';

export const authToken = localStorage.getItem(AUTH_TOKEN);
export const authRole = localStorage.getItem(AUTH_ROLE);
export const authUsername = localStorage.getItem(AUTH_USER);

export function getAuthHeaders() {
  const tok = localStorage.getItem(AUTH_TOKEN);
  return tok ? { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

export async function jsonFetch(url, options = {}) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const parts = [data.error, data.hint, data.details].filter(Boolean);
    const msg = parts.length ? parts.join(' — ') : `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

export const ROLE_AREAS = {
  admin: ['operations', 'training', 'finance', 'automation', 'admin'],
  staff: ['operations', 'automation'],
  trainer: ['training'],
  user: ['automation'],
  accountant: ['finance'],
};

export function areasForRole(role) {
  return ROLE_AREAS[role] || ROLE_AREAS.user;
}

export function normalizePhone(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const leadPlus = raw.startsWith('+');
  const digits = raw.replace(/\D+/g, '');
  return (leadPlus ? '+' : '') + digits;
}

export function showToast(message, tone = 'info') {
  const txt = String(message || '').trim();
  if (!txt) return;
  let host = document.getElementById('appToastHost');
  if (!host) {
    host = document.createElement('div');
    host.id = 'appToastHost';
    host.style.position = 'fixed';
    host.style.right = '16px';
    host.style.bottom = '16px';
    host.style.display = 'flex';
    host.style.flexDirection = 'column';
    host.style.gap = '8px';
    host.style.zIndex = '9999';
    document.body.appendChild(host);
  }
  const item = document.createElement('div');
  item.textContent = txt;
  item.style.padding = '10px 12px';
  item.style.borderRadius = '10px';
  item.style.color = '#fff';
  item.style.fontSize = '13px';
  item.style.maxWidth = '320px';
  item.style.boxShadow = '0 8px 20px rgba(0,0,0,0.24)';
  item.style.background =
    tone === 'error' ? '#b42318' : tone === 'success' ? '#067647' : tone === 'warn' ? '#b54708' : '#155eef';
  host.appendChild(item);
  setTimeout(() => {
    item.style.opacity = '0';
    item.style.transition = 'opacity .25s ease';
    setTimeout(() => item.remove(), 260);
  }, 2800);
}
