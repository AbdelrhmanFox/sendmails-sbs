import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../design-system/Button';
import { ThemeToggle } from './ThemeToggle';
import { AUTH_ROLE, AUTH_USER, functionsBase, jsonFetch, clearAuthSession } from '../../../lib/api';

export function TopBar({
  title,
  subtitle,
  actions,
  onMenuClick,
  showMenuButton,
}: {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  /** Opens mobile navigation drawer (staff layout only). */
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}) {
  const navigate = useNavigate();
  const [username, setUsername] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem(AUTH_USER) || '' : ''));
  const [supportHref, setSupportHref] = useState('');

  useEffect(() => {
    setUsername(localStorage.getItem(AUTH_USER) || '');
  }, [title]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await jsonFetch<{ number?: string }>(`${functionsBase()}/demo-support-config`);
        const raw = String(data.number || '').trim();
        const normalized = raw.replace(/^\+/, '');
        if (!normalized) return;
        const role = String(localStorage.getItem(AUTH_ROLE) || '').trim() || 'unknown';
        const user = String(localStorage.getItem(AUTH_USER) || '').trim() || 'unknown';
        const view = `${window.location.pathname}${window.location.search}`;
        const text = ['I have an issue in Demo.', `View: ${view}`, `User: ${user}`, `Role: ${role}`, `Time: ${new Date().toISOString()}`].join('\n');
        const href = `https://wa.me/${encodeURIComponent(normalized)}?text=${encodeURIComponent(text)}`;
        if (!cancelled) setSupportHref(href);
      } catch (_) {
        if (!cancelled) setSupportHref('');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSignOut = () => {
    clearAuthSession();
    navigate('/login', { replace: true });
  };

  const hasTitle = Boolean(title);

  return (
    <div className="flex h-16 min-h-16 shrink-0 items-center justify-between border-b border-[var(--brand-border)] bg-[var(--brand-surface)] px-4 md:px-6">
      <div className="flex min-w-0 flex-1 items-start gap-2 md:gap-3">
        {showMenuButton && onMenuClick ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-0.5 shrink-0 md:!hidden"
            aria-label="Open navigation menu"
            onClick={onMenuClick}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </Button>
        ) : null}
        <div className="min-w-0">
          {hasTitle ? (
            <>
              <h2 className="truncate text-lg font-semibold text-[var(--brand-text)]">{title}</h2>
              {subtitle ? <p className="truncate text-sm text-[var(--brand-muted)]">{subtitle}</p> : null}
              {username ? (
                <p className="mt-0.5 truncate text-xs text-[var(--brand-muted)]">
                  Signed in as <span className="font-medium text-[var(--brand-text)]">{username}</span>
                </p>
              ) : null}
            </>
          ) : username ? (
            <p className="text-sm text-[var(--brand-muted)]">
              Signed in as <span className="font-medium text-[var(--brand-text)]">{username}</span>
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 md:gap-3">
        <ThemeToggle />
        {actions}
        {supportHref ? (
          <a href={supportHref} target="_blank" rel="noreferrer">
            <Button type="button" variant="secondary" size="sm">
              WhatsApp support
            </Button>
          </a>
        ) : null}
        <Button type="button" variant="secondary" size="sm" onClick={handleSignOut}>
          Sign out
        </Button>
      </div>
    </div>
  );
}
