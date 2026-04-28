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
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('<p>Hello {{name}}</p>');
  const [template, setTemplate] = useState<CampaignTemplateKey>('');
  const [columns, setColumns] = useState<string[]>([]);
  const [sampleRow, setSampleRow] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');
  const [statusHtml, setStatusHtml] = useState('');
  const [loading, setLoading] = useState(false);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const subjectRef = useRef<HTMLInputElement | null>(null);
  const [insertToken, setInsertToken] = useState<'{{Name}}' | '{{Course}}'>('{{Name}}');
  const [textColor, setTextColor] = useState('#1f2937');

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
        body: JSON.stringify({ action: 'send', sheetUrl: sheetUrl.trim(), cc: cc.trim(), subject: subject.trim(), bodyHtml }),
      });
      setMsg('Campaign dispatch started.');
      void refreshStatus();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Send failed');
    } finally {
      setLoading(false);
    }
  };

  const stopCampaign = async () => {
    setLoading(true);
    setMsg('');
    try {
      await jsonFetch(webhook.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop', sheetUrl: sheetUrl.trim() }),
      });
      setMsg('Stop requested. Current automation run will halt before the next email.');
      void refreshStatus();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Stop failed');
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

  const insertIntoSubject = (token: '{{Name}}' | '{{Course}}') => {
    const input = subjectRef.current;
    if (!input) {
      setSubject((prev) => `${String(prev || '').trim()} ${token}`.trim());
      return;
    }
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? start;
    const next = `${input.value.slice(0, start)}${token}${input.value.slice(end)}`;
    setSubject(next);
    requestAnimationFrame(() => {
      input.focus();
      const cursor = start + token.length;
      input.setSelectionRange(cursor, cursor);
    });
  };

  const insertIntoBody = (token: '{{Name}}' | '{{Course}}') => {
    editorRef.current?.focus();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      setBodyHtml((prev) => `${String(prev || '').trim()} ${token}`.trim());
      return;
    }
    const range = selection.getRangeAt(0);
    range.deleteContents();
    const node = document.createTextNode(token);
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    setBodyHtml(editorRef.current?.innerHTML || '');
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
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--brand-text)]">Connection Settings</h2>
          <p className="text-xs text-[var(--brand-muted)]">Figma-style grouped controls</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Webhook URL (n8n)" value={webhook} onChange={(e) => setWebhook(e.target.value)} />
          <Input label="Google Sheet URL" value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={saveWebhook}>
            Save webhook locally
          </Button>
          <Button type="button" variant="secondary" loading={loading} onClick={() => void previewColumns()}>
            Load columns
          </Button>
          <Button type="button" variant="secondary" onClick={() => void refreshStatus()}>
            Check status
          </Button>
        </div>
        {columns.length ? <p className="text-sm text-[var(--brand-muted)]">Columns: {columns.join(', ')}</p> : null}
        {msg ? <p className="text-sm text-[var(--brand-text)]">{msg}</p> : null}
        {statusHtml ? <p className="text-sm text-[var(--brand-muted)]">{statusHtml}</p> : null}
      </Card>

      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--brand-text)]">Composer</h2>
          <p className="text-xs text-[var(--brand-muted)]">Template, insert, and formatting tools</p>
        </div>
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
        <Input ref={subjectRef} label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
        <Input
          label="CC (optional)"
          value={cc}
          onChange={(e) => setCc(e.target.value)}
          placeholder="manager@example.com, team@example.com"
          helpText="You can add one or multiple emails separated by comma."
        />
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={titleCaseSubject}>
            Title Case Subject
          </Button>
          <Button type="button" variant="secondary" onClick={addNameToSubject}>
            Add {`{{Name}}`}
          </Button>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--brand-text)]">Insert options</label>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="h-[42px] min-w-[200px] rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 text-sm text-[var(--brand-text)]"
              value={insertToken}
              onChange={(e) => setInsertToken(e.target.value as '{{Name}}' | '{{Course}}')}
            >
              <option value="{{Name}}">Name ({'{{Name}}'})</option>
              <option value="{{Course}}">Course ({'{{Course}}'})</option>
            </select>
            <Button type="button" variant="secondary" onClick={() => insertIntoSubject(insertToken)}>
              Add to Subject
            </Button>
            <Button type="button" variant="secondary" onClick={() => insertIntoBody(insertToken)}>
              Add to Body
            </Button>
          </div>
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
            <label className="inline-flex items-center gap-2 rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-sm text-[var(--brand-text)]">
              Text color
              <input
                type="color"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                className="h-7 w-10 cursor-pointer rounded border border-[var(--brand-border)] bg-transparent p-0"
                aria-label="Choose text color"
              />
            </label>
            <Button type="button" variant="secondary" onClick={() => runEditorCommand('foreColor', textColor)}>
              Apply color
            </Button>
          </div>
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            className="min-h-[200px] w-full rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[var(--brand-surface)] p-3 text-sm text-[#1f2937] focus:outline-none"
            onInput={(e) => setBodyHtml((e.target as HTMLDivElement).innerHTML)}
          />
        </div>
        <p className="text-sm text-[var(--brand-muted)]">
          Composer checks: {composerChecks.length ? composerChecks.join(' ') : 'Looks good.'} Use insert options for {`{{Name}}`} and {`{{Course}}`}.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" loading={loading} onClick={() => void sendCampaign()} disabled={!subject.trim()}>
            Start send
          </Button>
          <Button type="button" variant="danger" loading={loading} onClick={() => void stopCampaign()}>
            Stop automation
          </Button>
        </div>
      </Card>

      <Card>
        <h2 className="mb-2 text-lg font-semibold text-[var(--brand-text)]">Preview</h2>
        <p className="text-sm font-medium text-[var(--brand-text)]">{replacePlaceholders(subject)}</p>
        <div
          className="prose prose-invert mt-2 max-w-none text-sm text-[var(--brand-muted)]"
          dangerouslySetInnerHTML={{ __html: replacePlaceholders(bodyHtml) }}
        />
      </Card>
    </div>
  );
}
