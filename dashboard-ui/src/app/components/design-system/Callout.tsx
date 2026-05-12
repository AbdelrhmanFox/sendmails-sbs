import type { ReactNode } from 'react';
import { Button } from './Button';

export type CalloutAction = { label: string; onClick: () => void };

export function Callout({
  title,
  children,
  action,
  variant = 'warning',
}: {
  title: string;
  children?: ReactNode;
  action?: CalloutAction;
  variant?: 'warning' | 'danger' | 'info' | 'success';
}) {
  const styles = {
    warning: {
      wrapper: 'border-[var(--brand-warning)]/30 bg-[var(--brand-warning-subtle)]',
      icon: 'text-[var(--brand-warning)]',
      title: 'text-[var(--brand-warning)]',
    },
    danger: {
      wrapper: 'border-[var(--brand-danger)]/30 bg-[var(--brand-danger-subtle)]',
      icon: 'text-[var(--brand-danger)]',
      title: 'text-[var(--brand-danger)]',
    },
    info: {
      wrapper: 'border-[var(--brand-primary)]/30 bg-[var(--brand-primary-subtle)]',
      icon: 'text-[var(--brand-primary-2)]',
      title: 'text-[var(--brand-primary-2)]',
    },
    success: {
      wrapper: 'border-[var(--brand-success)]/30 bg-[var(--brand-success-subtle)]',
      icon: 'text-[var(--brand-success)]',
      title: 'text-[var(--brand-success)]',
    },
  };

  const s = styles[variant];

  return (
    <div
      role="alert"
      className={`rounded-[var(--brand-radius)] border px-4 py-3.5 ${s.wrapper}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-2.5">
          <svg
            className={`mt-0.5 h-4 w-4 shrink-0 ${s.icon}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <div className="min-w-0">
            <p className={`text-sm font-semibold ${s.title}`}>{title}</p>
            {children ? <div className="mt-0.5 text-sm text-[var(--brand-muted)]">{children}</div> : null}
          </div>
        </div>
        {action ? (
          <Button
            type="button"
            variant={variant === 'warning' ? 'accent' : variant === 'danger' ? 'danger' : 'primary'}
            size="sm"
            className="w-full shrink-0 sm:w-auto"
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
