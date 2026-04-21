/** Match legacy dashboard/localStorage contract (see dashboard/js/shared.js). */
export const AUTH_TOKEN = 'sbs_token';
export const AUTH_ROLE = 'sbs_role';
export const AUTH_USER = 'sbs_username';

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
