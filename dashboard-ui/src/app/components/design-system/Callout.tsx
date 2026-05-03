import type { ReactNode } from 'react';
import { Button } from './Button';

export type CalloutAction = { label: string; onClick: () => void };

/**
 * Prominent banner for security / account actions (ISSUE-04). Uses SBS brand tokens only.
 */
export function Callout({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: CalloutAction;
}) {
  return (
    <div
      role="alert"
      className="rounded-[var(--brand-radius)] border border-[var(--brand-accent)]/45 bg-[var(--brand-accent)]/10 px-4 py-3 text-[var(--brand-text)] shadow-[var(--brand-shadow-soft)]"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-semibold text-[var(--brand-text)]">{title}</p>
          {children ? <div className="mt-1 text-sm text-[var(--brand-muted)]">{children}</div> : null}
        </div>
        {action ? (
          <Button type="button" variant="accent" size="sm" className="w-full shrink-0 sm:w-auto" onClick={action.onClick}>
            {action.label}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
