/** Mirrors `dashboard/js/shared.js` ROLE_AREAS / areasForRole. */
export const ROLE_AREAS: Record<string, string[]> = {
  admin: ['operations', 'training', 'finance', 'automation', 'admin', 'tools'],
  staff: ['operations', 'training', 'automation', 'tools'],
  trainer: ['training'],
  trainee: ['training'],
  user: ['automation'],
  accountant: ['finance'],
};

export function areasForRole(role: string): string[] {
  const r = String(role || '').toLowerCase();
  return ROLE_AREAS[r] || ROLE_AREAS.user;
}

/** Path as seen by React Router (basename `/spa` stripped by the router). */
function normalizedPath(pathname: string): string {
  let p = pathname || '/';
  if (p.startsWith('/spa')) p = p.slice(4) || '/';
  if (!p.startsWith('/')) p = `/${p}`;
  const trimmed = p.replace(/\/+$/, '');
  return trimmed === '' ? '/' : trimmed;
}

export function pathToArea(pathname: string): string | null {
  const p = normalizedPath(pathname);
  if (p === '/' || p.startsWith('/account')) return null;
  const seg = p.split('/').filter(Boolean)[0];
  if (!seg) return null;
  if (['operations', 'training', 'finance', 'automation', 'admin', 'tools'].includes(seg)) return seg;
  return null;
}

export function canAccessPath(role: string, pathname: string): boolean {
  const r = String(role || '').toLowerCase();
  const p = normalizedPath(pathname);
  if (r === 'trainee') {
    return p === '/trainee/portal' || p.startsWith('/trainee/portal/') || p === '/account/password' || p.startsWith('/account/password/');
  }
  const area = pathToArea(pathname);
  if (area == null) return true;
  return areasForRole(role).includes(area);
}

export function defaultPathForRole(role: string): string {
  const r = String(role || '').toLowerCase();
  if (r === 'trainee') return '/trainee/portal';
  if (['admin', 'staff', 'trainer', 'accountant'].includes(r)) return '/dashboard';
  const allowed = areasForRole(r);
  if (allowed.includes('automation')) return '/automation';
  return '/dashboard';
}
