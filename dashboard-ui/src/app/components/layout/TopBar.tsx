import { useNavigate } from 'react-router-dom';
import { Button } from '../design-system/Button';
import { clearAuthSession } from '../../../lib/api';

export function TopBar({ title, subtitle, actions }: { title?: string; subtitle?: string; actions?: React.ReactNode }) {
  const navigate = useNavigate();

  const handleSignOut = () => {
    clearAuthSession();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex h-16 items-center justify-between border-b border-[var(--brand-border)] bg-[var(--brand-surface)] px-6">
      <div>
        {title && <h2 className="text-lg font-semibold text-[var(--brand-text)]">{title}</h2>}
        {subtitle && <p className="text-sm text-[var(--brand-muted)]">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        {actions}
        <Button type="button" variant="secondary" size="sm" onClick={handleSignOut}>
          Sign out
        </Button>
        <button type="button" className="rounded-lg p-2 transition-colors hover:bg-[var(--brand-surface-2)]">
          <svg className="h-5 w-5 text-[var(--brand-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
