import { jsonFetch } from './shared.js';

let quill;
let campaignSample = {};

export function renderCampaignPreview() {
  const subject = String(document.getElementById('subject')?.value || '');
  const html = quill ? quill.root.innerHTML : '';
  const replace = (text) => text.replace(/\{\{([^}]+)\}\}/g, (_, k) => campaignSample[k.trim()] ?? `{{${k}}}`);
  document.getElementById('previewSubject').textContent = replace(subject);
  document.getElementById('previewBody').innerHTML = replace(html);
}

function showCampaignMessage(text, isError = false) {
  const el = document.getElementById('campaignMsg');
  if (!el) return;
  el.textContent = text || '';
  el.style.color = isError ? '#ff8f8f' : '';
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
    const select = document.getElementById('placeholderSelect');
    select.innerHTML = (data.columns || []).map((c) => `<option value="{{${c}}}">{{${c}}}</option>`).join('');
    document.getElementById('btnSend').disabled = !(data.columns || []).length;
    renderCampaignPreview();
    showCampaignMessage('Columns loaded.');
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
    await jsonFetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'send', sheetUrl, subject, bodyHtml: quill?.root?.innerHTML || '' }),
    });
    showCampaignMessage('Sending started.');
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
  const savedWebhook = localStorage.getItem('sbs_sendmails_webhook');
  if (savedWebhook) document.getElementById('webhookUrl').value = savedWebhook;
  document.getElementById('btnSaveWebhook')?.addEventListener('click', () => {
    localStorage.setItem('sbs_sendmails_webhook', document.getElementById('webhookUrl').value || '');
    showCampaignMessage('Webhook URL saved.');
  });
  document.getElementById('btnLoadColumns')?.addEventListener('click', loadColumns);
  document.getElementById('btnSend')?.addEventListener('click', startCampaign);
  document.getElementById('btnCheckStatus')?.addEventListener('click', refreshCampaignStatus);
  document.getElementById('subject')?.addEventListener('input', renderCampaignPreview);
  quill.on('text-change', renderCampaignPreview);
  document.getElementById('btnInsertPlaceholder')?.addEventListener('click', () => {
    const value = document.getElementById('placeholderSelect').value;
    const range = quill.getSelection(true);
    quill.insertText(range?.index || 0, value);
  });
  renderCampaignPreview();
}
