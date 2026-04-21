import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../design-system/Button';
import { AUTH_USER, clearAuthSession } from '../../../lib/api';

export function TopBar({ title, subtitle, actions }: { title?: string; subtitle?: string; actions?: React.ReactNode }) {
  const navigate = useNavigate();
  const [username, setUsername] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem(AUTH_USER) || '' : ''));

  useEffect(() => {
    setUsername(localStorage.getItem(AUTH_USER) || '');
  }, [title]);

  const handleSignOut = () => {
    clearAuthSession();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex h-16 items-center justify-between border-b border-[var(--brand-border)] bg-[var(--brand-surface)] px-6">
      <div>
        {title && <h2 className="text-lg font-semibold text-[var(--brand-text)]">{title}</h2>}
        {subtitle && <p className="text-sm text-[var(--brand-muted)]">{subtitle}</p>}
        {!title && !subtitle && username ? (
          <p className="text-sm text-[var(--brand-muted)]">
            Signed in as <span className="font-medium text-[var(--brand-text)]">{username}</span>
          </p>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        {actions}
        <Button type="button" variant="secondary" size="sm" onClick={handleSignOut}>
          Sign out
        </Button>
      </div>
    </div>
  );
}
