export type SegmentedNavItem<T extends string = string> = { value: T; label: string };

export type SegmentedNavProps<T extends string = string> = {
  items: SegmentedNavItem<T>[];
  value: T;
  onValueChange: (value: T) => void;
  /** `state`: filled active pill + bordered inactive (catalog tabs). `default`: muted inactive (layout-style pills). */
  variant?: 'default' | 'state';
  /** When false, pills stay on one row (pair with a parent `overflow-x-auto`). Default true. */
  wrap?: boolean;
  className?: string;
  'aria-label': string;
};

const activeClass = 'bg-[var(--brand-primary)] text-white';

const inactive: Record<'default' | 'state', string> = {
  default: 'text-[var(--brand-muted)] hover:bg-[var(--brand-surface-2)] hover:text-[var(--brand-text)]',
  state:
    'border border-[var(--brand-border)] text-[var(--brand-muted)] hover:bg-[var(--brand-surface-2)] hover:text-[var(--brand-text)]',
};

const baseItem = 'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--brand-focus-ring)]';

/**
 * Horizontal pill control for mutually exclusive in-page options (ISSUE-09).
 */
export function SegmentedNav<T extends string>({
  items,
  value,
  onValueChange,
  variant = 'default',
  wrap = true,
  className = '',
  'aria-label': ariaLabel,
}: SegmentedNavProps<T>) {
  const flow = wrap ? 'flex flex-wrap' : 'flex flex-nowrap';
  return (
    <nav className={`${flow} gap-2 ${className}`} aria-label={ariaLabel}>
      {items.map((item) => {
        const selected = value === item.value;
        return (
          <button
            key={item.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onValueChange(item.value)}
            className={`${baseItem} ${wrap ? '' : 'shrink-0'} ${selected ? activeClass : inactive[variant]}`}
          >
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
