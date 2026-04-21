/** Stable classic shell URL for legacy hash routes (`#/area/view`, see docs/DASHBOARD_UI.md). */
export function classicShellUrl(route: string): string {
  let p = String(route || '').replace(/^#/, '').trim();
  if (!p.startsWith('/')) p = `/${p}`;
  return `/classic/index.html#${p}`;
}
