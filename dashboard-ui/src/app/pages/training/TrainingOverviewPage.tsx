import { useEffect, useState } from 'react';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { functionsBase, getAuthHeaders, jsonFetch } from '../../../lib/api';
import { classicShellUrl } from '../../../lib/legacyClassic';

export function TrainingOverviewPage() {
  const [count, setCount] = useState<number | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await jsonFetch<{ sessions: unknown[] }>(`${functionsBase()}/training-sessions`, {
          headers: getAuthHeaders(),
        });
        if (!cancelled) setCount(Array.isArray(data.sessions) ? data.sessions.length : 0);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'Failed to load');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const openClassicTrainingHome = () => {
    window.location.href = `${window.location.origin}${classicShellUrl('/training/training')}`;
  };

  return (
    <div className="space-y-4">
      {err ? (
        <div className="rounded-lg border border-[var(--brand-danger)]/30 bg-[var(--brand-danger)]/10 p-3 text-sm text-[var(--brand-danger)]">
          {err}
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm text-[var(--brand-muted)]">Sessions (visible to your role)</p>
          <p className="mt-1 text-2xl font-bold text-[var(--brand-text)]">{count ?? '—'}</p>
        </Card>
        <Card>
          <p className="text-sm text-[var(--brand-muted)]">Trainee portal</p>
          <p className="mt-2 text-sm text-[var(--brand-text)]">Trainees can continue to use the classic “My Learning Portal” flow.</p>
          <Button className="mt-3" variant="secondary" type="button" onClick={openClassicTrainingHome}>
            Open classic training home
          </Button>
        </Card>
        <Card>
          <p className="text-sm text-[var(--brand-muted)]">Heavy classroom UI</p>
          <p className="mt-2 text-sm text-[var(--brand-text)]">
            Live classroom, whiteboard, and assignments stay in the classic embed for this release; APIs are unchanged.
          </p>
        </Card>
      </div>
    </div>
  );
}
