import { Link } from 'react-router-dom';

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--brand-bg)] p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="flex items-center justify-between rounded-[var(--brand-radius)] border border-[var(--brand-border)] bg-[var(--brand-surface)] px-4 py-3 shadow-[var(--brand-shadow-soft)]">
          <div>
            <p className="text-sm font-semibold text-[var(--brand-text)]">SBS Training</p>
            <p className="text-xs text-[var(--brand-muted)]">Public access links</p>
          </div>
          <Link className="text-sm text-[var(--brand-primary)] underline" to="/login">
            Staff login
          </Link>
        </header>
        {children}
      </div>
    </div>
  );
}
