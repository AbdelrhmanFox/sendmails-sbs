import { useEffect } from 'react';
import { classicShellUrl } from '../../lib/legacyClassic';

/** Classic shell routes (see dashboard/js/shell-routes.js). */
const LEGACY_PATH: Record<'classroom' | 'finance' | 'automation' | 'admin', string> = {
  classroom: '/training/training-classroom',
  finance: '/finance/finance',
  automation: '/automation/campaigns',
  admin: '/admin/admin',
};

export function LegacyClassicRedirect({ module }: { module: keyof typeof LEGACY_PATH }) {
  useEffect(() => {
    window.location.replace(`${window.location.origin}${classicShellUrl(LEGACY_PATH[module])}`);
  }, [module]);
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <p className="text-sm text-[var(--brand-muted)]">Opening classic dashboard…</p>
    </div>
  );
}
