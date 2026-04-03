import { jsonFetch, getAuthHeaders } from './shared.js';

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
      const data = await jsonFetch(`/.netlify/functions/operations-data?entity=${encodeURIComponent(entity)}&bulk=1`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ items: chunk }),
      });
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

export function initOperations() {
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

export async function loadPipeline() {
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

export async function loadCapacity() {
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

export async function loadQuality() {
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

export function initOpsInsights() {
  document.getElementById('btnRefreshPipeline')?.addEventListener('click', loadPipeline);
  document.getElementById('btnRefreshCapacity')?.addEventListener('click', loadCapacity);
  document.getElementById('btnRefreshQuality')?.addEventListener('click', loadQuality);
}

export function initBulkEnrollment() {
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
