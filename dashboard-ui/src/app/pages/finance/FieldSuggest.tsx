/**
 * FieldSuggest — a free-text input with historical suggestions loaded from the finance API.
 *
 * Unlike EnrollmentPicker, the user is NOT required to pick from the list.
 * They can type anything; the list only offers shortcuts.
 *
 * Props:
 *   entity   — one of the server-side entity keys (expense-description, expense-funding, etc.)
 *   label    — visible label
 *   value    — controlled string value
 *   onChange — called with the new string value on every change (picks and keystrokes)
 *   placeholder, optional, multiline (renders textarea instead of input)
 */
import { useEffect, useRef, useState } from 'react';
import { functionsBase, getAuthHeaders, jsonFetch } from '../../../lib/api';

export type SuggestEntity =
  | 'expense-description'
  | 'expense-funding'
  | 'expense-by'
  | 'receipt-payer'
  | 'payment-notes'
  | 'payment-reference';

interface FieldSuggestProps {
  entity: SuggestEntity;
  label?: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  optional?: boolean;
  multiline?: boolean;
  rows?: number;
}

const fieldBase =
  'w-full rounded-[var(--brand-radius-dense)] border bg-[var(--brand-navy)] ' +
  'text-[var(--brand-text)] placeholder:text-[var(--brand-dim)] ' +
  'transition-all duration-150 ' +
  'focus:outline-none focus:ring-2 focus:ring-[var(--brand-focus-ring)] focus:ring-offset-0 ' +
  'border-[var(--brand-border)] focus:border-[var(--brand-primary)]/60';

export function FieldSuggest({
  entity,
  label,
  value,
  onChange,
  placeholder,
  optional,
  multiline,
  rows = 2,
}: FieldSuggestProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [filtered, setFiltered] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchedRef = useRef(false);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function fetchSuggestions(q = '') {
    const url = `${functionsBase()}/finance-data?resource=field-suggestions&entity=${encodeURIComponent(entity)}${q ? `&q=${encodeURIComponent(q)}` : ''}`;
    jsonFetch<{ items: string[] }>(url, { headers: getAuthHeaders() })
      .then((d) => {
        const items = d.items || [];
        setSuggestions(items);
        setFiltered(items);
        fetchedRef.current = true;
      })
      .catch(() => {});
  }

  function handleFocus() {
    if (!fetchedRef.current) {
      fetchSuggestions();
    } else {
      applyFilter(value);
    }
    setOpen(true);
    setActiveIdx(-1);
  }

  function applyFilter(q: string) {
    if (!q.trim()) {
      setFiltered(suggestions);
    } else {
      const lower = q.toLowerCase();
      setFiltered(suggestions.filter((s) => s.toLowerCase().includes(lower)));
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const val = e.target.value;
    onChange(val);
    setOpen(true);
    setActiveIdx(-1);

    // Debounce server query for new completions
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (fetchedRef.current) {
        applyFilter(val);
      } else {
        fetchSuggestions(val);
      }
    }, 200);
  }

  function pick(val: string) {
    onChange(val);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || filtered.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault();
      pick(filtered[activeIdx]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  const inputId = label ? `suggest-${entity}-${label.replace(/\s+/g, '-').toLowerCase()}` : `suggest-${entity}`;
  const showDropdown = open && filtered.length > 0;

  return (
    <div ref={containerRef} className="w-full space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-[var(--brand-text)]">
          {label}
          {optional && <span className="ml-1 text-xs text-[var(--brand-muted)]">(optional)</span>}
        </label>
      )}

      <div className="relative">
        {multiline ? (
          <textarea
            id={inputId}
            rows={rows}
            dir="auto"
            value={value}
            onChange={handleChange}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={`${fieldBase} resize-none px-3.5 py-2 text-sm`}
          />
        ) : (
          <input
            id={inputId}
            type="text"
            autoComplete="off"
            dir="auto"
            value={value}
            onChange={handleChange}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={`${fieldBase} px-3.5 py-2 text-sm`}
          />
        )}

        {/* Dropdown suggestions */}
        {showDropdown && (
          <ul
            role="listbox"
            className="absolute z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[var(--brand-surface)] py-1 shadow-lg"
          >
            {filtered.map((item, idx) => (
              <li
                key={item}
                role="option"
                aria-selected={idx === activeIdx}
                onMouseDown={(e) => { e.preventDefault(); pick(item); }}
                onMouseEnter={() => setActiveIdx(idx)}
                className={`cursor-pointer px-3 py-2 text-sm ${
                  idx === activeIdx
                    ? 'bg-[var(--brand-primary)]/15 text-[var(--brand-text)]'
                    : 'text-[var(--brand-text)] hover:bg-[var(--brand-border)]/30'
                }`}
                dir="auto"
              >
                {item}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
