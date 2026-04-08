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
