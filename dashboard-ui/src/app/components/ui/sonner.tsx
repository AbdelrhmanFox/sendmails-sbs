import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

/**
 * App-wide toast host. Theme follows next-themes resolved appearance.
 */
export function Toaster(props: ToasterProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const sonnerTheme = !mounted ? 'dark' : resolvedTheme === 'dark' ? 'dark' : 'light';

  return (
    <Sonner
      theme={sonnerTheme}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'border border-[var(--brand-border)] bg-[var(--brand-surface)] text-[var(--brand-text)] shadow-[var(--brand-shadow-soft)]',
          description: 'text-[var(--brand-muted)]',
          success: 'border-[var(--brand-success)]/40',
          error: 'border-[var(--brand-danger)]/40',
        },
      }}
      {...props}
    />
  );
}
