import { HTMLAttributes, ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  elevated?: boolean;
  noPadding?: boolean;
  interactive?: boolean;
  glass?: boolean;
}

export function Card({ children, elevated, noPadding, interactive, glass, className = '', ...props }: CardProps) {
  const base = 'rounded-[var(--brand-radius)] border border-[var(--brand-border)] transition-all duration-200';

  const bg = glass
    ? 'glass'
    : elevated
      ? 'bg-[var(--brand-surface-2)]'
      : 'bg-[var(--brand-surface)]';

  const shadow = elevated
    ? 'shadow-[var(--brand-shadow)]'
    : 'shadow-[var(--brand-shadow-soft)]';

  const padding = noPadding ? '' : 'p-5';

  const hover = interactive
    ? 'cursor-pointer hover:border-[var(--brand-border-2)] hover:shadow-[var(--shadow-md)] hover:translate-y-[-1px]'
    : '';

  return (
    <div
      className={`${base} ${bg} ${shadow} ${padding} ${hover} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function CardHeader({ title, subtitle, action, className = '', ...props }: CardHeaderProps) {
  return (
    <div className={`mb-4 flex items-start justify-between gap-4 ${className}`} {...props}>
      <div className="min-w-0">
        <h3 className="truncate text-base font-semibold text-[var(--brand-text)]">{title}</h3>
        {subtitle && <p className="mt-0.5 text-sm text-[var(--brand-muted)]">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardBody({ children, className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={className} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`mt-4 border-t border-[var(--brand-border)] pt-4 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
