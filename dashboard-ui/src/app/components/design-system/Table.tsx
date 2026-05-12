import { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react';

export interface TableProps extends HTMLAttributes<HTMLTableElement> {
  children: ReactNode;
  fullWidth?: boolean;
}

export function Table({ children, fullWidth = true, className = '', ...props }: TableProps) {
  return (
    <table
      className={`border-separate border-spacing-0 ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </table>
  );
}

export function TableHeader({ children, className = '', ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={className} {...props}>
      {children}
    </thead>
  );
}

export function TableBody({ children, className = '', ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={className} {...props}>
      {children}
    </tbody>
  );
}

export function TableRow({
  children,
  interactive,
  className = '',
  ...props
}: HTMLAttributes<HTMLTableRowElement> & { interactive?: boolean }) {
  return (
    <tr
      className={`
        border-b border-[var(--brand-border)] transition-colors duration-100
        last:border-b-0
        ${interactive ? 'cursor-pointer hover:bg-[var(--brand-surface-2)]' : 'hover:bg-[var(--brand-surface-2)]/40'}
        ${className}
      `}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TableHead({ children, className = '', ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={`
        sticky top-0 bg-[var(--brand-navy)] px-4 py-2.5
        text-left text-xs font-semibold uppercase tracking-wider text-[var(--brand-muted)]
        border-b border-[var(--brand-border)]
        first:rounded-tl-[var(--brand-radius-dense)] last:rounded-tr-[var(--brand-radius-dense)]
        ${className}
      `}
      {...props}
    >
      {children}
    </th>
  );
}

export function TableCell({ children, className = '', ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={`px-4 py-3 text-sm text-[var(--brand-text)] ${className}`}
      {...props}
    >
      {children}
    </td>
  );
}
