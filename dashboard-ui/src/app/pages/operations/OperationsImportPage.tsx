import { ClassicEmbed } from '../../components/ClassicEmbed';

export function OperationsImportPage() {
  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--brand-muted)]">
        Bulk Excel import uses the classic importer UI until the upload flow is rebuilt in React. Your session and roles apply
        inside the embedded workspace.
      </p>
      <ClassicEmbed hashPath="/operations/operations-bulk" title="Data import (classic)" />
    </div>
  );
}
