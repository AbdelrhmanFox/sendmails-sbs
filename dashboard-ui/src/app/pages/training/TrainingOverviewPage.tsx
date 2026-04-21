import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { functionsBase, getAuthHeaders, jsonFetch } from '../../../lib/api';

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
          <p className="text-sm text-[var(--brand-muted)]">Sessions and groups</p>
          <p className="mt-2 text-sm text-[var(--brand-text)]">Create live sessions, copy participant links, and manage groups from Sessions.</p>
          <Link to="/training/sessions">
            <Button className="mt-3" type="button">
              Open sessions
            </Button>
          </Link>
        </Card>
        <Card>
          <p className="text-sm text-[var(--brand-muted)]">Trainees</p>
          <p className="mt-2 text-sm text-[var(--brand-text)]">
            Trainees sign in with a trainee account and use Training in the sidebar. Participant join links use the site root with{' '}
            <code className="text-xs">?session=</code>.
          </p>
        </Card>
      </div>
    </div>
  );
}
