import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../design-system/Button';
import { AUTH_ROLE, AUTH_USER, functionsBase, jsonFetch, clearAuthSession } from '../../../lib/api';

export function TopBar({ title, subtitle, actions }: { title?: string; subtitle?: string; actions?: React.ReactNode }) {
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
