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
  return (
    <PublicShell>
      {q.group || q.session ? <PublicSessionJoinPage groupToken={q.group || undefined} sessionId={q.session || undefined} /> : null}
      {!q.group && !q.session && q.classroom ? <PublicClassroomPage token={q.classroom} /> : null}
      {!q.group && !q.session && !q.classroom && (q.credential || q.learner) ? (
        <PublicCredentialLearnerPage token={q.credential || undefined} learnerSlug={q.learner || undefined} />
      ) : null}
      {!hasPublicQuery() ? (
        <Card>
          <p className="text-sm text-[var(--brand-muted)]">No public query parameter was found.</p>
        </Card>
      ) : null}
    </PublicShell>
  );
}
