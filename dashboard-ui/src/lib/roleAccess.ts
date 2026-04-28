/** Mirrors `dashboard/js/shared.js` ROLE_AREAS / areasForRole. */
export const ROLE_AREAS: Record<string, string[]> = {
  admin: ['operations', 'training', 'finance', 'automation', 'admin'],
  staff: ['operations', 'automation'],
  trainer: ['training'],
  trainee: ['training'],
  user: ['automation'],
  accountant: ['finance'],
};

export function areasForRole(role: string): string[] {
  const r = String(role || '').toLowerCase();
  return ROLE_AREAS[r] || ROLE_AREAS.user;
}

export function pathToArea(pathname: string): string | null {
  const p = pathname.replace(/^\/spa/, '') || '/';
  if (p === '/' || p.startsWith('/account')) return null;
  const seg = p.split('/').filter(Boolean)[0];
  if (!seg) return null;
  if (['operations', 'training', 'finance', 'automation', 'admin'].includes(seg)) return seg;
  return null;
}

export function canAccessPath(role: string, pathname: string): boolean {
  const area = pathToArea(pathname);
  if (area == null) return true;
  return areasForRole(role).includes(area);
}

export function defaultPathForRole(role: string): string {
  const allowed = areasForRole(role);
  if (String(role || '').toLowerCase() === 'trainee') return '/trainee/portal';
  if (allowed.includes('operations')) return '/operations/overview';
  if (allowed.includes('training')) return '/training/overview';
  if (allowed.includes('finance')) return '/finance';
  if (allowed.includes('automation')) return '/automation';
  if (allowed.includes('admin')) return '/admin';
  return '/';
}
