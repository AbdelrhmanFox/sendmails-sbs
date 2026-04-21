import { ReactNode } from 'react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && (
        <div className="text-[var(--brand-muted)] mb-4 opacity-50">
          {icon}
        </div>
      )}
      <h3 className="text-xl font-semibold text-[var(--brand-text)] mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-[var(--brand-muted)] max-w-md mb-6">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick}>{action.label}</Button>
      )}
    </div>
  );
}

export function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <svg className="animate-spin h-12 w-12 text-[var(--brand-primary)] mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <p className="text-sm text-[var(--brand-muted)]">{message}</p>
    </div>
  );
}

export function ErrorState({ title = 'Something went wrong', description, retry }: { title?: string; description?: string; retry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <svg className="w-16 h-16 text-[var(--brand-danger)] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <h3 className="text-xl font-semibold text-[var(--brand-text)] mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-[var(--brand-muted)] max-w-md mb-6">{description}</p>
      )}
      {retry && (
        <Button onClick={retry}>Try Again</Button>
      )}
    </div>
  );
}
