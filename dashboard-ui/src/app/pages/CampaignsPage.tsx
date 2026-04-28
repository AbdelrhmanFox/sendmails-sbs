import { useEffect, useRef, useState } from 'react';
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
type CampaignTemplateKey = '' | 'welcome' | 'reminder' | 'announcement' | 'offer';

const CAMPAIGN_TEMPLATES: Record<Exclude<CampaignTemplateKey, ''>, { subject: string; body: string }> = {
  welcome: {
    subject: 'Welcome {{Name}} to SBS',
    body: '<p>Hello {{Name}},</p><p>Welcome to SBS. We are excited to have you with us.</p><p>Best regards,<br/>SBS Team</p>',
  },
  reminder: {
    subject: 'Reminder for {{Name}}',
    body: '<p>Hello {{Name}},</p><p>This is a friendly reminder about your upcoming item.</p><p>Please reply if you need support.</p>',
  },
  announcement: {
    subject: 'Important update for {{Name}}',
    body: '<p>Hello {{Name}},</p><p>We have an important update to share with you.</p><p>Thank you.</p>',
  },
  offer: {
    subject: 'Special offer for {{Name}}',
    body: '<p>Hello {{Name}},</p><p>We prepared a special offer for you.</p><p>Contact us to learn more details.</p>',
  },
};

const COURSE_HEADER_ALIASES = ['course', 'course_name', 'courseid', 'coures'];

function normalizeToken(value: string) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

export function CampaignsPage() {
  const [webhook, setWebhook] = useState('');
  const [sheetUrl, setSheetUrl] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('<p>Hello {{name}}</p>');
  const [template, setTemplate] = useState<CampaignTemplateKey>('');
  const [columns, setColumns] = useState<string[]>([]);
  const [sampleRow, setSampleRow] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');
  const [statusHtml, setStatusHtml] = useState('');
  const [loading, setLoading] = useState(false);
  const editorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const w = localStorage.getItem(WEBHOOK_KEY);
    const s = localStorage.getItem(SHEET_KEY);
    setWebhook((w || DEFAULT_WEBHOOK_URL).trim());
    setSheetUrl((s || DEFAULT_SHEET_URL).trim());
  }, []);

  useEffect(() => {
    if (!editorRef.current) return;
    if (editorRef.current.innerHTML !== bodyHtml) {
      editorRef.current.innerHTML = bodyHtml;
    }
  }, [bodyHtml]);

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

  const resolveSampleValue = (rawToken: string) => {
    const tokenNorm = normalizeToken(rawToken);
    if (!tokenNorm) return null;

    const rowKeyByNorm: Record<string, string> = {};
    Object.keys(sampleRow).forEach((k) => {
      const nk = normalizeToken(k);
      if (nk && !rowKeyByNorm[nk]) rowKeyByNorm[nk] = k;
    });

    const candidateNorms = COURSE_HEADER_ALIASES.map(normalizeToken).includes(tokenNorm)
      ? COURSE_HEADER_ALIASES.map(normalizeToken)
      : [tokenNorm];

    for (const candidate of candidateNorms) {
      const key = rowKeyByNorm[candidate];
      if (!key) continue;
      const value = sampleRow[key];
      if (value != null && String(value).trim() !== '') return value;
    }
    return null;
  };

  const replacePlaceholders = (text: string) =>
    text.replace(/\{\{([^}]+)\}\}/g, (_, k) => resolveSampleValue(k.trim()) ?? `{{${k.trim()}}}`);

  const extractPlaceholders = (text: string) =>
    [...String(text || '').matchAll(/\{\{([^}]+)\}\}/g)].map((m) => String(m[1] || '').trim()).filter(Boolean);

  const unknownPlaceholders = [...new Set([...extractPlaceholders(subject), ...extractPlaceholders(bodyHtml)])].filter(
    (p) => resolveSampleValue(p) == null && !columns.some((c) => String(c).trim().toLowerCase() === p.toLowerCase()),
  );

  const composerChecks: string[] = [];
  if (!subject.trim()) composerChecks.push('Subject is empty.');
  if (subject.trim().length > 70) composerChecks.push('Subject is long (recommended under 70 characters).');
  if (/(free|urgent|act now|guarantee|winner|100%)/i.test(subject)) composerChecks.push('Subject may look spammy.');
  if (unknownPlaceholders.length) composerChecks.push(`Unknown placeholders: ${unknownPlaceholders.map((p) => `{{${p}}}`).join(', ')}`);
  if (!columns.length) composerChecks.push('Load columns before final send for accurate placeholder matching.');

  const applyTemplate = () => {
    if (!template) return;
    const selected = CAMPAIGN_TEMPLATES[template];
    if (!selected) return;
    setSubject(selected.subject);
    setBodyHtml(selected.body);
    setMsg('Template applied.');
  };

  const runEditorCommand = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    setBodyHtml(editorRef.current?.innerHTML || '');
  };

  const insertLink = () => {
    const url = window.prompt('Enter URL');
    if (!url) return;
    runEditorCommand('createLink', url);
  };

  const titleCaseSubject = () => {
    setSubject((prev) =>
      String(prev || '')
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' '),
    );
  };

  const addNameToSubject = () => {
    setSubject((prev) => {
      if (/\{\{\s*name\s*\}\}/i.test(prev)) return prev;
      return `${String(prev || '').trim()} {{Name}}`.trim();
    });
  };

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
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--brand-text)]">Quick template</label>
          <div className="flex flex-wrap gap-2">
            <select
              className="h-[42px] min-w-[220px] rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 text-sm text-[var(--brand-text)]"
              value={template}
              onChange={(e) => setTemplate(e.target.value as CampaignTemplateKey)}
            >
              <option value="">Choose template...</option>
              <option value="welcome">Welcome / Onboarding</option>
              <option value="reminder">Reminder / Follow-up</option>
              <option value="announcement">Announcement</option>
              <option value="offer">Offer / Promotion</option>
            </select>
            <Button type="button" variant="secondary" onClick={applyTemplate}>
              Apply
            </Button>
          </div>
        </div>
        <Input label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={titleCaseSubject}>
            Title Case Subject
          </Button>
          <Button type="button" variant="secondary" onClick={addNameToSubject}>
            Add {`{{Name}}`}
          </Button>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--brand-text)]">Body (HTML)</label>
          <div className="mb-2 flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => runEditorCommand('bold')}>
              Bold
            </Button>
            <Button type="button" variant="secondary" onClick={() => runEditorCommand('italic')}>
              Italic
            </Button>
            <Button type="button" variant="secondary" onClick={() => runEditorCommand('underline')}>
              Underline
            </Button>
            <Button type="button" variant="secondary" onClick={() => runEditorCommand('insertUnorderedList')}>
              Bullet List
            </Button>
            <Button type="button" variant="secondary" onClick={() => runEditorCommand('insertOrderedList')}>
              Numbered List
            </Button>
            <Button type="button" variant="secondary" onClick={insertLink}>
              Link
            </Button>
          </div>
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            className="min-h-[200px] w-full rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[var(--brand-surface)] p-3 text-sm text-[var(--brand-text)] focus:outline-none"
            onInput={(e) => setBodyHtml((e.target as HTMLDivElement).innerHTML)}
          />
        </div>
        <p className="text-sm text-[var(--brand-muted)]">
          Composer checks: {composerChecks.length ? composerChecks.join(' ') : 'Looks good.'}
        </p>
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
