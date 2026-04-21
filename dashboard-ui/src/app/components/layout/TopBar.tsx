import { Button } from '../design-system/Button';

export function TopBar({ title, subtitle, actions }: { title?: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="h-16 bg-[var(--brand-surface)] border-b border-[var(--brand-border)] px-6 flex items-center justify-between">
      <div>
        {title && <h2 className="text-lg font-semibold text-[var(--brand-text)]">{title}</h2>}
        {subtitle && <p className="text-sm text-[var(--brand-muted)]">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        {actions}
        <button className="p-2 hover:bg-[var(--brand-surface-2)] rounded-lg transition-colors">
          <svg className="w-5 h-5 text-[var(--brand-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </button>
      </div>
    </div>
  );
}
