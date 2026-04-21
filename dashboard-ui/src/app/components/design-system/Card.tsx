import { HTMLAttributes, ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  elevated?: boolean;
  noPadding?: boolean;
  interactive?: boolean;
}

export function Card({ children, elevated, noPadding, interactive, className = '', ...props }: CardProps) {
  const baseStyles = 'rounded-[var(--brand-radius)] border border-[var(--brand-border)] transition-all duration-200';
  const bgStyle = elevated ? 'bg-[var(--brand-surface-2)]' : 'bg-[var(--brand-surface)]';
  const shadowStyle = elevated ? 'shadow-[var(--brand-shadow)]' : 'shadow-[var(--brand-shadow-soft)]';
  const paddingStyle = noPadding ? '' : 'p-6';
  const interactiveStyle = interactive ? 'hover:shadow-[var(--brand-shadow)] hover:border-[var(--brand-indigo)] cursor-pointer' : '';

  return (
    <div className={`${baseStyles} ${bgStyle} ${shadowStyle} ${paddingStyle} ${interactiveStyle} ${className}`} {...props}>
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
    <div className={`flex items-start justify-between gap-4 mb-4 ${className}`} {...props}>
      <div>
        <h3 className="text-xl font-semibold text-[var(--brand-text)]">{title}</h3>
        {subtitle && <p className="text-sm text-[var(--brand-muted)] mt-1">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
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
    <div className={`mt-4 pt-4 border-t border-[var(--brand-border)] ${className}`} {...props}>
      {children}
    </div>
  );
}
