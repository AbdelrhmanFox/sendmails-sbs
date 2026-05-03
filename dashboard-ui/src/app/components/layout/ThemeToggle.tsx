import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Monitor, Moon, Sun } from 'lucide-react';
import { Button } from '../design-system/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { cn } from '../ui/utils';

const items: { value: 'dark' | 'light' | 'system'; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const TriggerIcon = !mounted
    ? Moon
    : theme === 'system'
      ? Monitor
      : resolvedTheme === 'dark'
        ? Moon
        : Sun;
  const modeLabel = !mounted ? 'Dark' : theme === 'system' ? 'System' : theme === 'light' ? 'Light' : 'Dark';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn('shrink-0 motion-reduce:transition-none', className)}
          aria-label={`Color theme: ${modeLabel}. Open to change appearance.`}
          disabled={!mounted}
        >
          <TriggerIcon className="h-5 w-5 motion-reduce:transition-none" aria-hidden />
          <span className="sr-only">Appearance</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-[10rem] border-[var(--brand-border)] bg-[var(--brand-surface)] text-[var(--brand-text)] shadow-[var(--brand-shadow)]"
      >
        <DropdownMenuRadioGroup
          value={(theme === 'light' || theme === 'dark' || theme === 'system' ? theme : 'dark') as string}
          onValueChange={(v) => setTheme(v)}
        >
          {items.map(({ value, label }) => (
            <DropdownMenuRadioItem
              key={value}
              value={value}
              className="cursor-pointer focus:bg-[var(--brand-surface-2)] data-[state=checked]:bg-[var(--brand-primary)]/15"
            >
              <span className="flex items-center gap-2">
                {value === 'light' ? <Sun className="h-4 w-4" aria-hidden /> : null}
                {value === 'dark' ? <Moon className="h-4 w-4" aria-hidden /> : null}
                {value === 'system' ? <Monitor className="h-4 w-4" aria-hidden /> : null}
                {label}
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
