import { getAuthHeaders, jsonFetch, showToast } from './shared.js';

function value(id) {
  return String(document.getElementById(id)?.value || '').trim();
}

function renderList(items) {
  const host = document.getElementById('credentialRows');
  if (!host) return;
  host.innerHTML = '';
  if (!items.length) {
    host.innerHTML = '<tr><td colspan="7" class="muted">No credentials found.</td></tr>';
    return;
  }
  items.forEach((item) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.certificate_no || '—'}</td>
      <td>${item.trainee_id || '—'}</td>
      <td>${item.course_id || '—'}</td>
      <td>${item.status || '—'}</td>
      <td>${item.issued_at ? new Date(item.issued_at).toLocaleString() : '—'}</td>
      <td>${item.verification_token || '—'}</td>
      <td>
        <button type="button" class="btn btn-secondary btn-sm" data-revoke="${item.id}">Revoke</button>
      </td>
    `;
    host.appendChild(tr);
  });
}

async function loadCredentials() {
  const msg = document.getElementById('credentialsMsg');
  if (msg) msg.textContent = 'Loading credentials...';
  try {
    const data = await jsonFetch('/.netlify/functions/credential-center?resource=credentials', {
      headers: getAuthHeaders(),
    });
    renderList(data.items || []);
    if (msg) msg.textContent = '';
  } catch (err) {
    if (msg) msg.textContent = err.message || 'Could not load credentials.';
  }
}

async function loadTemplates() {
  const list = document.getElementById('credentialTemplateId');
  if (!list) return;
  try {
    const data = await jsonFetch('/.netlify/functions/credential-center?resource=templates', {
      headers: getAuthHeaders(),
    });
    list.innerHTML = '<option value="">None</option>';
    (data.items || []).forEach((item) => {
      const opt = document.createElement('option');
      opt.value = item.id;
      opt.textContent = `${item.template_name} (${item.template_code})`;
      list.appendChild(opt);
    });
  } catch (_) {
    list.innerHTML = '<option value="">None</option>';
  }
}

async function loadAnalytics() {
  const el = document.getElementById('credentialAnalyticsSummary');
  if (!el) return;
  try {
    const data = await jsonFetch('/.netlify/functions/credential-center?resource=analytics', {
      headers: getAuthHeaders(),
    });
    const latest = (data.funnel || [])[0];
    if (!latest) {
      el.textContent = 'No analytics yet.';
      return;
    }
    el.textContent = `Latest day: issued ${latest.issued_count}, shared ${latest.shared_count}, verified ${latest.verified_count}`;
  } catch (err) {
    el.textContent = err.message || 'Could not load analytics.';
  }
}

function bindIssueForm() {
  const form = document.getElementById('credentialIssueForm');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      trainee_id: value('credentialTraineeId'),
      course_id: value('credentialCourseId'),
      certificate_no: value('credentialNo'),
      batch_id: value('credentialBatchId') || null,
      template_id: value('credentialTemplateId') || null,
      metadata: { skills: value('credentialSkills') },
    };
    try {
      await jsonFetch('/.netlify/functions/credential-center?resource=issue', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      showToast('Credential issued successfully.', 'success');
      form.reset();
      await loadCredentials();
      await loadAnalytics();
    } catch (err) {
      showToast(err.message || 'Could not issue credential.', 'error');
    }
  });
}

function bindTemplateForm() {
  const form = document.getElementById('credentialTemplateForm');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      template_code: value('templateCode'),
      template_name: value('templateName'),
      credential_type: value('templateType') || 'certificate',
      template_schema: {
        fields: ['learner_name', 'course_name', 'issue_date'],
      },
    };
    try {
      await jsonFetch('/.netlify/functions/credential-center?resource=templates', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      showToast('Template created.', 'success');
      form.reset();
      await loadTemplates();
    } catch (err) {
      showToast(err.message || 'Could not create template.', 'error');
    }
  });
}

function bindBulkIssueForm() {
  const form = document.getElementById('credentialBulkIssueForm');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const csv = value('credentialBulkCsv');
    try {
      const data = await jsonFetch('/.netlify/functions/credential-center?resource=bulk-issue', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ csv }),
      });
      showToast(`Bulk issued ${data.count || 0} credentials.`, 'success');
      await loadCredentials();
      await loadAnalytics();
    } catch (err) {
      showToast(err.message || 'Bulk issue failed.', 'error');
    }
  });
}

function bindPathwayForm() {
  const form = document.getElementById('pathwayForm');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      pathway_code: value('pathwayCode'),
      pathway_name: value('pathwayName'),
      description: value('pathwayDescription'),
      is_public: document.getElementById('pathwayPublic')?.checked || false,
    };
    try {
      await jsonFetch('/.netlify/functions/credential-center?resource=pathways', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      showToast('Pathway saved.', 'success');
      form.reset();
    } catch (err) {
      showToast(err.message || 'Could not save pathway.', 'error');
    }
  });
}

function bindActions() {
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-revoke]');
    if (!btn) return;
    const id = String(btn.getAttribute('data-revoke') || '').trim();
    if (!id) return;
    try {
      await jsonFetch('/.netlify/functions/credential-center?resource=credentials', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id, revoke: true, status: 'revoked' }),
      });
      showToast('Credential revoked.', 'warn');
      await loadCredentials();
      await loadAnalytics();
    } catch (err) {
      showToast(err.message || 'Could not revoke credential.', 'error');
    }
  });
}

export function initCredentials() {
  bindIssueForm();
  bindTemplateForm();
  bindBulkIssueForm();
  bindPathwayForm();
  bindActions();
}

export async function loadCredentialCenter() {
  await Promise.all([loadTemplates(), loadCredentials(), loadAnalytics()]);
}
