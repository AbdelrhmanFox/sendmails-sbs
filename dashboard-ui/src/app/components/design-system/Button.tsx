import { ButtonHTMLAttributes, forwardRef } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', fullWidth, loading, icon, children, className = '', ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center gap-2 rounded-[var(--brand-radius-dense)] font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';

    const variantStyles = {
      primary: 'bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary-deep)] active:scale-[0.98] shadow-[var(--brand-shadow-soft)]',
      secondary: 'bg-[var(--brand-surface-2)] text-[var(--brand-text)] hover:bg-[var(--brand-indigo)] active:scale-[0.98)] border border-[var(--brand-border)]',
      danger: 'bg-[var(--brand-danger)] text-white hover:bg-[#c11620] active:scale-[0.98] shadow-[var(--brand-shadow-soft)]',
      ghost: 'bg-transparent text-[var(--brand-text)] hover:bg-[var(--brand-surface-2)] active:bg-[var(--brand-surface)]',
      accent: 'bg-[var(--brand-accent)] text-white hover:bg-[var(--brand-accent-2)] active:scale-[0.98] shadow-[var(--brand-shadow-soft)]'
    };

    const sizeStyles = {
      sm: 'px-3 py-1.5 text-sm h-8',
      md: 'px-4 py-2 text-base h-10',
      lg: 'px-6 py-3 text-lg h-12'
    };

    const widthStyle = fullWidth ? 'w-full' : '';

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyle} ${className}`}
        disabled={props.disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        {!loading && icon && icon}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
