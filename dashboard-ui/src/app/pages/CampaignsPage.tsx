import { useEffect, useState } from 'react';
import { Card } from '../components/design-system/Card';
import { Button } from '../components/design-system/Button';
import { Input } from '../components/design-system/Input';
import { jsonFetch } from '../../lib/api';

const WEBHOOK_KEY = 'sbs_sendmails_webhook';
const SHEET_KEY = 'sbs_sendmails_sheet_url';
const DEFAULT_WEBHOOK_URL = 'https://n8n.growleadpro.com/webhook/sendmails-sbs';
const DEFAULT_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/1sUUpVcRs5tE1KzNGaVA4cnQShvr1eI1bvkO44jAsKtI/edit?gid=0#gid=0';

type PreviewResponse = { columns?: string[]; sampleRow?: Record<string, string> };

export function CampaignsPage() {
  const [webhook, setWebhook] = useState('');
  const [sheetUrl, setSheetUrl] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('<p>Hello {{name}}</p>');
  const [columns, setColumns] = useState<string[]>([]);
  const [sampleRow, setSampleRow] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');
  const [statusHtml, setStatusHtml] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const w = localStorage.getItem(WEBHOOK_KEY);
    const s = localStorage.getItem(SHEET_KEY);
    setWebhook((w || DEFAULT_WEBHOOK_URL).trim());
    setSheetUrl((s || DEFAULT_SHEET_URL).trim());
  }, []);

  const saveWebhook = () => {
    localStorage.setItem(WEBHOOK_KEY, webhook.trim() || DEFAULT_WEBHOOK_URL);
    localStorage.setItem(SHEET_KEY, sheetUrl.trim() || DEFAULT_SHEET_URL);
    setMsg('Webhook and sheet URL saved in this browser.');
  };

  const previewColumns = async () => {
    setLoading(true);
    setMsg('');
    try {
      const data = await jsonFetch<PreviewResponse>(webhook.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'preview', sheetUrl: sheetUrl.trim() }),
      });
      setColumns(data.columns || []);
      setSampleRow((data.sampleRow || {}) as Record<string, string>);
      setMsg('Columns loaded.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Preview failed');
    } finally {
      setLoading(false);
    }
  };

  const sendCampaign = async () => {
    setLoading(true);
    setMsg('');
    try {
      await jsonFetch(webhook.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', sheetUrl: sheetUrl.trim(), subject: subject.trim(), bodyHtml }),
      });
      setMsg('Campaign dispatch started.');
      void refreshStatus();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Send failed');
    } finally {
      setLoading(false);
    }
  };

  const refreshStatus = async () => {
    if (!webhook.trim() || !sheetUrl.trim()) return;
    try {
      const data = await jsonFetch<{
        sent?: number;
        pending?: number;
        lastSentRow?: string;
        nextRowToSend?: string;
      }>(webhook.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'status', sheetUrl: sheetUrl.trim() }),
      });
      setStatusHtml(
        `Sent: ${data.sent ?? '—'} · Pending: ${data.pending ?? '—'} · Last row: ${data.lastSentRow ?? '—'} · Next: ${data.nextRowToSend ?? '—'}`,
      );
    } catch (e) {
      setStatusHtml(e instanceof Error ? e.message : 'Status failed');
    }
  };

  const replacePlaceholders = (text: string) =>
    text.replace(/\{\{([^}]+)\}\}/g, (_, k) => sampleRow[k.trim()] ?? `{{${k.trim()}}}`);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--brand-text)]">Email campaigns</h1>
        <p className="mt-1 text-sm text-[var(--brand-muted)]">
          Same client-side n8n webhook contract as the classic dashboard; webhook URL is stored in localStorage only.
        </p>
      </div>

      <Card className="space-y-4">
        <Input label="Webhook URL (n8n)" value={webhook} onChange={(e) => setWebhook(e.target.value)} />
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={saveWebhook}>
            Save webhook locally
          </Button>
        </div>
        <Input label="Google Sheet URL" value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} />
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" loading={loading} onClick={() => void previewColumns()}>
            Load columns
          </Button>
          <Button type="button" variant="secondary" onClick={() => void refreshStatus()}>
            Check status
          </Button>
        </div>
        {columns.length ? (
          <p className="text-sm text-[var(--brand-muted)]">Columns: {columns.join(', ')}</p>
        ) : null}
        {msg ? <p className="text-sm text-[var(--brand-text)]">{msg}</p> : null}
        {statusHtml ? <p className="text-sm text-[var(--brand-muted)]">{statusHtml}</p> : null}
      </Card>

      <Card className="space-y-4">
        <Input label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--brand-text)]">Body (HTML)</label>
          <textarea
            className="min-h-[200px] w-full rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[var(--brand-surface)] p-3 text-sm text-[var(--brand-text)]"
            value={bodyHtml}
            onChange={(e) => setBodyHtml(e.target.value)}
          />
        </div>
        <Button type="button" loading={loading} onClick={() => void sendCampaign()} disabled={!subject.trim()}>
          Start send
        </Button>
      </Card>

      <Card>
        <h3 className="mb-2 text-sm font-semibold text-[var(--brand-text)]">Preview</h3>
        <p className="text-sm font-medium text-[var(--brand-text)]">{replacePlaceholders(subject)}</p>
        <div
          className="prose prose-invert mt-2 max-w-none text-sm text-[var(--brand-muted)]"
          dangerouslySetInnerHTML={{ __html: replacePlaceholders(bodyHtml) }}
        />
      </Card>
    </div>
  );
}
