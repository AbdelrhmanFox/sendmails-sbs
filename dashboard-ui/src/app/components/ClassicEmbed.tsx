import { classicShellUrl } from '../../lib/legacyClassic';

/** Embeds the legacy dashboard shell for views not yet ported to React. */
export function ClassicEmbed({ hashPath, title }: { hashPath: string; title?: string }) {
  const src = classicShellUrl(hashPath);
  return (
    <div className="flex h-[min(78vh,900px)] min-h-[420px] flex-col gap-3">
      {title ? <p className="text-sm text-[var(--brand-muted)]">{title}</p> : null}
      <iframe title="Classic workspace" className="flex-1 w-full rounded-lg border border-[var(--brand-border)] bg-white" src={src} />
    </div>
  );
}
