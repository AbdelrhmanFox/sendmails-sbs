import { HTMLAttributes } from 'react';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'success' | 'danger' | 'warning' | 'info' | 'neutral';
  size?: 'sm' | 'md';
  dot?: boolean;
}

const variantMap: Record<string, string> = {
  primary: 'bg-[var(--brand-primary-subtle)] text-[var(--brand-primary-2)] ring-1 ring-[var(--brand-primary)]/25',
  success: 'bg-[var(--brand-success-subtle)] text-[var(--brand-success)] ring-1 ring-[var(--brand-success)]/25',
  danger:  'bg-[var(--brand-danger-subtle)]  text-[var(--brand-danger)]  ring-1 ring-[var(--brand-danger)]/25',
  warning: 'bg-[var(--brand-warning-subtle)] text-[var(--brand-warning)] ring-1 ring-[var(--brand-warning)]/25',
  info:    'bg-[var(--brand-primary-subtle)] text-[var(--brand-primary-2)] ring-1 ring-[var(--brand-primary-2)]/25',
  neutral: 'bg-[var(--brand-surface-2)] text-[var(--brand-muted)] ring-1 ring-[var(--brand-border)]',
};

const dotMap: Record<string, string> = {
  primary: 'bg-[var(--brand-primary)]',
  success: 'bg-[var(--brand-success)]',
  danger:  'bg-[var(--brand-danger)]',
  warning: 'bg-[var(--brand-warning)]',
  info:    'bg-[var(--brand-primary-2)]',
  neutral: 'bg-[var(--brand-muted)]',
};

const sizeMap: Record<string, string> = {
  sm: 'px-1.5 py-0.5 text-[11px] font-medium',
  md: 'px-2   py-0.5 text-xs    font-medium',
};

export function Badge({ variant = 'neutral', size = 'md', dot, children, className = '', ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full ${variantMap[variant]} ${sizeMap[size]} ${className}`}
      {...props}
    >
      {dot && (
        <span
          className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${dotMap[variant]}`}
          aria-hidden
        />
      )}
      {children}
    </span>
  );
}
