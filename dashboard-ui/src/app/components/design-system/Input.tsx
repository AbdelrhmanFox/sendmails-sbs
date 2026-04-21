import { forwardRef, InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helpText?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helpText, icon, className = '', ...props }, ref) => {
    const baseStyles = 'w-full px-4 py-2.5 rounded-[var(--brand-radius-dense)] border transition-all duration-200 bg-[var(--brand-surface)] text-[var(--brand-text)] placeholder:text-[var(--brand-muted)]';
    const stateStyles = error
      ? 'border-[var(--brand-danger)] focus:border-[var(--brand-danger)] focus:ring-2 focus:ring-[var(--brand-danger)]/20'
      : 'border-[var(--brand-border)] focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20';
    const iconPadding = icon ? 'pl-11' : '';

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-[var(--brand-text)] mb-1.5">{label}</label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--brand-muted)]">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`${baseStyles} ${stateStyles} ${iconPadding} ${className}`}
            {...props}
          />
        </div>
        {error && (
          <p className="text-sm text-[var(--brand-danger)] mt-1.5">{error}</p>
        )}
        {!error && helpText && (
          <p className="text-sm text-[var(--brand-muted)] mt-1.5">{helpText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export interface SelectProps extends InputHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helpText?: string;
  options: Array<{ value: string; label: string }>;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helpText, options, className = '', ...props }, ref) => {
    const baseStyles = 'w-full px-4 py-2.5 rounded-[var(--brand-radius-dense)] border transition-all duration-200 bg-[var(--brand-surface)] text-[var(--brand-text)] cursor-pointer';
    const stateStyles = error
      ? 'border-[var(--brand-danger)] focus:border-[var(--brand-danger)] focus:ring-2 focus:ring-[var(--brand-danger)]/20'
      : 'border-[var(--brand-border)] focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20';

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-[var(--brand-text)] mb-1.5">{label}</label>
        )}
        <select
          ref={ref}
          className={`${baseStyles} ${stateStyles} ${className}`}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <p className="text-sm text-[var(--brand-danger)] mt-1.5">{error}</p>
        )}
        {!error && helpText && (
          <p className="text-sm text-[var(--brand-muted)] mt-1.5">{helpText}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export interface TextareaProps extends InputHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helpText?: string;
  rows?: number;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helpText, rows = 4, className = '', ...props }, ref) => {
    const baseStyles = 'w-full px-4 py-2.5 rounded-[var(--brand-radius-dense)] border transition-all duration-200 bg-[var(--brand-surface)] text-[var(--brand-text)] placeholder:text-[var(--brand-muted)] resize-vertical';
    const stateStyles = error
      ? 'border-[var(--brand-danger)] focus:border-[var(--brand-danger)] focus:ring-2 focus:ring-[var(--brand-danger)]/20'
      : 'border-[var(--brand-border)] focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20';

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-[var(--brand-text)] mb-1.5">{label}</label>
        )}
        <textarea
          ref={ref}
          rows={rows}
          className={`${baseStyles} ${stateStyles} ${className}`}
          {...props}
        />
        {error && (
          <p className="text-sm text-[var(--brand-danger)] mt-1.5">{error}</p>
        )}
        {!error && helpText && (
          <p className="text-sm text-[var(--brand-muted)] mt-1.5">{helpText}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
