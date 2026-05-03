import { Toaster as Sonner, type ToasterProps } from 'sonner';

/**
 * App-wide toast host. Dark theme matches the dashboard shell (no next-themes in this Vite app).
 */
export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="dark"
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
