import { ClassicEmbed } from '../../components/ClassicEmbed';

export function TrainingClassicSubPage({ hashPath, description }: { hashPath: string; description?: string }) {
  return (
    <div className="space-y-3">
      {description ? <p className="text-sm text-[var(--brand-muted)]">{description}</p> : null}
      <ClassicEmbed hashPath={hashPath} />
    </div>
  );
}
