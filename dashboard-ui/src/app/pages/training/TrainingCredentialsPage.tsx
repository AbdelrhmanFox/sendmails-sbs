import { useEffect, useState } from 'react';
import { Badge } from '../../components/design-system/Badge';
import { Button } from '../../components/design-system/Button';
import { Input } from '../../components/design-system/Input';
import { Card } from '../../components/design-system/Card';
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

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'neutral' | 'info'> = {
  active: 'success',
  issued: 'success',
  revoked: 'warning',
  expired: 'neutral',
};

export function TrainingCredentialsPage() {
  const [items, setItems] = useState<CredentialRow[]>([]);
  const [filterTrainee, setFilterTrainee] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState('');

  const load = async () => {
    setErr('');
    setLoading(true);
    try {
      const q = filterTrainee.trim() ? `&trainee_id=${encodeURIComponent(filterTrainee.trim())}` : '';
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shareUrl = (token: string) =>
    `${window.location.origin}${window.location.pathname.replace(/\/spa\/?.*$/, '/')}?credential=${encodeURIComponent(token)}`;

  const copyLink = async (id: string, token: string) => {
    await navigator.clipboard.writeText(shareUrl(token));
    setCopied(id);
    setTimeout(() => setCopied(''), 2000);
  };

  return (
    <div className="space-y-4">
      {err && (
        <p className="rounded-lg border border-[var(--brand-danger)]/30 bg-[var(--brand-danger)]/10 px-3 py-2 text-sm text-[var(--brand-danger)]">{err}</p>
      )}

      {/* Filter toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-[var(--brand-radius)] border border-[var(--brand-border)] bg-[var(--brand-surface)] px-4 py-3">
        <div className="w-64">
          <Input
            placeholder="Filter by trainee ID…"
            value={filterTrainee}
            onChange={(e) => setFilterTrainee(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void load()}
          />
        </div>
        <Button type="button" size="sm" variant="secondary" onClick={() => void load()}>
          Search
        </Button>
        {loading && <span className="text-xs text-[var(--brand-muted)]">Loading…</span>}
        {!loading && (
          <span className="ml-auto text-xs text-[var(--brand-muted)]">{items.length} certificate{items.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      <Card noPadding>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Certificate No.</TableHead>
              <TableHead>Trainee</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Template</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Issued</TableHead>
              <TableHead>Verify link</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && !loading ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <p className="text-sm text-[var(--brand-muted)]">No credentials found.</p>
                </TableCell>
              </TableRow>
            ) : items.map((r) => {
              const tok = r.verification_token;
              const isCopied = copied === r.id;
              return (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs font-medium text-[var(--brand-text)]">{r.certificate_no}</TableCell>
                  <TableCell className="font-mono text-xs">{r.trainee_id}</TableCell>
                  <TableCell className="font-mono text-xs">{r.course_id}</TableCell>
                  <TableCell className="text-xs text-[var(--brand-muted)]">
                    {r.credential_templates?.template_name || r.credential_templates?.credential_type || '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[r.status] ?? 'neutral'}>{r.status}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-[var(--brand-muted)]">
                    {r.issued_at ? new Date(r.issued_at).toLocaleDateString() : '—'}
                  </TableCell>
                  <TableCell>
                    {tok ? (
                      <Button
                        size="sm"
                        type="button"
                        variant={isCopied ? 'primary' : 'secondary'}
                        onClick={() => void copyLink(r.id, tok)}
                      >
                        {isCopied ? 'Copied!' : 'Copy link'}
                      </Button>
                    ) : '—'}
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
