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

  const ROLE_AREAS = {
    admin: ['operations', 'training', 'finance', 'automation', 'admin'],
    staff: ['operations', 'automation'],
    trainer: ['training'],
    user: ['automation'],
    accountant: ['finance'],
  };

  function areasForRole(role) {
    return ROLE_AREAS[role] || ROLE_AREAS.user;
  }

  let ledgerPage = 1;
  let auditPage = 1;
  let attendanceRowsCache = [];
  const LEDGER_PAGE_SIZE = 50;
  let financeChartRevenue = null;
  let financeChartMethods = null;
  let financeChartAr = null;

  function showView(viewId) {
    document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
    const el = document.getElementById(`view-${viewId}`);
    if (el) el.classList.add('active');
    if (viewId === 'admin') {
      loadUsers();
      loadFinanceAudit();
    }
    if (viewId === 'finance') refreshFinanceAll();
    if (viewId === 'operations-pipeline') loadPipeline();
    if (viewId === 'operations-capacity') loadCapacity();
    if (viewId === 'operations-quality') loadQuality();
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
    initFinance();
    initOpsInsights();
    initTrainingTools();
    initBulkEnrollment();
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
    const allowed = areasForRole(role);
    document.querySelectorAll('.area-tab').forEach((tab) => {
      const area = tab.getAttribute('data-area');
      const show = allowed.includes(area);
      tab.style.display = show ? '' : 'none';
    });
    applyFinanceWriteVisibility(role);
  }

  function applyFinanceWriteVisibility(role) {
    const canWrite = ['admin', 'accountant'].includes(role);
    ['financePaymentForm', 'invoiceEditorCard'].forEach((id) => {
      const n = document.getElementById(id);
      if (n) n.style.display = canWrite ? '' : 'none';
    });
  }

  function initShell() {
    const role = localStorage.getItem(AUTH_ROLE) || 'user';
    const allowed = areasForRole(role);

    function showSubnavForArea(area) {
      document.querySelectorAll('.subnav').forEach((s) => {
        const forArea = s.getAttribute('data-for-area');
        s.classList.toggle('hidden', forArea !== area);
      });
    }

    function activateArea(area, viewId) {
      document.querySelectorAll('.area-tab').forEach((t) => {
        t.classList.toggle('active', t.getAttribute('data-area') === area);
      });
      showSubnavForArea(area);
      const sub = document.querySelector(`.subnav[data-for-area="${area}"]`);
      if (sub) {
        sub.querySelectorAll('.subnav-item').forEach((b) => {
          const v = b.getAttribute('data-view');
          b.classList.toggle('active', v === viewId);
        });
      }
      showView(viewId);
    }

    document.querySelectorAll('.area-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        const area = tab.getAttribute('data-area');
        if (!areasForRole(role).includes(area)) return;
        const sub = document.querySelector(`.subnav[data-for-area="${area}"]`);
        const first = sub && sub.querySelector('.subnav-item');
        const viewId = first ? first.getAttribute('data-view') : area;
        activateArea(area, viewId);
      });
    });

    document.querySelectorAll('.subnav-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        const viewId = btn.getAttribute('data-view');
        const sub = btn.closest('.subnav');
        const area = sub && sub.getAttribute('data-for-area');
        if (area && !areasForRole(role).includes(area)) return;
        if (sub) sub.querySelectorAll('.subnav-item').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        if (area) {
          document.querySelectorAll('.area-tab').forEach((t) => {
            t.classList.toggle('active', t.getAttribute('data-area') === area);
          });
        }
        showView(viewId);
      });
    });

    const firstArea = allowed[0] || 'operations';
    const firstSub = document.querySelector(`.subnav[data-for-area="${firstArea}"] .subnav-item`);
    const firstView = firstSub ? firstSub.getAttribute('data-view') : 'operations-home';
    activateArea(firstArea, firstView);
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
        { key: 'company_id', label: 'Company ID (UUID)' },
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
        {
          key: 'course_id',
          label: 'Course ID',
          lookup: true,
          placeholder: 'Pick an existing course or type a new course ID',
        },
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
        {
          key: 'enrollment_id',
          label: 'Enrollment ID',
          required: true,
          lookup: true,
          autoId: true,
          placeholder: 'Pick an existing ID, type a new one, or use Generate',
        },
        {
          key: 'trainee_id',
          label: 'Trainee ID',
          required: true,
          lookup: true,
          placeholder: 'Pick an existing trainee or type a new trainee ID',
        },
        {
          key: 'batch_id',
          label: 'Batch ID',
          required: true,
          lookup: true,
          placeholder: 'Pick an existing batch or type a new batch ID',
        },
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
  const opLookups = {
    trainee_ids: [],
    batch_ids: [],
    enrollment_ids: [],
    course_ids: [],
  };

  function escapeAttr(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;');
  }

  function populateOperationsDatalists() {
    [
      ['datalist_trainee_id', opLookups.trainee_ids],
      ['datalist_batch_id', opLookups.batch_ids],
      ['datalist_enrollment_id', opLookups.enrollment_ids],
      ['datalist_course_id', opLookups.course_ids],
    ].forEach(([id, vals]) => {
      const dl = document.getElementById(id);
      if (!dl) return;
      dl.innerHTML = (vals || []).map((v) => `<option value="${escapeAttr(v)}"></option>`).join('');
    });
  }

  async function loadOperationsLookups() {
    try {
      const [tr, bat, en, cr] = await Promise.all([
        jsonFetch('/.netlify/functions/operations-data?entity=trainees', { headers: getAuthHeaders() }),
        jsonFetch('/.netlify/functions/operations-data?entity=batches', { headers: getAuthHeaders() }),
        jsonFetch('/.netlify/functions/operations-data?entity=enrollments', { headers: getAuthHeaders() }),
        jsonFetch('/.netlify/functions/operations-data?entity=courses', { headers: getAuthHeaders() }),
      ]);
      opLookups.trainee_ids = [...new Set((tr.items || []).map((r) => r.trainee_id).filter(Boolean))].sort();
      opLookups.batch_ids = [...new Set((bat.items || []).map((r) => r.batch_id).filter(Boolean))].sort();
      opLookups.enrollment_ids = [...new Set((en.items || []).map((r) => r.enrollment_id).filter(Boolean))].sort();
      opLookups.course_ids = [...new Set((cr.items || []).map((r) => r.course_id).filter(Boolean))].sort();
      populateOperationsDatalists();
    } catch (_) {
      /* leave existing datalists */
    }
  }

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
    const ph = (f) => (f.placeholder ? ` placeholder="${escapeAttr(f.placeholder)}"` : '');
    wrap.innerHTML = cfg.fields
      .map((f) => {
        if (f.lookup && f.autoId) {
          return `<div>
        <label for="fld_${f.key}">${f.label}</label>
        <div class="field-with-addon">
          <input id="fld_${f.key}" list="datalist_${f.key}" ${f.required ? 'required' : ''} autocomplete="off"${ph(
            f,
          )} />
          <button type="button" class="btn btn-secondary btn-auto-enrollment-id">Generate ID</button>
        </div>
        <datalist id="datalist_${f.key}"></datalist>
      </div>`;
        }
        if (f.lookup) {
          return `<div>
        <label for="fld_${f.key}">${f.label}</label>
        <input id="fld_${f.key}" list="datalist_${f.key}" ${f.required ? 'required' : ''} autocomplete="off"${ph(
          f,
        )} />
        <datalist id="datalist_${f.key}"></datalist>
      </div>`;
        }
        return `<div>
        <label for="fld_${f.key}">${f.label}</label>
        <input id="fld_${f.key}" ${f.required ? 'required' : ''}${ph(f)} />
      </div>`;
      })
      .join('');
    populateOperationsDatalists();
    document.querySelectorAll('.btn-auto-enrollment-id').forEach((btn) => {
      btn.addEventListener('click', () => {
        const input = document.getElementById('fld_enrollment_id');
        if (!input) return;
        const d = new Date();
        const y = d.getUTCFullYear();
        const m = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        const rnd = Math.floor(1000 + Math.random() * 9000);
        input.value = `EN-${y}${m}${day}-${rnd}`;
      });
    });
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
      await loadOperationsLookups();
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
  // Operations insights (read-only API)
  // -------------------------
  async function loadPipeline() {
    const grid = document.getElementById('pipelineGrid');
    const msg = document.getElementById('pipelineMsg');
    if (!grid) return;
    try {
      const data = await jsonFetch('/.netlify/functions/operations-data?resource=pipeline', { headers: getAuthHeaders() });
      const p = data.pipeline || {};
      grid.innerHTML = Object.keys(p)
        .map((k) => `<div class="stat"><span class="k">${k}</span><span class="v">${p[k]}</span></div>`)
        .join('');
      grid.innerHTML += `<div class="stat"><span class="k">Total</span><span class="v">${data.total ?? ''}</span></div>`;
      if (msg) msg.textContent = '';
    } catch (err) {
      if (msg) msg.textContent = err.message;
    }
  }

  async function loadCapacity() {
    const body = document.getElementById('capacityBody');
    const msg = document.getElementById('capacityMsg');
    if (!body) return;
    try {
      const data = await jsonFetch('/.netlify/functions/operations-data?resource=capacity', { headers: getAuthHeaders() });
      body.innerHTML = (data.capacity || [])
        .map(
          (r) =>
            `<tr><td>${r.batch_id ?? ''}</td><td>${r.course_id ?? ''}</td><td>${r.capacity ?? ''}</td><td>${r.enrolled ?? ''}</td><td>${r.utilization_pct != null ? `${r.utilization_pct}%` : ''}</td></tr>`,
        )
        .join('');
      if (msg) msg.textContent = '';
    } catch (err) {
      if (msg) msg.textContent = err.message;
    }
  }

  async function loadQuality() {
    const summary = document.getElementById('qualitySummary');
    const detail = document.getElementById('qualityDetail');
    const msg = document.getElementById('qualityMsg');
    try {
      const data = await jsonFetch('/.netlify/functions/operations-data?resource=data-quality', { headers: getAuthHeaders() });
      if (summary) {
        summary.innerHTML = `<p>Orphan trainee refs: <strong>${data.orphan_trainee_refs}</strong></p>
          <p>Orphan batch refs: <strong>${data.orphan_batch_refs}</strong></p>
          <p>Duplicate enrollment IDs: <strong>${data.duplicate_enrollment_ids}</strong></p>`;
      }
      if (detail) detail.textContent = JSON.stringify(data.samples || {}, null, 2);
      if (msg) msg.textContent = '';
    } catch (err) {
      if (msg) msg.textContent = err.message;
    }
  }

  function initOpsInsights() {
    document.getElementById('btnRefreshPipeline')?.addEventListener('click', loadPipeline);
    document.getElementById('btnRefreshCapacity')?.addEventListener('click', loadCapacity);
    document.getElementById('btnRefreshQuality')?.addEventListener('click', loadQuality);
  }

  // -------------------------
  // Finance
  // -------------------------
  function ledgerToCsv(items) {
    const headers = ['received_at', 'amount', 'currency', 'method', 'enrollment_id', 'trainee_id', 'reference'];
    const lines = [headers.join(',')];
    (items || []).forEach((row) => {
      const e = row.enrollments || {};
      const vals = [
        row.received_at,
        row.amount,
        row.currency,
        row.method,
        e.enrollment_id,
        e.trainee_id,
        row.reference,
      ].map((v) => {
        const s = v == null ? '' : String(v);
        return `"${s.replace(/"/g, '""')}"`;
      });
      lines.push(vals.join(','));
    });
    return lines.join('\n');
  }

  function hexToRgb(hex) {
    const h = String(hex || '').replace('#', '').trim();
    if (h.length !== 6) return { r: 0, g: 169, b: 157 };
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    };
  }

  function rgbaFromCssVar(varName, alpha) {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    if (raw.startsWith('#')) {
      const { r, g, b } = hexToRgb(raw);
      return `rgba(${r},${g},${b},${alpha})`;
    }
    return raw || `rgba(0,169,157,${alpha})`;
  }

  function destroyFinanceCharts() {
    if (financeChartRevenue) {
      financeChartRevenue.destroy();
      financeChartRevenue = null;
    }
    if (financeChartMethods) {
      financeChartMethods.destroy();
      financeChartMethods = null;
    }
    if (financeChartAr) {
      financeChartAr.destroy();
      financeChartAr = null;
    }
  }

  async function refreshFinanceCharts() {
    const msg = document.getElementById('financeChartsMsg');
    const cRev = document.getElementById('chartRevenueTrend');
    const cMeth = document.getElementById('chartPaymentMethods');
    const cAr = document.getElementById('chartArAging');
    if (!cRev || !cMeth || !cAr) return;
    if (typeof Chart === 'undefined') {
      if (msg) msg.textContent = 'Chart library failed to load.';
      return;
    }
    destroyFinanceCharts();
    if (msg) msg.textContent = 'Loading…';
    const textColor = getComputedStyle(document.documentElement).getPropertyValue('--brand-text').trim() || '#f4f3fb';
    const mutedColor = getComputedStyle(document.documentElement).getPropertyValue('--brand-muted').trim() || '#b4b0c8';
    const gridColor = 'rgba(180, 176, 200, 0.14)';
    const teal = getComputedStyle(document.documentElement).getPropertyValue('--brand-primary').trim() || '#00a99d';
    const teal2 = getComputedStyle(document.documentElement).getPropertyValue('--brand-primary-2').trim() || '#29abe2';
    const surface = getComputedStyle(document.documentElement).getPropertyValue('--brand-surface').trim() || '#161a4f';

    try {
      const [rev, meth, ar] = await Promise.all([
        jsonFetch('/.netlify/functions/finance-data?resource=chart-revenue-trend&months=6', { headers: getAuthHeaders() }),
        jsonFetch('/.netlify/functions/finance-data?resource=chart-payment-methods&days=90', { headers: getAuthHeaders() }),
        jsonFetch('/.netlify/functions/finance-data?resource=ar-aging', { headers: getAuthHeaders() }),
      ]);

      financeChartRevenue = new Chart(cRev, {
        type: 'line',
        data: {
          labels: rev.labels || [],
          datasets: [
            {
              label: `Revenue (${rev.currency || 'EGP'})`,
              data: rev.values || [],
              borderColor: teal,
              backgroundColor: rgbaFromCssVar('--brand-primary', 0.18),
              fill: true,
              tension: 0.3,
              pointRadius: 3,
              pointHoverRadius: 5,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { intersect: false, mode: 'index' },
          plugins: {
            legend: { labels: { color: textColor } },
            tooltip: {
              callbacks: {
                label(ctx) {
                  const v = ctx.parsed.y;
                  return `${ctx.dataset.label}: ${Number(v).toFixed(2)}`;
                },
              },
            },
          },
          scales: {
            x: { ticks: { color: mutedColor, maxRotation: 45 }, grid: { color: gridColor } },
            y: { ticks: { color: mutedColor }, grid: { color: gridColor } },
          },
        },
      });

      const mLabels = meth.labels || [];
      const mVals = meth.values || [];
      const sumM = mVals.reduce((a, b) => a + Number(b || 0), 0);
      const pal = [teal, teal2, '#f7931e', '#39b54a', '#ed1c24', '#2e3192', '#f59e3b', '#0071bc', '#b4b0c8'];
      if (!sumM || !mLabels.length) {
        financeChartMethods = new Chart(cMeth, {
          type: 'doughnut',
          data: {
            labels: ['No data'],
            datasets: [{ data: [1], backgroundColor: ['rgba(180,176,200,0.22)'], borderColor: surface, borderWidth: 1 }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: { enabled: false },
            },
          },
        });
      } else {
        financeChartMethods = new Chart(cMeth, {
          type: 'doughnut',
          data: {
            labels: mLabels,
            datasets: [
              {
                data: mVals,
                backgroundColor: mLabels.map((_, i) => pal[i % pal.length]),
                borderWidth: 1,
                borderColor: surface,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'right',
                labels: { color: textColor, boxWidth: 12, padding: 10, font: { size: 11 } },
              },
              tooltip: {
                callbacks: {
                  label(ctx) {
                    const v = Number(ctx.parsed);
                    const pct = sumM ? ((v / sumM) * 100).toFixed(1) : '0';
                    return `${ctx.label}: ${v.toFixed(2)} (${pct}%)`;
                  },
                },
              },
            },
          },
        });
      }

      const b = ar.buckets || {};
      const arLabels = ['0–30 days', '31–60 days', '61–90 days', '90+ days'];
      const arVals = [Number(b.b0_30 || 0), Number(b.b31_60 || 0), Number(b.b61_90 || 0), Number(b.b90p || 0)];
      financeChartAr = new Chart(cAr, {
        type: 'bar',
        data: {
          labels: arLabels,
          datasets: [
            {
              label: `Outstanding (${ar.currency || 'EGP'})`,
              data: arVals,
              backgroundColor: [
                rgbaFromCssVar('--brand-primary', 0.85),
                rgbaFromCssVar('--brand-primary-2', 0.75),
                'rgba(245, 158, 59, 0.85)',
                'rgba(237, 28, 36, 0.85)',
              ],
              borderColor: surface,
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label(ctx) {
                  return `${Number(ctx.parsed.y).toFixed(2)} ${ar.currency || 'EGP'}`;
                },
              },
            },
          },
          scales: {
            x: { ticks: { color: mutedColor }, grid: { display: false } },
            y: { ticks: { color: mutedColor }, grid: { color: gridColor } },
          },
        },
      });

      const asOf = ar.as_of ? String(ar.as_of).slice(0, 10) : '';
      if (msg) msg.textContent = asOf ? `Charts updated. AR aging as of ${asOf}.` : 'Charts updated.';
    } catch (e) {
      destroyFinanceCharts();
      if (msg) msg.textContent = e.message || 'Could not load charts.';
    }
  }

  async function refreshFinanceKpis() {
    const box = document.getElementById('financeKpis');
    if (!box) return;
    try {
      const data = await jsonFetch('/.netlify/functions/finance-data?resource=kpis', { headers: getAuthHeaders() });
      box.innerHTML = `
        <div class="stat"><span class="k">MTD revenue</span><span class="v">${Number(data.mtd_revenue || 0).toFixed(2)}</span></div>
        <div class="stat"><span class="k">Outstanding invoices</span><span class="v">${Number(data.outstanding_invoices || 0).toFixed(2)}</span></div>
        <div class="stat"><span class="k">Payment rows</span><span class="v">${data.payment_count ?? 0}</span></div>
      `;
    } catch (_) {
      box.textContent = '';
    }
  }

  function buildLedgerQuery(extra) {
    const page = extra && extra.page != null ? String(extra.page) : String(ledgerPage);
    const pageSize = extra && extra.pageSize != null ? String(extra.pageSize) : String(LEDGER_PAGE_SIZE);
    const q = new URLSearchParams({ resource: 'ledger', page, pageSize });
    const from = document.getElementById('ledgerFrom')?.value;
    const to = document.getElementById('ledgerTo')?.value;
    const method = String(document.getElementById('ledgerMethod')?.value || '').trim();
    const enrollmentId = String(document.getElementById('ledgerEnrollmentId')?.value || '').trim();
    if (from) q.set('from', from);
    if (to) q.set('to', to);
    if (method) q.set('method', method);
    if (enrollmentId) q.set('enrollment_id', enrollmentId);
    return q.toString();
  }

  async function refreshLedger() {
    const body = document.getElementById('ledgerBody');
    const msg = document.getElementById('financeLedgerMsg');
    const pageInfo = document.getElementById('ledgerPageInfo');
    if (!body) return;
    try {
      const data = await jsonFetch(`/.netlify/functions/finance-data?${buildLedgerQuery()}`, { headers: getAuthHeaders() });
      body.innerHTML = (data.items || [])
        .map((row) => {
          const e = row.enrollments || {};
          return `<tr><td>${row.received_at || ''}</td><td>${row.amount ?? ''}</td><td>${row.method ?? ''}</td><td>${e.enrollment_id ?? ''}</td><td>${e.trainee_id ?? ''}</td><td>${row.reference ?? ''}</td></tr>`;
        })
        .join('');
      const total = data.total != null ? data.total : 0;
      const pages = Math.max(1, Math.ceil(total / LEDGER_PAGE_SIZE));
      if (pageInfo) pageInfo.textContent = `Page ${data.page || ledgerPage} of ${pages} (${total} rows)`;
      if (msg) msg.textContent = `Showing ${(data.items || []).length} of ${total}.`;
    } catch (err) {
      if (msg) msg.textContent = err.message;
    }
  }

  async function loadFinanceAudit() {
    const tbody = document.getElementById('financeAuditBody');
    const info = document.getElementById('auditPageInfo');
    if (!tbody) return;
    const role = localStorage.getItem(AUTH_ROLE) || '';
    if (role !== 'admin') {
      tbody.innerHTML = '';
      return;
    }
    try {
      const data = await jsonFetch(
        `/.netlify/functions/finance-data?resource=audit&page=${auditPage}&pageSize=30`,
        { headers: getAuthHeaders() },
      );
      tbody.innerHTML = (data.items || [])
        .map((r) => {
          const payload = r.payload != null ? JSON.stringify(r.payload) : '';
          return `<tr><td>${r.created_at || ''}</td><td>${r.actor || ''}</td><td>${r.action || ''}</td><td>${r.entity || ''}</td><td>${r.entity_id || ''}</td><td class="audit-payload">${payload.slice(0, 200)}${payload.length > 200 ? '…' : ''}</td></tr>`;
        })
        .join('');
      const total = data.total != null ? data.total : 0;
      const pages = Math.max(1, Math.ceil(total / 30));
      if (info) info.textContent = `Page ${auditPage} of ${pages}`;
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="6">${err.message}</td></tr>`;
    }
  }

  async function refreshAr() {
    const box = document.getElementById('arBuckets');
    const msg = document.getElementById('financeArMsg');
    if (!box) return;
    try {
      const data = await jsonFetch('/.netlify/functions/finance-data?resource=ar-aging', { headers: getAuthHeaders() });
      const b = data.buckets || {};
      box.innerHTML = `
        <div class="stat"><span class="k">0–30 d</span><span class="v">${Number(b.b0_30 || 0).toFixed(2)}</span></div>
        <div class="stat"><span class="k">31–60 d</span><span class="v">${Number(b.b31_60 || 0).toFixed(2)}</span></div>
        <div class="stat"><span class="k">61–90 d</span><span class="v">${Number(b.b61_90 || 0).toFixed(2)}</span></div>
        <div class="stat"><span class="k">90+ d</span><span class="v">${Number(b.b90p || 0).toFixed(2)}</span></div>
      `;
      if (msg) msg.textContent = `As of ${data.as_of || ''}`;
    } catch (err) {
      if (msg) msg.textContent = err.message;
    }
  }

  let ledgerItemsCache = [];

  async function refreshInvoices() {
    const tbody = document.getElementById('invoicesBody');
    const msg = document.getElementById('financeInvMsg');
    const role = localStorage.getItem(AUTH_ROLE) || 'user';
    const canWrite = ['admin', 'accountant'].includes(role);
    if (!tbody) return;
    try {
      const data = await jsonFetch('/.netlify/functions/finance-data?resource=invoices', { headers: getAuthHeaders() });
      ledgerItemsCache = data.items || [];
      tbody.innerHTML = (data.items || [])
        .map((inv) => {
          const del = canWrite
            ? `<button type="button" class="btn btn-secondary btn-inv-del" data-id="${inv.id}">Delete</button>`
            : '';
          return `<tr>
            <td>${inv.invoice_number || ''}</td>
            <td>${inv.status || ''}</td>
            <td>${inv.issue_date || ''}</td>
            <td>${inv.due_date || ''}</td>
            <td>${inv.total ?? ''}</td>
            <td><button type="button" class="btn btn-secondary btn-inv-edit" data-id="${inv.id}">Edit</button> ${del}</td>
          </tr>`;
        })
        .join('');
      tbody.querySelectorAll('.btn-inv-edit').forEach((btn) => {
        btn.addEventListener('click', () => fillInvoiceForm(btn.getAttribute('data-id')));
      });
      tbody.querySelectorAll('.btn-inv-del').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          if (!id || !confirm('Delete this invoice?')) return;
          await jsonFetch(`/.netlify/functions/finance-data?resource=invoices&id=${encodeURIComponent(id)}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
          });
          refreshInvoices();
        });
      });
      if (msg) msg.textContent = '';
    } catch (err) {
      if (msg) msg.textContent = err.message;
    }
  }

  function clearInvoiceLinesEditor() {
    const el = document.getElementById('invoiceLinesEditor');
    if (el) el.innerHTML = '';
  }

  function addInvoiceLineRow(line) {
    const el = document.getElementById('invoiceLinesEditor');
    if (!el) return;
    const row = document.createElement('div');
    row.className = 'invoice-line-row row';
    const d = line || {};
    row.innerHTML = `
      <input type="text" class="inv-line-desc" placeholder="Description" value="${String(d.description || '').replace(/"/g, '&quot;')}" />
      <input type="number" class="inv-line-qty" placeholder="Qty" step="any" value="${d.quantity != null ? d.quantity : '1'}" />
      <input type="number" class="inv-line-price" placeholder="Unit price" step="0.01" value="${d.unit_price != null ? d.unit_price : ''}" />
      <input type="number" class="inv-line-total" placeholder="Line total" step="0.01" value="${d.line_total != null ? d.line_total : ''}" />
      <input type="text" class="inv-line-enrollment-uuid" placeholder="Enrollment UUID (optional)" value="${String(d.enrollment_uuid || '').replace(/"/g, '&quot;')}" />
    `;
    el.appendChild(row);
  }

  function collectInvoiceLines() {
    const rows = document.querySelectorAll('#invoiceLinesEditor .invoice-line-row');
    const lines = [];
    rows.forEach((row) => {
      const description = row.querySelector('.inv-line-desc')?.value;
      const quantity = row.querySelector('.inv-line-qty')?.value;
      const unit_price = row.querySelector('.inv-line-price')?.value;
      const line_total = row.querySelector('.inv-line-total')?.value;
      const enrollment_uuid = row.querySelector('.inv-line-enrollment-uuid')?.value;
      if (!String(description || '').trim() && !String(line_total || '').trim()) return;
      lines.push({
        description: description != null ? String(description) : null,
        quantity: quantity !== '' && quantity != null ? Number(quantity) : 1,
        unit_price: unit_price !== '' && unit_price != null ? Number(unit_price) : null,
        line_total: line_total !== '' && line_total != null ? Number(line_total) : null,
        enrollment_uuid: enrollment_uuid ? String(enrollment_uuid).trim() || null : null,
      });
    });
    return lines;
  }

  function fillInvoiceForm(id) {
    const inv = ledgerItemsCache.find((x) => String(x.id) === String(id));
    if (!inv) return;
    document.getElementById('invEditId').value = inv.id;
    document.getElementById('invNumber').value = inv.invoice_number || '';
    document.getElementById('invStatus').value = inv.status || 'draft';
    document.getElementById('invIssue').value = inv.issue_date || '';
    document.getElementById('invDue').value = inv.due_date || '';
    document.getElementById('invTotal').value = inv.total != null ? inv.total : '';
    document.getElementById('invNotes').value = inv.notes || '';
    clearInvoiceLinesEditor();
    const ils = inv.invoice_lines || [];
    if (ils.length) ils.forEach((ln) => addInvoiceLineRow(ln));
    else addInvoiceLineRow(null);
  }

  function refreshFinanceAll() {
    refreshFinanceKpis();
    refreshLedger();
    refreshAr();
    refreshInvoices();
    refreshFinanceCharts();
  }

  function initFinance() {
    document.getElementById('btnRefreshFinance')?.addEventListener('click', refreshFinanceAll);
    document.getElementById('btnRefreshFinanceCharts')?.addEventListener('click', refreshFinanceCharts);
    document.getElementById('btnLoadLedger')?.addEventListener('click', () => {
      ledgerPage = 1;
      refreshLedger();
    });
    document.getElementById('btnLoadAr')?.addEventListener('click', refreshAr);
    document.getElementById('btnLoadInvoices')?.addEventListener('click', refreshInvoices);

    document.getElementById('btnExportLedgerCsv')?.addEventListener('click', async () => {
      try {
        const q = buildLedgerQuery({ page: '1', pageSize: '500' });
        const data = await jsonFetch(`/.netlify/functions/finance-data?${q}`, { headers: getAuthHeaders() });
        const csv = ledgerToCsv(data.items || []);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'payments-ledger.csv';
        a.click();
        URL.revokeObjectURL(a.href);
      } catch (_) {
        /* ignore */
      }
    });

    document.getElementById('btnExportLedgerXlsx')?.addEventListener('click', async () => {
      if (typeof XLSX === 'undefined') return;
      try {
        const q = buildLedgerQuery({ page: '1', pageSize: '500' });
        const data = await jsonFetch(`/.netlify/functions/finance-data?${q}`, { headers: getAuthHeaders() });
        const rows = [['received_at', 'amount', 'currency', 'method', 'enrollment_id', 'trainee_id', 'reference']];
        (data.items || []).forEach((row) => {
          const e = row.enrollments || {};
          rows.push([row.received_at, row.amount, row.currency, row.method, e.enrollment_id, e.trainee_id, row.reference]);
        });
        const ws = XLSX.utils.aoa_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'ledger');
        XLSX.writeFile(wb, 'payments-ledger.xlsx');
      } catch (_) {
        /* ignore */
      }
    });

    document.getElementById('btnLedgerPrev')?.addEventListener('click', () => {
      if (ledgerPage > 1) {
        ledgerPage -= 1;
        refreshLedger();
      }
    });
    document.getElementById('btnLedgerNext')?.addEventListener('click', () => {
      ledgerPage += 1;
      refreshLedger();
    });
    ['ledgerFrom', 'ledgerTo', 'ledgerMethod', 'ledgerEnrollmentId'].forEach((id) => {
      document.getElementById(id)?.addEventListener('change', () => {
        ledgerPage = 1;
        refreshLedger();
      });
    });

    document.getElementById('btnAuditPrev')?.addEventListener('click', () => {
      if (auditPage > 1) {
        auditPage -= 1;
        loadFinanceAudit();
      }
    });
    document.getElementById('btnAuditNext')?.addEventListener('click', () => {
      auditPage += 1;
      loadFinanceAudit();
    });
    document.getElementById('btnAuditRefresh')?.addEventListener('click', loadFinanceAudit);

    document.getElementById('btnAddInvoiceLine')?.addEventListener('click', () => addInvoiceLineRow(null));

    document.getElementById('financePaymentForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = document.getElementById('financePayMsg');
      const enrollment_id = String(document.getElementById('payEnrollmentId').value || '').trim();
      const amount = Number(document.getElementById('payAmount').value);
      const method = String(document.getElementById('payMethod').value || '').trim();
      const receivedRaw = document.getElementById('payReceived').value;
      const reference = String(document.getElementById('payRef').value || '').trim();
      const notes = String(document.getElementById('payNotes').value || '').trim();
      const body = { enrollment_id, amount, method, reference, notes };
      if (receivedRaw) body.received_at = new Date(receivedRaw).toISOString();
      try {
        await jsonFetch('/.netlify/functions/finance-data?resource=payment', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(body),
        });
        if (msg) msg.textContent = 'Payment saved.';
        document.getElementById('financePaymentForm').reset();
        refreshFinanceAll();
      } catch (err) {
        if (msg) msg.textContent = err.message;
      }
    });

    document.getElementById('invoiceForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = document.getElementById('financeInvMsg');
      const id = String(document.getElementById('invEditId').value || '').trim();
      const payload = {
        invoice_number: String(document.getElementById('invNumber').value || '').trim(),
        status: String(document.getElementById('invStatus').value || 'draft'),
        issue_date: String(document.getElementById('invIssue').value || ''),
        due_date: String(document.getElementById('invDue').value || '') || null,
        total: document.getElementById('invTotal').value ? Number(document.getElementById('invTotal').value) : null,
        notes: String(document.getElementById('invNotes').value || '').trim(),
        lines: collectInvoiceLines(),
      };
      try {
        if (id) {
          payload.id = id;
          await jsonFetch('/.netlify/functions/finance-data?resource=invoices', {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(payload),
          });
        } else {
          await jsonFetch('/.netlify/functions/finance-data?resource=invoices', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(payload),
          });
        }
        document.getElementById('invEditId').value = '';
        document.getElementById('invoiceForm').reset();
        clearInvoiceLinesEditor();
        addInvoiceLineRow(null);
        if (msg) msg.textContent = 'Invoice saved.';
        refreshInvoices();
        refreshFinanceKpis();
        refreshAr();
        refreshFinanceCharts();
      } catch (err) {
        if (msg) msg.textContent = err.message;
      }
    });

    document.getElementById('btnClearInvoiceForm')?.addEventListener('click', () => {
      document.getElementById('invEditId').value = '';
      document.getElementById('invoiceForm').reset();
      clearInvoiceLinesEditor();
      addInvoiceLineRow(null);
    });

    clearInvoiceLinesEditor();
    addInvoiceLineRow(null);
  }

  function initBulkEnrollment() {
    document.getElementById('btnBulkEnrollment')?.addEventListener('click', async () => {
      const msg = document.getElementById('bulkEnrollmentMsg');
      const raw = String(document.getElementById('bulkEnrollmentIds')?.value || '');
      const enrollment_ids = raw
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
      const enrollment_status = String(document.getElementById('bulkEnrollmentStatus')?.value || '');
      if (!enrollment_ids.length) {
        if (msg) msg.textContent = 'Enter at least one enrollment ID.';
        return;
      }
      if (!confirm(`Set status to ${enrollment_status} for ${enrollment_ids.length} enrollment(s)?`)) return;
      try {
        const data = await jsonFetch('/.netlify/functions/operations-data?resource=bulk-enrollments', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ enrollment_ids, enrollment_status }),
        });
        if (msg) msg.textContent = `Updated ${data.updated} row(s).`;
        if (currentEntity() === 'enrollments') loadEntityRows();
      } catch (err) {
        if (msg) msg.textContent = err.message;
      }
    });
  }

  // -------------------------
  // Training tools (attendance & materials)
  // -------------------------
  function initTrainingTools() {
    document.getElementById('btnLoadSessionsForTools')?.addEventListener('click', loadSessionsForTools);
    document.getElementById('btnSaveAttendance')?.addEventListener('click', saveAttendanceRow);
    document.getElementById('btnLoadAttendance')?.addEventListener('click', loadAttendanceRows);
    document.getElementById('btnExportAttendanceCsv')?.addEventListener('click', exportAttendanceCsv);
    document.getElementById('btnAddMaterial')?.addEventListener('click', addMaterial);
    document.getElementById('btnLoadMaterials')?.addEventListener('click', loadMaterialsRows);
    document.getElementById('toolsGroupSelect')?.addEventListener('change', (e) => {
      const v = String(e.target.value || '').trim();
      const gid = document.getElementById('toolsGroupId');
      if (gid) gid.value = v;
    });
  }

  function exportAttendanceCsv() {
    if (!attendanceRowsCache.length) return;
    const headers = ['attendance_date', 'participant_name', 'status', 'notes'];
    const lines = [headers.join(',')];
    attendanceRowsCache.forEach((r) => {
      const vals = [r.attendance_date, r.participant_name, r.status, r.notes].map((v) => {
        const s = v == null ? '' : String(v);
        return `"${s.replace(/"/g, '""')}"`;
      });
      lines.push(vals.join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'attendance.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function loadSessionsForTools() {
    const box = document.getElementById('toolsSessionsList');
    const sel = document.getElementById('toolsGroupSelect');
    if (!box) return;
    try {
      const data = await jsonFetch('/.netlify/functions/training-sessions', { headers: getAuthHeaders() });
      const sessions = data.sessions || [];
      box.innerHTML = sessions
        .map((s) => {
          const groups = (s.training_groups || [])
            .map((g) => `<li>Group ${g.group_number}: group id <code>${g.id}</code></li>`)
            .join('');
          return `<div class="tools-session-block"><strong>${s.title}</strong> — session <code>${s.id}</code><ul>${groups}</ul></div>`;
        })
        .join('');
      if (sel) {
        const opts = ['<option value="">— Pick a group —</option>'];
        sessions.forEach((s) => {
          (s.training_groups || []).forEach((g) => {
            opts.push(`<option value="${g.id}">${s.title} — Group ${g.group_number}</option>`);
          });
        });
        sel.innerHTML = opts.join('');
      }
    } catch (err) {
      box.textContent = err.message;
    }
  }

  async function saveAttendanceRow() {
    const msg = document.getElementById('toolsAttMsg');
    const group_id = String(document.getElementById('toolsGroupId').value || '').trim();
    const participant_name = String(document.getElementById('toolsParticipant').value || '').trim();
    const attendance_date = String(document.getElementById('toolsAttDate').value || '');
    const status = String(document.getElementById('toolsAttStatus').value || 'present');
    try {
      await jsonFetch('/.netlify/functions/training-data?resource=attendance', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ group_id, participant_name, attendance_date, status }),
      });
      if (msg) msg.textContent = 'Saved.';
      loadAttendanceRows();
    } catch (err) {
      if (msg) msg.textContent = err.message;
    }
  }

  async function loadAttendanceRows() {
    const body = document.getElementById('attendanceBody');
    const msg = document.getElementById('toolsAttMsg');
    const group_id = String(document.getElementById('toolsGroupId').value || '').trim();
    if (!group_id) {
      if (msg) msg.textContent = 'Enter group id.';
      return;
    }
    try {
      const data = await jsonFetch(
        `/.netlify/functions/training-data?resource=attendance&group_id=${encodeURIComponent(group_id)}`,
        { headers: getAuthHeaders() },
      );
      attendanceRowsCache = data.items || [];
      body.innerHTML = attendanceRowsCache
        .map(
          (r) =>
            `<tr><td>${r.attendance_date || ''}</td><td>${r.participant_name || ''}</td><td>${r.status || ''}</td><td><button type="button" class="btn btn-secondary btn-att-del" data-id="${r.id}">Remove</button></td></tr>`,
        )
        .join('');
      body.querySelectorAll('.btn-att-del').forEach((b) => {
        b.addEventListener('click', async () => {
          const id = b.getAttribute('data-id');
          await jsonFetch(`/.netlify/functions/training-data?resource=attendance&id=${encodeURIComponent(id)}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
          });
          loadAttendanceRows();
        });
      });
      if (msg) msg.textContent = '';
    } catch (err) {
      if (msg) msg.textContent = err.message;
    }
  }

  async function loadMaterialsRows() {
    const list = document.getElementById('toolsMaterialsList');
    const msg = document.getElementById('toolsMatMsg');
    const session_id = String(document.getElementById('toolsMatSessionId').value || '').trim();
    const group_id = String(document.getElementById('toolsMatGroupId').value || '').trim();
    const q = new URLSearchParams({ resource: 'materials' });
    if (session_id) q.set('session_id', session_id);
    if (group_id) q.set('group_id', group_id);
    try {
      const data = await jsonFetch(`/.netlify/functions/training-data?${q}`, { headers: getAuthHeaders() });
      list.innerHTML = (data.items || [])
        .map(
          (m) =>
            `<li><a href="${m.url}" target="_blank" rel="noopener">${m.title}</a> <button type="button" class="btn btn-secondary btn-mat-del" data-id="${m.id}">Remove</button></li>`,
        )
        .join('');
      list.querySelectorAll('.btn-mat-del').forEach((b) => {
        b.addEventListener('click', async () => {
          const id = b.getAttribute('data-id');
          await jsonFetch(`/.netlify/functions/training-data?resource=materials&id=${encodeURIComponent(id)}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
          });
          loadMaterialsRows();
        });
      });
      if (msg) msg.textContent = '';
    } catch (err) {
      if (msg) msg.textContent = err.message;
    }
  }

  async function addMaterial() {
    const msg = document.getElementById('toolsMatMsg');
    const session_id = String(document.getElementById('toolsMatSessionId').value || '').trim();
    const group_id = String(document.getElementById('toolsMatGroupId').value || '').trim();
    const title = String(document.getElementById('toolsMatTitle').value || '').trim();
    const url = String(document.getElementById('toolsMatUrl').value || '').trim();
    if (!title || !url) {
      if (msg) msg.textContent = 'Title and URL required.';
      return;
    }
    if (!session_id && !group_id) {
      if (msg) msg.textContent = 'Provide session ID or group ID.';
      return;
    }
    try {
      await jsonFetch('/.netlify/functions/training-data?resource=materials', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ session_id: session_id || null, group_id: group_id || null, title, url }),
      });
      if (msg) msg.textContent = 'Material added.';
      loadMaterialsRows();
    } catch (err) {
      if (msg) msg.textContent = err.message;
    }
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

  function scrollTrainingChatToBottom() {
    const el = document.getElementById('trainChatScroll');
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }

  function appendChatMessage(m) {
    const box = document.getElementById('chatMessages');
    if (!box) return;
    const sender = String(m.sender_name || 'User').trim();
    const mine =
      trainingState.senderName &&
      sender.toLowerCase() === String(trainingState.senderName).trim().toLowerCase();
    const row = document.createElement('div');
    row.className = `chat-line ${mine ? 'chat-line--out' : 'chat-line--in'}`;
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    if (!mine) {
      const who = document.createElement('div');
      who.className = 'chat-bubble-name';
      who.textContent = sender || 'User';
      bubble.appendChild(who);
    }
    const text = document.createElement('div');
    text.className = 'chat-bubble-text';
    text.textContent = m.body != null ? String(m.body) : '';
    const foot = document.createElement('div');
    foot.className = 'chat-bubble-meta';
    const ts = new Date(m.created_at || Date.now());
    foot.textContent = ts.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    bubble.appendChild(text);
    bubble.appendChild(foot);
    row.appendChild(bubble);
    box.appendChild(row);
    scrollTrainingChatToBottom();
  }

  async function loadRecentMessages() {
    if (!trainingState.groupId) return;
    const data = await jsonFetch(`/.netlify/functions/training-messages?groupId=${encodeURIComponent(trainingState.groupId)}`);
    const box = document.getElementById('chatMessages');
    if (box) box.innerHTML = '';
    (data.messages || []).forEach(appendChatMessage);
    scrollTrainingChatToBottom();
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

  function setTrainingParticipantHero(title, subtitle) {
    const trainerHero = document.getElementById('trainingTrainerHero');
    const studentHero = document.getElementById('trainingStudentHero');
    if (trainerHero) trainerHero.classList.add('hidden');
    if (studentHero) {
      studentHero.classList.remove('hidden');
      const t = document.getElementById('trainingStudentTitle');
      const s = document.getElementById('trainingStudentSubtitle');
      if (t) t.textContent = title || 'Join session';
      if (s) s.textContent = subtitle || '';
    }
  }

  async function showSessionGroupPickerFlow(sessionId) {
    document.body.classList.add('participant-join');
    const trainerPanel = document.getElementById('trainerPanel');
    if (trainerPanel) trainerPanel.classList.add('hidden');
    document.getElementById('trainerSessionsCard')?.classList.add('hidden');
    document.getElementById('participantLanding')?.classList.add('hidden');
    document.getElementById('joinPanel')?.classList.add('hidden');
    document.getElementById('chatPanel')?.classList.add('hidden');

    const picker = document.getElementById('participantGroupPicker');
    const buttonsEl = document.getElementById('groupPickerButtons');
    const errEl = document.getElementById('groupPickerError');
    if (errEl) errEl.textContent = '';
    if (buttonsEl) buttonsEl.innerHTML = '';

    try {
      const data = await jsonFetch(
        `/.netlify/functions/public-training-session?sessionId=${encodeURIComponent(sessionId)}`
      );
      setTrainingParticipantHero(
        data.title || 'Live session',
        'Choose a group below. You will enter your display name on the next step.'
      );
      if (picker) picker.classList.remove('hidden');
      if (buttonsEl) {
        (data.groups || []).forEach((g) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'btn btn-primary';
          btn.textContent = `Group ${g.group_number}`;
          btn.onclick = () => {
            if (picker) picker.classList.add('hidden');
            const base = `${window.location.origin}${window.location.pathname}`;
            history.replaceState({}, '', `${base}?group=${encodeURIComponent(g.join_token)}`);
            joinByTokenFlow(g.join_token);
          };
          buttonsEl.appendChild(btn);
        });
      }
    } catch (e) {
      setTrainingParticipantHero('Session', String(e.message || 'Could not load session.'));
      if (errEl) errEl.textContent = e.message || 'Could not load groups.';
      if (picker) picker.classList.remove('hidden');
    }
  }

  async function joinByTokenFlow(token) {
    document.body.classList.add('participant-join');
    document.getElementById('participantGroupPicker')?.classList.add('hidden');
    const trainerPanel = document.getElementById('trainerPanel');
    if (trainerPanel) trainerPanel.classList.add('hidden');
    document.getElementById('trainerSessionsCard')?.classList.add('hidden');
    const landing = document.getElementById('participantLanding');
    const panel = document.getElementById('joinPanel');
    const joinData = await jsonFetch(`/.netlify/functions/training-join?token=${encodeURIComponent(token)}`);
    setTrainingParticipantHero(
      joinData.sessionTitle || 'Live session',
      `Group ${joinData.groupNumber} — continue to enter your display name and open the chat.`
    );
    document.getElementById('participantLandingTitle').textContent = joinData.sessionTitle || 'Live session';
    document.getElementById('participantLandingSubtitle').textContent = `Group ${joinData.groupNumber} — continue to enter your display name and open the chat.`;
    if (landing) landing.classList.remove('hidden');
    if (panel) panel.classList.add('hidden');
    document.getElementById('chatPanel').classList.add('hidden');

    const startJoin = () => {
      if (landing) landing.classList.add('hidden');
      if (panel) panel.classList.remove('hidden');
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
        const sub = document.getElementById('chatPanelSub');
        if (sub) {
          sub.textContent = `${joined.sessionTitle || joinData.sessionTitle || 'Live session'} · Group ${joined.groupNumber ?? joinData.groupNumber}`;
        }
        loadRecentMessages();
        initRealtime();
        setInterval(loadRecentMessages, 10000);
      };
    };

    document.getElementById('btnParticipantContinue').onclick = startJoin;
  }

  function switchToTrainingView() {
    document.querySelectorAll('.area-tab').forEach((t) => t.classList.toggle('active', t.getAttribute('data-area') === 'training'));
    document.querySelectorAll('.subnav').forEach((s) => s.classList.toggle('hidden', s.getAttribute('data-for-area') !== 'training'));
    const trSub = document.querySelector('.subnav[data-for-area="training"]');
    if (trSub) {
      trSub.querySelectorAll('.subnav-item').forEach((b) => b.classList.toggle('active', b.getAttribute('data-view') === 'training'));
    }
    document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
    document.getElementById('view-training').classList.add('active');
  }

  async function loadTrainerSessions() {
    const list = document.getElementById('trainerSessionsList');
    const msg = document.getElementById('trainerSessionsMsg');
    if (!list || !['admin', 'trainer'].includes(authRole)) return;
    if (msg) msg.textContent = 'Loading…';
    try {
      const data = await jsonFetch('/.netlify/functions/training-sessions', { headers: getAuthHeaders() });
      const sessions = data.sessions || [];
      list.innerHTML = '';
      if (msg) msg.textContent = '';
      if (!sessions.length) {
        if (msg) msg.textContent = 'No sessions yet. Create one above.';
        return;
      }
      const base = `${window.location.origin}${window.location.pathname}`;
      sessions.forEach((s) => {
        const row = document.createElement('div');
        row.className = 'trainer-session-row';
        const meta = document.createElement('div');
        meta.className = 'session-meta';
        const titleEl = document.createElement('strong');
        titleEl.textContent = s.title || 'Session';
        meta.appendChild(titleEl);
        const sub = document.createElement('div');
        sub.className = 'muted';
        const created = s.created_at ? new Date(s.created_at).toLocaleString() : '';
        const who = authRole === 'admin' && s.trainer_username ? ` · Trainer: ${s.trainer_username}` : '';
        sub.textContent = `${created} · ${s.groups_count} group(s)${who}`;
        meta.appendChild(sub);
        row.appendChild(meta);
        const href = `${base}?session=${s.id}`;
        const link = document.createElement('a');
        link.href = href;
        link.className = 'btn btn-secondary';
        link.target = '_blank';
        link.rel = 'noopener';
        link.textContent = 'Student link';
        row.appendChild(link);
        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'btn btn-secondary';
        del.textContent = 'Delete';
        del.addEventListener('click', async () => {
          if (
            !confirm(
              'Delete this session? All groups, chat messages, and related attendance rows for this session will be removed. This cannot be undone.'
            )
          ) {
            return;
          }
          if (msg) msg.textContent = '';
          try {
            await jsonFetch(`/.netlify/functions/training-sessions?id=${encodeURIComponent(s.id)}`, {
              method: 'DELETE',
              headers: getAuthHeaders(),
            });
            await loadTrainerSessions();
          } catch (e) {
            if (msg) msg.textContent = e.message;
          }
        });
        row.appendChild(del);
        list.appendChild(row);
      });
    } catch (e) {
      if (msg) msg.textContent = e.message;
    }
  }

  async function initTraining() {
    const query = new URLSearchParams(window.location.search);
    const sessionId = query.get('session');
    const token = query.get('group');
    if (token) {
      switchToTrainingView();
      await joinByTokenFlow(token);
    } else if (sessionId) {
      switchToTrainingView();
      await showSessionGroupPickerFlow(sessionId);
    }

    document.getElementById('trainingSessionForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = String(document.getElementById('trainingTitle').value || '').trim();
      const groupsCount = Number(document.getElementById('groupsCount').value || 1);
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
        const sorted = (data.groups || []).slice().sort((a, b) => a.group_number - b.group_number);
        const session = data.session;
        const href = session && session.id ? `${base}?session=${session.id}` : base;
        links.innerHTML =
          session && session.id
            ? `<h4>Share link for students</h4><p class="share-link-wrap"><a href="${href}" target="_blank" rel="noopener">${href}</a></p>${
                sorted.length > 1
                  ? `<p class="muted small-margin">Students choose their group after opening this link.</p>`
                  : ''
              }`
            : '';
        msg.textContent = 'Session created.';
        loadTrainerSessions();
      } catch (err) {
        msg.textContent = err.message;
      }
    });

    document.getElementById('btnRefreshTrainerSessions')?.addEventListener('click', () => loadTrainerSessions());

    if (['admin', 'trainer'].includes(authRole)) {
      loadTrainerSessions();
    }

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
        input.focus();
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
        const role = String(document.getElementById('newUserRole')?.value || 'user');
        await jsonFetch('/.netlify/functions/create-user', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ username, password, role }),
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