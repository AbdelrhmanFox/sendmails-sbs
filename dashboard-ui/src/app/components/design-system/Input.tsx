import { forwardRef, InputHTMLAttributes } from 'react';

const fieldBase =
  'w-full rounded-[var(--brand-radius-dense)] border bg-[var(--brand-navy)] ' +
  'text-[var(--brand-text)] placeholder:text-[var(--brand-dim)] ' +
  'transition-all duration-150 ' +
  'focus:outline-none focus:ring-2 focus:ring-[var(--brand-focus-ring)] focus:ring-offset-0 ';

const fieldDefault = 'border-[var(--brand-border)] focus:border-[var(--brand-primary)]/60';
const fieldError   = 'border-[var(--brand-danger)] focus:border-[var(--brand-danger)] focus:ring-[var(--brand-danger)]/30';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helpText?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helpText, icon, className = '', id, ...props }, ref) => {
    const inputId = id ?? (label ? `field-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-[var(--brand-text)]">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--brand-muted)]">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${inputId}-err` : helpText ? `${inputId}-help` : undefined}
            className={`${fieldBase} ${error ? fieldError : fieldDefault} px-3.5 py-2 text-sm ${icon ? 'pl-10' : ''} ${className}`}
            {...props}
          />
        </div>
        {error && (
          <p id={`${inputId}-err`} className="text-xs text-[var(--brand-danger)]">
            {error}
          </p>
        )}
        {!error && helpText && (
          <p id={`${inputId}-help`} className="text-xs text-[var(--brand-muted)]">
            {helpText}
          </p>
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
  ({ label, error, helpText, options, className = '', id, ...props }, ref) => {
    const selectId = id ?? (label ? `field-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={selectId} className="block text-sm font-medium text-[var(--brand-text)]">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`${fieldBase} ${error ? fieldError : fieldDefault} px-3.5 py-2 text-sm cursor-pointer appearance-none ${className}`}
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238891aa' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
          {...props}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-[var(--brand-danger)]">{error}</p>}
        {!error && helpText && <p className="text-xs text-[var(--brand-muted)]">{helpText}</p>}
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
  ({ label, error, helpText, rows = 4, className = '', id, ...props }, ref) => {
    const fieldId = id ?? (label ? `field-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={fieldId} className="block text-sm font-medium text-[var(--brand-text)]">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={fieldId}
          rows={rows}
          aria-invalid={error ? true : undefined}
          className={`${fieldBase} ${error ? fieldError : fieldDefault} resize-y px-3.5 py-2 text-sm ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-[var(--brand-danger)]">{error}</p>}
        {!error && helpText && <p className="text-xs text-[var(--brand-muted)]">{helpText}</p>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';
