import { jsonFetch } from './shared.js';

let quill;
let campaignSample = {};
let campaignColumns = [];
const DEFAULT_WEBHOOK_URL = 'https://n8n.growleadpro.com/webhook/sendmails-sbs';
const DEFAULT_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/1sUUpVcRs5tE1KzNGaVA4cnQShvr1eI1bvkO44jAsKtI/edit?gid=0#gid=0';
const WEBHOOK_STORAGE_KEY = 'sbs_sendmails_webhook';
const SHEET_STORAGE_KEY = 'sbs_sendmails_sheet_url';
const CAMPAIGN_TEMPLATES = {
  welcome: {
    subject: 'Welcome {{Name}} to SBS',
    body: '<p>Hello {{Name}},</p><p>Welcome to SBS. We are excited to have you with us.</p><p>Best regards,<br/>SBS Team</p>',
  },
  reminder: {
    subject: 'Reminder for {{Name}}',
    body: '<p>Hello {{Name}},</p><p>This is a friendly reminder about your upcoming item.</p><p>Please reply if you need any help.</p>',
  },
  announcement: {
    subject: 'Important update for {{Name}}',
    body: '<p>Hello {{Name}},</p><p>We have an important update to share with you.</p><p>Thank you for your attention.</p>',
  },
  offer: {
    subject: 'Special offer for {{Name}}',
    body: '<p>Hello {{Name}},</p><p>We prepared a special offer for you.</p><p>Contact us to learn more details.</p>',
  },
};

export function renderCampaignPreview() {
  const subject = String(document.getElementById('subject')?.value || '');
  const html = quill ? quill.root.innerHTML : '';
  const replace = (text) => text.replace(/\{\{([^}]+)\}\}/g, (_, k) => campaignSample[k.trim()] ?? `{{${k}}}`);
  document.getElementById('previewSubject').textContent = replace(subject);
  document.getElementById('previewBody').innerHTML = replace(html);
  renderComposerHints();
}

function showCampaignMessage(text, isError = false) {
  const el = document.getElementById('campaignMsg');
  if (!el) return;
  el.textContent = text || '';
  el.style.color = isError ? '#ff8f8f' : '';
}

function resolveColumnToken(rawToken) {
  const token = String(rawToken || '').trim();
  if (!token) return '';
  const lower = token.toLowerCase();
  const exactFromColumns = campaignColumns.find((c) => String(c || '').trim().toLowerCase() === lower);
  if (exactFromColumns) return exactFromColumns;
  const exactFromSample = Object.keys(campaignSample || {}).find((k) => String(k || '').trim().toLowerCase() === lower);
  return exactFromSample || token;
}

function normalizePlaceholders(text) {
  return String(text || '').replace(/\{\{([^}]+)\}\}/g, (_, key) => `{{${resolveColumnToken(key)}}}`);
}

function extractPlaceholders(text) {
  const raw = String(text || '');
  const matches = [...raw.matchAll(/\{\{([^}]+)\}\}/g)].map((m) => String(m[1] || '').trim()).filter(Boolean);
  return [...new Set(matches)];
}

function toTitleCase(input) {
  return String(input || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function renderComposerHints() {
  const host = document.getElementById('campaignComposerHints');
  if (!host) return;
  const subject = String(document.getElementById('subject')?.value || '').trim();
  const bodyHtml = quill?.root?.innerHTML || '';
  const allPlaceholders = [...extractPlaceholders(subject), ...extractPlaceholders(bodyHtml)];
  const unknown = [...new Set(allPlaceholders.filter((p) => resolveColumnToken(p) === p && !campaignColumns.some((c) => String(c).trim() === p)))];
  const tips = [];
  if (!subject) tips.push('Subject is empty.');
  if (subject.length > 70) tips.push('Subject is long (recommended under 70 characters).');
  if (/(free|urgent|act now|guarantee|winner|100%)/i.test(subject)) tips.push('Subject may look spammy. Keep it natural.');
  if (unknown.length) tips.push(`Unknown placeholders: ${unknown.map((p) => `{{${p}}}`).join(', ')}`);
  if (!campaignColumns.length) tips.push('Load columns before final send for accurate placeholder matching.');
  host.textContent = tips.length ? `Composer checks: ${tips.join(' ')}` : 'Composer checks: Looks good.';
}

function applyTemplate() {
  const key = String(document.getElementById('campaignTemplateSelect')?.value || '').trim();
  const tpl = CAMPAIGN_TEMPLATES[key];
  if (!tpl || !quill) return;
  const subjectInput = document.getElementById('subject');
  if (subjectInput) subjectInput.value = tpl.subject;
  quill.root.innerHTML = tpl.body;
  renderCampaignPreview();
  showCampaignMessage('Template applied.');
}

async function loadColumns() {
  const webhook = String(document.getElementById('webhookUrl').value || '').trim();
  const sheetUrl = String(document.getElementById('sheetUrl').value || '').trim();
  if (!webhook || !sheetUrl) return showCampaignMessage('Webhook URL and sheet URL are required.', true);
  try {
    const data = await jsonFetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'preview', sheetUrl }),
    });
    const chips = document.getElementById('columnsChips');
    const head = document.getElementById('sampleTableHead');
    const body = document.getElementById('sampleTableBody');
    chips.innerHTML = '';
    (data.columns || []).forEach((c) => {
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = c;
      chips.appendChild(chip);
    });
    head.innerHTML = (data.columns || []).map((c) => `<th>${c}</th>`).join('');
    body.innerHTML = (data.columns || []).map((c) => `<td>${data.sampleRow?.[c] ?? ''}</td>`).join('');
    campaignSample = data.sampleRow || {};
    campaignColumns = Array.isArray(data.columns) ? data.columns : [];
    const select = document.getElementById('placeholderSelect');
    select.innerHTML = (data.columns || []).map((c) => `<option value="{{${c}}}">{{${c}}}</option>`).join('');
    document.getElementById('btnSend').disabled = !(data.columns || []).length;
    renderCampaignPreview();
    showCampaignMessage('Columns loaded successfully.');
  } catch (err) {
    showCampaignMessage(err.message, true);
  }
}

