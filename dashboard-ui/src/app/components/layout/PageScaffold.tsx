import type { ReactNode } from 'react';

/**
 * Normalizes max width and horizontal rhythm for authenticated pages (ISSUE-04 / PageScaffold).
 */
export function PageScaffold({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full min-w-0 max-w-7xl">{children}</div>;
}
