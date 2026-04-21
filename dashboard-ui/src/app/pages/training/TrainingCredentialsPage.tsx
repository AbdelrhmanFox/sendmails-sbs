import { useEffect, useState } from 'react';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { Input } from '../../components/design-system/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/design-system/Table';
import { functionsBase, getAuthHeaders, jsonFetch } from '../../../lib/api';

type CredentialRow = {
  id: string;
  certificate_no: string;
  trainee_id: string;
  course_id: string;
  status: string;
  issued_at?: string | null;
  verification_token?: string;
  credential_templates?: { template_name?: string | null; credential_type?: string | null } | null;
};

export function TrainingCredentialsPage() {
  const [items, setItems] = useState<CredentialRow[]>([]);
  const [filterTrainee, setFilterTrainee] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setErr('');
    setLoading(true);
    try {
      const q = filterTrainee.trim()
        ? `&trainee_id=${encodeURIComponent(filterTrainee.trim())}`
        : '';
      const data = await jsonFetch<{ items: CredentialRow[] }>(
        `${functionsBase()}/credential-center?resource=credentials${q}`,
        { headers: getAuthHeaders() },
      );
      setItems(data.items || []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load credentials');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load on mount only; filter uses Apply
  }, []);

  const shareUrl = (token: string) =>
    `${window.location.origin}${window.location.pathname.replace(/\/spa\/?.*$/, '/')}?credential=${encodeURIComponent(token)}`;

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--brand-muted)]">
        Issued credentials and public verification links. Verification opens the site root with the same query contract as legacy.
      </p>
      {err ? <p className="text-sm text-[var(--brand-danger)]">{err}</p> : null}
      <Card className="space-y-3 p-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="max-w-xs flex-1">
            <Input
              label="Filter by trainee ID"
              value={filterTrainee}
              onChange={(e) => setFilterTrainee(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <Button type="button" variant="secondary" onClick={() => void load()}>
            Apply
          </Button>
        </div>
      </Card>
      {loading ? <p className="text-sm text-[var(--brand-muted)]">Loading…</p> : null}
      <Card noPadding>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Certificate</TableHead>
              <TableHead>Trainee</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Issued</TableHead>
              <TableHead>Public link</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((r) => {
              const tok = r.verification_token;
              return (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.certificate_no}</TableCell>
                  <TableCell className="font-mono text-xs">{r.trainee_id}</TableCell>
                  <TableCell className="font-mono text-xs">{r.course_id}</TableCell>
                  <TableCell>{r.status}</TableCell>
                  <TableCell className="text-xs">
                    {r.issued_at ? new Date(r.issued_at).toLocaleString() : '—'}
                  </TableCell>
                  <TableCell>
                    {tok ? (
                      <Button
                        size="sm"
                        type="button"
                        variant="secondary"
                        onClick={() => void navigator.clipboard.writeText(shareUrl(tok))}
                      >
                        Copy verify link
                      </Button>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
