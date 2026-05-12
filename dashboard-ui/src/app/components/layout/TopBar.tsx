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
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}) {
  const navigate = useNavigate();
  const [supportHref, setSupportHref] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await jsonFetch<{ number?: string }>(`${functionsBase()}/demo-support-config`);
        const raw = String(data.number || '').trim();
        if (!raw) return;
        const normalized = raw.replace(/^\+/, '');
        const role = String(localStorage.getItem(AUTH_ROLE) || '').trim() || 'unknown';
        const user = String(localStorage.getItem(AUTH_USER) || '').trim() || 'unknown';
        const view = `${window.location.pathname}${window.location.search}`;
        const text = ['I have an issue.', `View: ${view}`, `User: ${user}`, `Role: ${role}`, `Time: ${new Date().toISOString()}`].join('\n');
        const href = `https://wa.me/${encodeURIComponent(normalized)}?text=${encodeURIComponent(text)}`;
        if (!cancelled) setSupportHref(href);
      } catch {
        /* no-op */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSignOut = () => {
    clearAuthSession();
    navigate('/login', { replace: true });
  };

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--brand-border)] bg-[var(--brand-surface)] px-4 md:px-5">
      {/* Left — hamburger + title */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {showMenuButton && onMenuClick ? (
          <button
            type="button"
            aria-label="Open navigation menu"
            onClick={onMenuClick}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--brand-radius-dense)] text-[var(--brand-muted)] transition-colors hover:bg-[var(--brand-surface-2)] hover:text-[var(--brand-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-focus-ring)] md:hidden"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
        ) : null}

        {title ? (
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold text-[var(--brand-text)] md:text-base">{title}</h1>
            {subtitle ? <p className="truncate text-xs text-[var(--brand-muted)]">{subtitle}</p> : null}
          </div>
        ) : null}
      </div>

      {/* Right — actions + controls */}
      <div className="flex shrink-0 items-center gap-1.5">
        {actions}

        <ThemeToggle />

        {supportHref ? (
          <a href={supportHref} target="_blank" rel="noreferrer">
            <Button type="button" variant="ghost" size="sm" aria-label="WhatsApp support">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                <path d="M11.999 2.003C6.476 2.003 2 6.48 2 12.003c0 1.76.463 3.413 1.268 4.847L2 22l5.267-1.249A9.947 9.947 0 0012 22c5.523 0 10-4.477 10-10S17.522 2.003 12 2.003zm0 18.315a8.314 8.314 0 01-4.23-1.155l-.304-.18-3.124.741.754-3.048-.198-.311A8.29 8.29 0 013.686 12c0-4.593 3.734-8.327 8.313-8.327 4.58 0 8.314 3.734 8.314 8.327s-3.734 8.318-8.314 8.318z" />
              </svg>
            </Button>
          </a>
        ) : null}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="hidden text-[var(--brand-muted)] hover:text-[var(--brand-danger)] sm:flex"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
          </svg>
          <span className="hidden lg:inline">Sign out</span>
        </Button>

        {/* Mobile-only sign out icon */}
        <button
          type="button"
          onClick={handleSignOut}
          aria-label="Sign out"
          className="flex h-8 w-8 items-center justify-center rounded-[var(--brand-radius-dense)] text-[var(--brand-muted)] transition-colors hover:bg-[var(--brand-danger-subtle)] hover:text-[var(--brand-danger)] sm:hidden"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
          </svg>
        </button>
      </div>
    </header>
  );
}
