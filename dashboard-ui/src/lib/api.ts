/** Match legacy dashboard/localStorage contract (see dashboard/js/shared.js). */
export const AUTH_TOKEN = 'sbs_token';
export const AUTH_ROLE = 'sbs_role';
export const AUTH_USER = 'sbs_username';

/** Clear JWT session (same keys as legacy `dashboard/js/app.js` logout). */
export function clearAuthSession(): void {
  localStorage.removeItem(AUTH_TOKEN);
  localStorage.removeItem(AUTH_ROLE);
  localStorage.removeItem(AUTH_USER);
  localStorage.removeItem('sbs_sendmails_webhook');
}

export function getAuthHeaders(): HeadersInit {
  const tok = localStorage.getItem(AUTH_TOKEN);
  return {
    'Content-Type': 'application/json',
    ...(tok ? { Authorization: `Bearer ${tok}` } : {}),
  };
}

export async function jsonFetch<T = unknown>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, options);
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    if (res.status === 401 && typeof window !== 'undefined') {
      clearAuthSession();
      const onLogin = window.location.pathname.includes('/spa/login');
      if (!onLogin) {
        window.location.replace(`${window.location.origin}/spa/login`);
      }
    }
    const parts = [data.error, data.hint, data.details].filter(Boolean);
    const msg = parts.length ? parts.join(' — ') : `Request failed (${res.status})`;
    throw new Error(String(msg));
  }
  return data as T;
}

/** Netlify path (Vercel rewrites /.netlify/functions/* to /api/*). */
export function functionsBase(): string {
  return '/.netlify/functions';
}