async function startCampaign() {
  const webhook = String(document.getElementById('webhookUrl').value || '').trim();
  const sheetUrl = String(document.getElementById('sheetUrl').value || '').trim();
  const subject = String(document.getElementById('subject').value || '').trim();
  if (!webhook || !sheetUrl || !subject) return showCampaignMessage('Webhook URL, sheet URL, and subject are required.', true);
  try {
    const normalizedSubject = normalizePlaceholders(subject);
    const normalizedBody = normalizePlaceholders(quill?.root?.innerHTML || '');
    await jsonFetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'send', sheetUrl, subject: normalizedSubject, bodyHtml: normalizedBody }),
    });
    showCampaignMessage('Campaign dispatch started.');
    refreshCampaignStatus();
  } catch (err) {
    showCampaignMessage(err.message, true);
  }
}

async function refreshCampaignStatus() {
  const webhook = String(document.getElementById('webhookUrl').value || '').trim();
  const sheetUrl = String(document.getElementById('sheetUrl').value || '').trim();
  if (!webhook || !sheetUrl) return;
  try {
    const data = await jsonFetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'status', sheetUrl }),
    });
    const statusGrid = document.getElementById('statusGrid');
    statusGrid.innerHTML = `
        <div class="stat"><span class="k">Sent</span><span class="v">${data.sent ?? '-'}</span></div>
        <div class="stat"><span class="k">Pending</span><span class="v">${data.pending ?? '-'}</span></div>
        <div class="stat"><span class="k">Last Sent Row</span><span class="v">${data.lastSentRow ?? '-'}</span></div>
        <div class="stat"><span class="k">Next Row</span><span class="v">${data.nextRowToSend ?? '-'}</span></div>
      `;
    document.getElementById('statusError').textContent = '';
  } catch (err) {
    document.getElementById('statusError').textContent = err.message;
  }
}

export function initCampaigns() {
  quill = new Quill('#editor-wrap', { theme: 'snow', placeholder: 'Write your email body...' });
  const webhookInput = document.getElementById('webhookUrl');
  const sheetInput = document.getElementById('sheetUrl');
  const savedWebhook = String(localStorage.getItem(WEBHOOK_STORAGE_KEY) || '').trim();
  const savedSheetUrl = String(localStorage.getItem(SHEET_STORAGE_KEY) || '').trim();

  if (webhookInput) {
    webhookInput.value = savedWebhook || webhookInput.value || DEFAULT_WEBHOOK_URL;
  }
  if (sheetInput) {
    sheetInput.value = savedSheetUrl || sheetInput.value || DEFAULT_SHEET_URL;
  }

  document.getElementById('btnSaveWebhook')?.addEventListener('click', () => {
    const webhookValue = String(document.getElementById('webhookUrl')?.value || '').trim();
    const sheetValue = String(document.getElementById('sheetUrl')?.value || '').trim();
    localStorage.setItem(WEBHOOK_STORAGE_KEY, webhookValue || DEFAULT_WEBHOOK_URL);
    localStorage.setItem(SHEET_STORAGE_KEY, sheetValue || DEFAULT_SHEET_URL);
    showCampaignMessage('Webhook and sheet URL saved successfully.');
  });
  document.getElementById('btnLoadColumns')?.addEventListener('click', loadColumns);
  document.getElementById('btnSend')?.addEventListener('click', startCampaign);
  document.getElementById('btnCheckStatus')?.addEventListener('click', refreshCampaignStatus);
  document.getElementById('subject')?.addEventListener('input', renderCampaignPreview);
  quill.on('text-change', renderCampaignPreview);
  document.getElementById('btnApplyTemplate')?.addEventListener('click', applyTemplate);
  document.getElementById('btnSubjectTitleCase')?.addEventListener('click', () => {
    const input = document.getElementById('subject');
    if (!input) return;
    input.value = toTitleCase(input.value);
    renderCampaignPreview();
  });
  document.getElementById('btnSubjectAddName')?.addEventListener('click', () => {
    const input = document.getElementById('subject');
    if (!input) return;
    if (!/\{\{\s*name\s*\}\}/i.test(input.value)) {
      input.value = `${String(input.value || '').trim()} {{Name}}`.trim();
      renderCampaignPreview();
    }
  });
  document.getElementById('btnInsertPlaceholder')?.addEventListener('click', () => {
    const value = document.getElementById('placeholderSelect').value;
    const range = quill.getSelection(true);
    quill.insertText(range?.index || 0, value);
  });
  renderCampaignPreview();
}
