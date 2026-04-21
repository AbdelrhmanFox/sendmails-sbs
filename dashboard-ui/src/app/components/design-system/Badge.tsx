import { HTMLAttributes } from 'react';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'success' | 'danger' | 'warning' | 'info' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
}

export function Badge({ variant = 'neutral', size = 'md', dot, children, className = '', ...props }: BadgeProps) {
  const baseStyles = 'inline-flex items-center gap-1.5 font-medium rounded-full';

  const variantStyles = {
    primary: 'bg-[var(--brand-primary)]/20 text-[var(--brand-primary)] border border-[var(--brand-primary)]/30',
    success: 'bg-[var(--brand-success)]/20 text-[var(--brand-success)] border border-[var(--brand-success)]/30',
    danger: 'bg-[var(--brand-danger)]/20 text-[var(--brand-danger)] border border-[var(--brand-danger)]/30',
    warning: 'bg-[var(--brand-accent)]/20 text-[var(--brand-accent)] border border-[var(--brand-accent)]/30',
    info: 'bg-[var(--brand-primary-2)]/20 text-[var(--brand-primary-2)] border border-[var(--brand-primary-2)]/30',
    neutral: 'bg-[var(--brand-surface-2)] text-[var(--brand-muted)] border border-[var(--brand-border)]'
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base'
  };

  const dotColors = {
    primary: 'bg-[var(--brand-primary)]',
    success: 'bg-[var(--brand-success)]',
    danger: 'bg-[var(--brand-danger)]',
    warning: 'bg-[var(--brand-accent)]',
    info: 'bg-[var(--brand-primary-2)]',
    neutral: 'bg-[var(--brand-muted)]'
  };

  return (
    <span className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`} {...props}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  );
}
