import { ButtonHTMLAttributes, forwardRef } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'accent' | 'outline';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', fullWidth, loading, icon, iconRight, children, className = '', ...props }, ref) => {
    const base =
      'inline-flex items-center justify-center gap-2 font-medium transition-all select-none ' +
      'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none ' +
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-focus-ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--brand-bg)]';

    const variants: Record<string, string> = {
      primary:
        'bg-[var(--brand-primary)] text-white rounded-[var(--brand-radius-dense)] ' +
        'hover:bg-[var(--brand-primary-2)] active:scale-[0.97] ' +
        'shadow-[0_1px_0_rgba(0,0,0,0.3),var(--shadow-inset)] ' +
        'hover:shadow-[var(--shadow-glow)]',
      secondary:
        'bg-[var(--brand-surface-2)] text-[var(--brand-text)] rounded-[var(--brand-radius-dense)] ' +
        'border border-[var(--brand-border)] ' +
        'hover:bg-[var(--brand-indigo)] hover:border-[var(--brand-border-2)] active:scale-[0.97]',
      outline:
        'bg-transparent text-[var(--brand-primary)] rounded-[var(--brand-radius-dense)] ' +
        'border border-[var(--brand-primary)]/40 ' +
        'hover:bg-[var(--brand-primary-subtle)] hover:border-[var(--brand-primary)]/70 active:scale-[0.97]',
      danger:
        'bg-[var(--brand-danger)] text-white rounded-[var(--brand-radius-dense)] ' +
        'hover:opacity-90 active:scale-[0.97] ' +
        'shadow-[0_1px_0_rgba(0,0,0,0.3)]',
      ghost:
        'bg-transparent text-[var(--brand-muted)] rounded-[var(--brand-radius-dense)] ' +
        'hover:bg-[var(--brand-surface-2)] hover:text-[var(--brand-text)] active:scale-[0.97]',
      accent:
        'bg-[var(--brand-accent)] text-[#07080f] rounded-[var(--brand-radius-dense)] font-semibold ' +
        'hover:bg-[var(--brand-accent-2)] active:scale-[0.97] ' +
        'shadow-[0_1px_0_rgba(0,0,0,0.2)]',
    };

    const sizes: Record<string, string> = {
      xs: 'px-2.5 py-1   text-xs  h-7',
      sm: 'px-3   py-1.5 text-sm  h-8',
      md: 'px-4   py-2   text-sm  h-9',
      lg: 'px-5   py-2.5 text-base h-11',
    };

    return (
      <button
        ref={ref}
        className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
        disabled={props.disabled || loading}
        {...props}
      >
        {loading ? (
          <svg
            className="h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          icon && <span className="shrink-0">{icon}</span>
        )}
        {children}
        {!loading && iconRight && <span className="shrink-0">{iconRight}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
