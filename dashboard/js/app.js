(function () {
  const AUTH_TOKEN = 'sbs_token';
  const AUTH_ROLE = 'sbs_role';
  const AUTH_USER = 'sbs_username';

  const authToken = localStorage.getItem(AUTH_TOKEN);
  const authRole = localStorage.getItem(AUTH_ROLE);
  const authUsername = localStorage.getItem(AUTH_USER);

  const loginScreen = document.getElementById('login-screen');
  const appEl = document.getElementById('app');
  const loginError = document.getElementById('loginError');

  const loggedInUserEl = document.getElementById('loggedInUser');
  if (loggedInUserEl && authUsername) loggedInUserEl.textContent = `${authUsername} (${authRole || 'user'})`;

  function showLogin() {
    loginScreen.classList.add('visible');
    appEl.classList.add('hidden');
  }

  function showApp() {
    loginScreen.classList.remove('visible');
    appEl.classList.remove('hidden');
  }

  function getAuthHeaders() {
    const tok = localStorage.getItem(AUTH_TOKEN);
    return tok ? { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
  }

  async function jsonFetch(url, options = {}) {
    const res = await fetch(url, options);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const parts = [data.error, data.hint, data.details].filter(Boolean);
      const msg = parts.length ? parts.join(' — ') : `Request failed (${res.status})`;
      throw new Error(msg);
    }
    return data;
  }

  async function bootAuth() {
    if (!authToken || !authRole) {
      showLogin();
      return;
    }
    showApp();
    applyRoleVisibility();
    initShell();
    initCampaigns();
    initOperations();
    initTraining();
    initAdmin();
  }

  document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = String(document.getElementById('loginUsername').value || '').trim();
    const password = String(document.getElementById('loginPassword').value || '');
    loginError.textContent = '';
    if (!username || !password) return;
    try {
      const data = await jsonFetch('/.netlify/functions/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      localStorage.setItem(AUTH_TOKEN, data.token);
      localStorage.setItem(AUTH_ROLE, data.role);
      localStorage.setItem(AUTH_USER, data.username || username);
      window.location.reload();
    } catch (err) {
      loginError.textContent = err.message || 'Login failed';
    }
  });

  document.getElementById('btnLogout')?.addEventListener('click', () => {
    localStorage.removeItem(AUTH_TOKEN);
    localStorage.removeItem(AUTH_ROLE);
    localStorage.removeItem(AUTH_USER);
    localStorage.removeItem('sbs_sendmails_webhook');
    window.location.reload();
  });

  function applyRoleVisibility() {
    const role = localStorage.getItem(AUTH_ROLE) || 'user';
    const adminItem = document.getElementById('menuAdmin');
    const campaignsItem = document.getElementById('menuCampaigns');
    if (adminItem) adminItem.style.display = role === 'admin' ? '' : 'none';
    if (campaignsItem) campaignsItem.style.display = ['admin', 'staff', 'user'].includes(role) ? '' : 'none';
  }

  function initShell() {
    const buttons = Array.from(document.querySelectorAll('.menu-item'));
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const view = btn.getAttribute('data-view');
        buttons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
        document.getElementById(`view-${view}`)?.classList.add('active');
        if (view === 'admin') loadUsers();
      });
    });
  }

  // -------------------------
  // Operations Data (Workbook entities)
  // -------------------------
  const entitySchema = {
    trainees: {
      title: 'Trainee Records',
      fields: [
        { key: 'trainee_id', label: 'Trainee ID', required: true },
        { key: 'full_name', label: 'Full Name' },
        { key: 'email', label: 'Email' },
        { key: 'phone', label: 'Phone' },
        { key: 'trainee_type', label: 'Type' },
        { key: 'company_name', label: 'Company Name' },
        { key: 'job_title', label: 'Job Title' },
        { key: 'university', label: 'University' },
        { key: 'specialty', label: 'Specialty' },
        { key: 'city', label: 'City' },
        { key: 'created_date', label: 'Created Date' },
        { key: 'status', label: 'Status' },
        { key: 'notes', label: 'Notes' },
      ],
      list: ['trainee_id', 'full_name', 'email', 'phone', 'trainee_type', 'city'],
    },
    courses: {
      title: 'Course Records',
      fields: [
        { key: 'course_id', label: 'Course ID', required: true },
        { key: 'course_name', label: 'Course Name', required: true },
        { key: 'category', label: 'Category' },
        { key: 'target_audience', label: 'Target Audience' },
        { key: 'duration_hours', label: 'Duration Hours' },
        { key: 'delivery_type', label: 'Delivery Type' },
        { key: 'price', label: 'Price' },
        { key: 'description', label: 'Description' },
        { key: 'status', label: 'Status' },
      ],
      list: ['course_id', 'course_name', 'category', 'delivery_type', 'price', 'status'],
    },
    batches: {
      title: 'Batch Records',
      fields: [
        { key: 'batch_id', label: 'Batch ID', required: true },
        { key: 'course_id', label: 'Course ID' },
        { key: 'batch_name', label: 'Batch Name' },
        { key: 'trainer', label: 'Trainer' },
        { key: 'location', label: 'Location' },
        { key: 'capacity', label: 'Capacity' },
        { key: 'start_date', label: 'Start Date' },
        { key: 'end_date', label: 'End Date' },
      ],
      list: ['batch_id', 'course_id', 'batch_name', 'trainer', 'location', 'capacity', 'start_date', 'end_date'],
    },
    enrollments: {
      title: 'Enrollment Records',
      fields: [
        { key: 'enrollment_id', label: 'Enrollment ID', required: true },
        { key: 'trainee_id', label: 'Trainee ID', required: true },
        { key: 'batch_id', label: 'Batch ID', required: true },
        { key: 'enrollment_status', label: 'Enrollment Status' },
        { key: 'payment_status', label: 'Payment Status' },
        { key: 'amount_paid', label: 'Amount Paid' },
        { key: 'certificate_issued', label: 'Certificate Issued' },
        { key: 'enroll_date', label: 'Enroll Date' },
        { key: 'notes', label: 'Notes' },
      ],
      list: ['enrollment_id', 'trainee_id', 'batch_id', 'enrollment_status', 'payment_status', 'amount_paid'],
    },
  };
  const entityRows = [];

  function currentEntity() {
    return String(document.getElementById('entitySelect')?.value || 'enrollments');
  }

  function renderEntityForm() {
    const entity = currentEntity();
    const cfg = entitySchema[entity];
    const wrap = document.getElementById('dynamicFields');
    const title = document.getElementById('entityTableTitle');
    if (!cfg || !wrap) return;
    title.textContent = cfg.title;
    wrap.innerHTML = cfg.fields
      .map((f) => `
      <div>
        <label for="fld_${f.key}">${f.label}</label>
        <input id="fld_${f.key}" ${f.required ? 'required' : ''} />
      </div>`)
      .join('');
  }

  function renderEntityTable() {
    const entity = currentEntity();
    const cfg = entitySchema[entity];
    const head = document.getElementById('entityHeadRow');
    const body = document.getElementById('entityBody');
    if (!cfg || !head || !body) return;
    head.innerHTML = cfg.list.map((k) => `<th>${k}</th>`).join('') + '<th>Actions</th>';
    body.innerHTML = '';
    entityRows.forEach((row) => {
      const tr = document.createElement('tr');
      tr.innerHTML =
        cfg.list.map((k) => `<td>${row[k] ?? ''}</td>`).join('') +
        `<td><button class="btn btn-secondary btn-edit-row" data-id="${row.id}">Edit</button> <button class="btn btn-secondary btn-del-row" data-id="${row.id}">Delete</button></td>`;
      body.appendChild(tr);
    });
    body.querySelectorAll('.btn-edit-row').forEach((b) => b.addEventListener('click', () => fillEntityForm(b.getAttribute('data-id'))));
    body.querySelectorAll('.btn-del-row').forEach((b) => b.addEventListener('click', () => deleteEntityRow(b.getAttribute('data-id'))));
  }

  function fillEntityForm(id) {
    const row = entityRows.find((r) => String(r.id) === String(id));
    const cfg = entitySchema[currentEntity()];
    if (!row || !cfg) return;
    document.getElementById('recordInternalId').value = row.id || '';
    cfg.fields.forEach((f) => {
      const el = document.getElementById(`fld_${f.key}`);
      if (el) el.value = row[f.key] ?? '';
    });
  }

  async function loadEntityRows() {
    const entity = currentEntity();
    const msg = document.getElementById('entityMsg');
    try {
      const data = await jsonFetch(`/.netlify/functions/operations-data?entity=${encodeURIComponent(entity)}`, { headers: getAuthHeaders() });
      entityRows.length = 0;
      (data.items || []).forEach((r) => entityRows.push(r));
      renderEntityTable();
      if (msg) msg.textContent = `Loaded ${entityRows.length} row(s) for ${entity}.`;
    } catch (err) {
      if (msg) msg.textContent = err.message;
    }
  }

  async function deleteEntityRow(id) {
    if (!id || !confirm('Delete this row?')) return;
    const entity = currentEntity();
    const msg = document.getElementById('entityMsg');
    try {
      await jsonFetch(`/.netlify/functions/operations-data?entity=${encodeURIComponent(entity)}&id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      await loadEntityRows();
      if (msg) msg.textContent = 'Row deleted.';
    } catch (err) {
      if (msg) msg.textContent = err.message;
    }
  }

  function readEntityPayload() {
    const cfg = entitySchema[currentEntity()];
    const payload = {};
    cfg.fields.forEach((f) => {
      const el = document.getElementById(`fld_${f.key}`);
      payload[f.key] = el ? el.value : '';
    });
    const id = document.getElementById('recordInternalId').value;
    if (id) payload.id = id;
    return payload;
  }

  function resetEntityForm() {
    document.getElementById('recordInternalId').value = '';
    const cfg = entitySchema[currentEntity()];
    cfg.fields.forEach((f) => {
      const el = document.getElementById(`fld_${f.key}`);
      if (el) el.value = '';
    });
  }

  const BULK_IMPORT_CHUNK = 75;

  function parseExcelToRows(arrayBuffer, entity) {
    const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
    const names = wb.SheetNames;
    if (!names.length) throw new Error('The workbook has no sheets.');
    const want = entity.replace(/_/g, '').toLowerCase();
    let sheetName = names[0];
    const match = names.find((n) => {
      const nl = String(n).replace(/[^a-z0-9]/gi, '').toLowerCase();
      return nl === want || nl.includes(want) || want.includes(nl);
    });
    if (match) sheetName = match;
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
    return rows.map((row) => {
      const o = {};
      Object.keys(row).forEach((k) => {
        let v = row[k];
        if (v instanceof Date && !Number.isNaN(v.getTime())) v = v.toISOString().slice(0, 10);
        o[k] = v === null || v === undefined ? '' : v;
      });
      return o;
    });
  }

  async function runExcelImport(arrayBuffer) {
    const entity = currentEntity();
    const msg = document.getElementById('entityMsg');
    if (typeof XLSX === 'undefined') {
      if (msg) msg.textContent = 'Excel library failed to load. Refresh the page and try again.';
      return;
    }
    let rows;
    try {
      rows = parseExcelToRows(arrayBuffer, entity);
    } catch (err) {
      if (msg) msg.textContent = err.message || 'Could not parse Excel file.';
      return;
    }
    if (!rows.length) {
      if (msg) msg.textContent = 'No data rows found in the selected sheet.';
      return;
    }
    if (msg) msg.textContent = `Importing ${rows.length} row(s)…`;
    let totalImported = 0;
    let totalFailed = 0;
    const errorSamples = [];
    for (let offset = 0; offset < rows.length; offset += BULK_IMPORT_CHUNK) {
      const chunk = rows.slice(offset, offset + BULK_IMPORT_CHUNK);
      try {
        const data = await jsonFetch(
          `/.netlify/functions/operations-data?entity=${encodeURIComponent(entity)}&bulk=1`,
          {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ items: chunk }),
          },
        );
        totalImported += data.imported || 0;
        totalFailed += data.failed || 0;
        if (data.errors && data.errors.length) {
          data.errors.forEach((e) => {
            if (errorSamples.length < 8) {
              errorSamples.push(`row ${offset + e.index + 1}: ${e.message}`);
            }
          });
        }
      } catch (err) {
        if (msg) msg.textContent = err.message || 'Import failed.';
        return;
      }
    }
    let text = `Imported ${totalImported} row(s).`;
    if (totalFailed) text += ` ${totalFailed} row(s) failed validation.`;
    if (errorSamples.length) text += ` Examples: ${errorSamples.join('; ')}`;
    await loadEntityRows();
    if (msg) msg.textContent = text;
  }

  function initOperations() {
    renderEntityForm();
    document.getElementById('entitySelect')?.addEventListener('change', () => {
      renderEntityForm();
      resetEntityForm();
      loadEntityRows();
    });
    document.getElementById('btnLoadEntity')?.addEventListener('click', loadEntityRows);
    document.getElementById('btnRefreshEnrollments')?.addEventListener('click', loadEntityRows);
    document.getElementById('btnResetRecord')?.addEventListener('click', resetEntityForm);
    document.getElementById('entityRecordForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const entity = currentEntity();
      const msg = document.getElementById('entityMsg');
      const payload = readEntityPayload();
      try {
        await jsonFetch(`/.netlify/functions/operations-data?entity=${encodeURIComponent(entity)}`, {
          method: payload.id ? 'PUT' : 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        });
        resetEntityForm();
        await loadEntityRows();
        if (msg) msg.textContent = 'Record saved.';
      } catch (err) {
        if (msg) msg.textContent = err.message;
      }
    });
    document.getElementById('excelImportFile')?.addEventListener('change', async (e) => {
      const f = e.target.files && e.target.files[0];
      e.target.value = '';
      if (!f) return;
      const name = f.name || '';
      if (!/\.xlsx$/i.test(name)) {
        const msg = document.getElementById('entityMsg');
        if (msg) msg.textContent = 'Please choose a .xlsx file.';
        return;
      }
      const buf = await f.arrayBuffer();
      await runExcelImport(buf);
    });
    loadEntityRows();
  }

  // -------------------------
  // Campaigns (n8n)
  // -------------------------
  let quill;
  let campaignSample = {};

  function renderCampaignPreview() {
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

  function initCampaigns() {
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

  // -------------------------
  // Training Groups
  // -------------------------
  let trainingState = {
    groupId: null,
    participantId: null,
    senderName: null,
    channel: null,
    supabase: null,
  };

  function appendChatMessage(m) {
    const box = document.getElementById('chatMessages');
    const line = document.createElement('div');
    line.className = 'chat-line';
    const ts = new Date(m.created_at || Date.now()).toLocaleTimeString();
    line.innerHTML = `<div class="meta">${m.sender_name || 'User'} • ${ts}</div><div>${m.body || ''}</div>`;
    box.appendChild(line);
    box.scrollTop = box.scrollHeight;
  }

  async function loadRecentMessages() {
    if (!trainingState.groupId) return;
    const data = await jsonFetch(`/.netlify/functions/training-messages?groupId=${encodeURIComponent(trainingState.groupId)}`);
    const box = document.getElementById('chatMessages');
    box.innerHTML = '';
    (data.messages || []).forEach(appendChatMessage);
  }

  async function initRealtime() {
    try {
      const cfg = await jsonFetch('/.netlify/functions/public-config');
      if (!cfg.realtimeEnabled || !window.supabase) return;
      trainingState.supabase = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
      trainingState.channel = trainingState.supabase
        .channel(`group-${trainingState.groupId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'training_messages', filter: `group_id=eq.${trainingState.groupId}` }, (payload) => {
          appendChatMessage(payload.new);
        })
        .subscribe();
    } catch (_) {
      // keep polling fallback only
    }
  }

  async function joinByTokenFlow(token) {
    const panel = document.getElementById('joinPanel');
    panel.classList.remove('hidden');
    const joinData = await jsonFetch(`/.netlify/functions/training-join?token=${encodeURIComponent(token)}`);
    document.getElementById('joinHeading').textContent = `${joinData.sessionTitle} — Group ${joinData.groupNumber}`;
    document.getElementById('joinForm').onsubmit = async (e) => {
      e.preventDefault();
      const displayName = String(document.getElementById('joinName').value || '').trim();
      if (!displayName) return;
      const joined = await jsonFetch(`/.netlify/functions/training-join?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName }),
      });
      trainingState.groupId = joined.groupId;
      trainingState.participantId = joined.participant.id;
      trainingState.senderName = joined.participant.display_name;
      panel.classList.add('hidden');
      document.getElementById('chatPanel').classList.remove('hidden');
      await loadRecentMessages();
      await initRealtime();
      setInterval(loadRecentMessages, 10000);
    };
  }

  async function initTraining() {
    const query = new URLSearchParams(window.location.search);
    const token = query.get('group');
    if (token) {
      document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
      document.getElementById('view-training').classList.add('active');
      document.querySelectorAll('.menu-item').forEach((m) => m.classList.remove('active'));
      await joinByTokenFlow(token);
    }

    document.getElementById('trainingSessionForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = String(document.getElementById('trainingTitle').value || '').trim();
      const groupsCount = Number(document.getElementById('groupsCount').value || 4);
      if (!title) return;
      const msg = document.getElementById('trainingMsg');
      const links = document.getElementById('trainingLinks');
      try {
        const data = await jsonFetch('/.netlify/functions/training-sessions', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ title, groupsCount }),
        });
        const base = `${window.location.origin}${window.location.pathname}`;
        links.innerHTML = `<h4>Session Links</h4>${(data.groups || []).map((g) => (
          `<p>Group ${g.group_number}: <a href="${base}?group=${g.join_token}" target="_blank" rel="noopener">${base}?group=${g.join_token}</a></p>`
        )).join('')}`;
        msg.textContent = 'Session created.';
      } catch (err) {
        msg.textContent = err.message;
      }
    });

    document.getElementById('chatForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = document.getElementById('chatInput');
      const body = String(input.value || '').trim();
      if (!body || !trainingState.groupId) return;
      try {
        const sent = await jsonFetch('/.netlify/functions/training-messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            groupId: trainingState.groupId,
            participantId: trainingState.participantId,
            senderName: trainingState.senderName || authUsername || 'User',
            body,
          }),
        });
        if (!trainingState.channel) appendChatMessage(sent.message);
        input.value = '';
      } catch (_) {
        // no-op
      }
    });
  }

  // -------------------------
  // Admin
  // -------------------------
  async function loadUsers() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    try {
      const data = await jsonFetch('/.netlify/functions/list-users', { headers: getAuthHeaders() });
      const users = data.users || [];
      users.forEach((u) => {
        const tr = document.createElement('tr');
        const canDelete = u.role !== 'admin' && u.username !== authUsername;
        tr.innerHTML = `
          <td>${u.username}</td>
          <td>${u.role}</td>
          <td>
            <button class="btn btn-secondary btn-reset" data-user="${u.username}">Reset password</button>
            ${canDelete ? `<button class="btn btn-secondary btn-del" data-user="${u.username}">Delete</button>` : ''}
          </td>
        `;
        tbody.appendChild(tr);
      });
      tbody.querySelectorAll('.btn-reset').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const username = btn.getAttribute('data-user');
          const newPassword = prompt(`New password for ${username}:`);
          if (!newPassword || newPassword.length < 4) return;
          await jsonFetch('/.netlify/functions/reset-password', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ username, newPassword }),
          });
          document.getElementById('createUserMsg').textContent = 'Password updated.';
        });
      });
      tbody.querySelectorAll('.btn-del').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const username = btn.getAttribute('data-user');
          if (!confirm(`Delete ${username}?`)) return;
          await jsonFetch('/.netlify/functions/delete-user', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ username }),
          });
          loadUsers();
        });
      });
    } catch (err) {
      document.getElementById('createUserMsg').textContent = err.message;
    }
  }

  function initAdmin() {
    document.getElementById('createUserForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = String(document.getElementById('newUsername').value || '').trim();
      const password = String(document.getElementById('newPassword').value || '');
      if (!username || !password) return;
      try {
        await jsonFetch('/.netlify/functions/create-user', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ username, password }),
        });
        document.getElementById('createUserMsg').textContent = 'User added.';
        document.getElementById('createUserForm').reset();
        loadUsers();
      } catch (err) {
        document.getElementById('createUserMsg').textContent = err.message;
      }
    });
  }

  bootAuth();
})();