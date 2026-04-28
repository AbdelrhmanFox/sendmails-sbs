import { PublicShell } from './PublicShell';
import { PublicSessionJoinPage } from './PublicSessionJoinPage';
import { PublicClassroomPage } from './PublicClassroomPage';
import { PublicCredentialLearnerPage } from './PublicCredentialLearnerPage';
import { Card } from '../../components/design-system/Card';

function readQuery() {
  const q = new URLSearchParams(window.location.search);
  return {
    session: String(q.get('session') || '').trim(),
    group: String(q.get('group') || '').trim(),
    classroom: String(q.get('classroom') || '').trim(),
    credential: String(q.get('credential') || '').trim(),
    learner: String(q.get('learner') || '').trim(),
  };
}

export function hasPublicQuery(): boolean {
  const q = readQuery();
  return Boolean(q.session || q.group || q.classroom || q.credential || q.learner);
}

export function PublicQueryRouter() {
  const q = readQuery();
  const target = q.group || q.session ? 'session' : q.classroom ? 'classroom' : q.credential || q.learner ? 'credential' : 'none';
  return (
    <PublicShell>
      {target === 'session' ? <PublicSessionJoinPage groupToken={q.group || undefined} sessionId={q.session || undefined} /> : null}
      {target === 'classroom' ? <PublicClassroomPage token={q.classroom} /> : null}
      {target === 'credential' ? (
        <PublicCredentialLearnerPage token={q.credential || undefined} learnerSlug={q.learner || undefined} />
      ) : null}
      {target === 'none' ? (
        <Card>
          <p className="text-sm text-[var(--brand-muted)]">No public query parameter was found.</p>
        </Card>
      ) : null}
    </PublicShell>
  );
}
