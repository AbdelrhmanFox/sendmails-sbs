import { useEffect, useState } from 'react';
import { Card } from '../../components/design-system/Card';
import { functionsBase, jsonFetch } from '../../../lib/api';

type ClassroomData = {
  batch: { batch_name: string; course_name: string; trainer?: string | null };
  assignments: Array<{ id: string; title: string; instructions?: string | null; due_date?: string | null }>;
  materials: Array<{ id: string; title: string; url: string; description?: string | null }>;
};

export function PublicClassroomPage({ token }: { token: string }) {
  const [data, setData] = useState<ClassroomData | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    let c = false;
    (async () => {
      try {
        const x = await jsonFetch<ClassroomData>(`${functionsBase()}/public-classroom?token=${encodeURIComponent(token)}`);
        if (!c) setData(x);
      } catch (e) {
        if (!c) setErr(e instanceof Error ? e.message : 'Could not load classroom');
      }
    })();
    return () => {
      c = true;
    };
  }, [token]);

  return (
    <div className="space-y-4">
      <Card>
        <h1 className="text-xl font-semibold text-[var(--brand-text)]">Public classroom</h1>
        {err ? <p className="mt-2 text-sm text-[var(--brand-danger)]">{err}</p> : null}
        {data ? (
          <p className="mt-2 text-sm text-[var(--brand-muted)]">
            {data.batch.batch_name || 'Batch'} · {data.batch.course_name || 'Course'}
          </p>
        ) : (
          <p className="mt-2 text-sm text-[var(--brand-muted)]">Loading…</p>
        )}
      </Card>
      {data ? (
        <>
          <Card>
            <h2 className="text-lg font-semibold text-[var(--brand-text)]">Assignments</h2>
            <div className="mt-3 space-y-2">
              {data.assignments.map((a) => (
                <div key={a.id} className="rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] p-3">
                  <p className="font-medium text-[var(--brand-text)]">{a.title}</p>
                  {a.instructions ? <p className="text-sm text-[var(--brand-muted)]">{a.instructions}</p> : null}
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <h2 className="text-lg font-semibold text-[var(--brand-text)]">Materials</h2>
            <div className="mt-3 space-y-2">
              {data.materials.map((m) => (
                <a
                  key={m.id}
                  href={m.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] p-3 hover:bg-[var(--brand-surface-2)]"
                >
                  <p className="font-medium text-[var(--brand-text)]">{m.title}</p>
                  {m.description ? <p className="text-sm text-[var(--brand-muted)]">{m.description}</p> : null}
                </a>
              ))}
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
}
