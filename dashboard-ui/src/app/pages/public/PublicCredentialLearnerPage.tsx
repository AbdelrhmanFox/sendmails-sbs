import { useEffect, useState } from 'react';
import { Card } from '../../components/design-system/Card';
import { functionsBase, jsonFetch } from '../../../lib/api';

type VerifyData = {
  verify_status: string;
  credential: {
    certificate_no: string;
    course_id: string;
    trainee_id: string;
    issued_at?: string | null;
    status?: string;
  };
};

type LearnerData = {
  profile: { display_name?: string | null; trainee_id: string; headline?: string | null; bio?: string | null };
  credentials: Array<{ id: string; certificate_no: string; course_id: string; status: string; verification_token: string }>;
};

export function PublicCredentialLearnerPage({ token, learnerSlug }: { token?: string; learnerSlug?: string }) {
  const [verify, setVerify] = useState<VerifyData | null>(null);
  const [learner, setLearner] = useState<LearnerData | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    let c = false;
    (async () => {
      setErr('');
      try {
        if (token) {
          const d = await jsonFetch<VerifyData>(`${functionsBase()}/credential-public?resource=verify&token=${encodeURIComponent(token)}`);
          if (!c) setVerify(d);
          return;
        }
        if (learnerSlug) {
          const d = await jsonFetch<LearnerData>(
            `${functionsBase()}/credential-public?resource=learner-profile&slug=${encodeURIComponent(learnerSlug)}`,
          );
          if (!c) setLearner(d);
        }
      } catch (e) {
        if (!c) setErr(e instanceof Error ? e.message : 'Could not load public page');
      }
    })();
    return () => {
      c = true;
    };
  }, [token, learnerSlug]);

  return (
    <div className="space-y-4">
      <Card>
        <h1 className="text-xl font-semibold text-[var(--brand-text)]">{token ? 'Credential verification' : 'Learner profile'}</h1>
        {err ? <p className="mt-2 text-sm text-[var(--brand-danger)]">{err}</p> : null}
      </Card>
      {verify ? (
        <Card className="space-y-2">
          <p className="text-sm text-[var(--brand-muted)]">Status: {verify.verify_status}</p>
          <p className="text-sm text-[var(--brand-text)]">Certificate: {verify.credential.certificate_no}</p>
          <p className="text-sm text-[var(--brand-text)]">Course: {verify.credential.course_id}</p>
          <p className="text-sm text-[var(--brand-text)]">Trainee: {verify.credential.trainee_id}</p>
        </Card>
      ) : null}
      {learner ? (
        <Card>
          <h2 className="text-lg font-semibold text-[var(--brand-text)]">{learner.profile.display_name || learner.profile.trainee_id}</h2>
          {learner.profile.headline ? <p className="text-sm text-[var(--brand-muted)]">{learner.profile.headline}</p> : null}
          {learner.profile.bio ? <p className="mt-2 text-sm text-[var(--brand-text)]">{learner.profile.bio}</p> : null}
          <div className="mt-3 space-y-2">
            {learner.credentials.map((x) => (
              <a
                key={x.id}
                href={`/?credential=${encodeURIComponent(x.verification_token)}`}
                className="block rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] p-3 hover:bg-[var(--brand-surface-2)]"
              >
                <p className="font-medium text-[var(--brand-text)]">{x.certificate_no}</p>
                <p className="text-sm text-[var(--brand-muted)]">
                  {x.course_id} · {x.status}
                </p>
              </a>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
