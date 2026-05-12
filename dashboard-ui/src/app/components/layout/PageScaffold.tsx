import type { ReactNode } from 'react';

export function PageScaffold({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl animate-fade-in">
      {children}
    </div>
  );
}
