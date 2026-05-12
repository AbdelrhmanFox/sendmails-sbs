import { useEffect, useRef, useState } from 'react';
import { functionsBase, getAuthHeaders, jsonFetch } from '../../../lib/api';

type SearchItem = {
  enrollment_id: string;
  trainee_id: string;
  batch_id: string;
  trainee_name: string | null;
};

interface EnrollmentPickerProps {
  label?: string;
  value: string;
  onChange: (enrollmentId: string, item?: SearchItem) => void;
  placeholder?: string;
  required?: boolean;
  optional?: boolean;
}

const fieldBase =
  'w-full rounded-[var(--brand-radius-dense)] border bg-[var(--brand-navy)] ' +
  'text-[var(--brand-text)] placeholder:text-[var(--brand-dim)] ' +
  'transition-all duration-150 ' +
  'focus:outline-none focus:ring-2 focus:ring-[var(--brand-focus-ring)] focus:ring-offset-0 ' +
  'border-[var(--brand-border)] focus:border-[var(--brand-primary)]/60';

export function EnrollmentPicker({
  label,
  value,
  onChange,
  placeholder = 'Type name or ID…',
  required,
  optional,
}: EnrollmentPickerProps) {
  const [query, setQuery] = useState(value);
  const [items, setItems] = useState<SearchItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<SearchItem | null>(null);
  const [activeIdx, setActiveIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Sync external value reset (e.g. after form submit clears the field)
  useEffect(() => {
    if (!value) {
      setQuery('');
      setSelected(null);
      setItems([]);
    }
  }, [value]);

  function search(q: string) {
    if (q.length < 2) {
      setItems([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    jsonFetch<{ items: SearchItem[] }>(
      `${functionsBase()}/finance-data?resource=enrollment-search&q=${encodeURIComponent(q)}`,
      { headers: getAuthHeaders() },
    )
      .then((d) => {
        setItems(d.items || []);
        setOpen(true);
        setActiveIdx(-1);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setQuery(q);
    setSelected(null);
    onChange('', undefined);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(q), 250);
  }

  function pick(item: SearchItem) {
    setSelected(item);
    setQuery(item.enrollment_id);
    onChange(item.enrollment_id, item);
    setOpen(false);
    setItems([]);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || items.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault();
      pick(items[activeIdx]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  const inputId = label ? `enr-picker-${label.replace(/\s+/g, '-').toLowerCase()}` : 'enr-picker';

  return (
    <div ref={containerRef} className="w-full space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-[var(--brand-text)]">
          {label}
          {optional && <span className="ml-1 text-xs text-[var(--brand-muted)]">(optional)</span>}
          {required && <span className="ml-0.5 text-[var(--brand-danger)]">*</span>}
        </label>
      )}

      <div className="relative">
        <input
          id={inputId}
          type="text"
          autoComplete="off"
          value={query}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (items.length > 0) setOpen(true); }}
          placeholder={placeholder}
          className={`${fieldBase} px-3.5 py-2 pr-8 text-sm`}
        />
        {/* Spinner / magnifier icon */}
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--brand-muted)]">
          {loading ? (
            <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          ) : (
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" />
              <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
            </svg>
          )}
        </span>

        {/* Dropdown */}
        {open && items.length > 0 && (
          <ul
            role="listbox"
            className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[var(--brand-surface)] py-1 shadow-lg"
          >
            {items.map((item, idx) => (
              <li
                key={item.enrollment_id}
                role="option"
                aria-selected={idx === activeIdx}
                onMouseDown={(e) => { e.preventDefault(); pick(item); }}
                onMouseEnter={() => setActiveIdx(idx)}
                className={`cursor-pointer px-3 py-2 text-sm ${
                  idx === activeIdx
                    ? 'bg-[var(--brand-primary)]/15 text-[var(--brand-text)]'
                    : 'text-[var(--brand-text)] hover:bg-[var(--brand-border)]/30'
                }`}
              >
                <span className="font-mono text-xs text-[var(--brand-primary)]">{item.enrollment_id}</span>
                {item.trainee_name && (
                  <span dir="auto" className="ml-2 text-[var(--brand-text)]">{item.trainee_name}</span>
                )}
                {item.batch_id && (
                  <span className="ml-2 text-[11px] text-[var(--brand-muted)]">· {item.batch_id}</span>
                )}
              </li>
            ))}
          </ul>
        )}

        {/* No results */}
        {open && !loading && items.length === 0 && query.length >= 2 && (
          <div className="absolute z-50 mt-1 w-full rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-sm text-[var(--brand-muted)] shadow-lg">
            No enrollments found
          </div>
        )}
      </div>

      {/* Hint while not enough chars */}
      {!selected && query.length > 0 && query.length < 2 && (
        <p className="text-xs text-[var(--brand-dim)]">Type at least 2 characters to search</p>
      )}

      {/* Confirmation strip after selection */}
      {selected && (
        <p className="flex items-center gap-1.5 text-xs text-[var(--brand-success)]">
          <svg className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span dir="auto">{selected.trainee_name || selected.trainee_id}</span>
          <span className="text-[var(--brand-muted)]">· {selected.batch_id}</span>
        </p>
      )}
    </div>
  );
}
