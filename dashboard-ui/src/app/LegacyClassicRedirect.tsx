import { useEffect } from 'react';

/** Classic shell hash routes (see dashboard/js/shell-routes.js). */
const LEGACY_HASH: Record<'classroom' | 'finance' | 'automation' | 'admin', string> = {
  classroom: '#/training/training-classroom',
  finance: '#/finance/finance',
  automation: '#/automation/campaigns',
  admin: '#/admin/admin',
};

export function LegacyClassicRedirect({ module }: { module: keyof typeof LEGACY_HASH }) {
  useEffect(() => {
    const hash = LEGACY_HASH[module];
    window.location.replace(`${window.location.origin}/${hash}`);
  }, [module]);
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <p className="text-sm text-[var(--brand-muted)]">Opening classic dashboard…</p>
    </div>
  );
}
