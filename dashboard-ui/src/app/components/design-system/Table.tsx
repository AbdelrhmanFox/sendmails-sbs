import { HTMLAttributes, ReactNode } from 'react';

export interface TableProps extends HTMLAttributes<HTMLTableElement> {
  children: ReactNode;
  fullWidth?: boolean;
}

export function Table({ children, fullWidth = true, className = '', ...props }: TableProps) {
  return (
    <div className="overflow-x-auto rounded-[var(--brand-radius)] border border-[var(--brand-border)]">
      <table className={`${fullWidth ? 'w-full' : ''} ${className}`} {...props}>
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ children, className = '', ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={`bg-[var(--brand-surface-2)] border-b border-[var(--brand-border)] ${className}`} {...props}>
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

export function TableRow({ children, interactive, className = '', ...props }: HTMLAttributes<HTMLTableRowElement> & { interactive?: boolean }) {
  const hoverStyle = interactive ? 'hover:bg-[var(--brand-surface-2)] cursor-pointer transition-colors' : '';
  return (
    <tr className={`border-b border-[var(--brand-border)] last:border-b-0 ${hoverStyle} ${className}`} {...props}>
      {children}
    </tr>
  );
}

export function TableHead({ children, className = '', ...props }: HTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={`px-4 py-3 text-left text-sm font-semibold text-[var(--brand-text)] ${className}`} {...props}>
      {children}
    </th>
  );
}

export function TableCell({ children, className = '', ...props }: HTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={`px-4 py-3 text-sm text-[var(--brand-text)] ${className}`} {...props}>
      {children}
    </td>
  );
}
