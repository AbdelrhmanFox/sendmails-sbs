import { jsonFetch, getAuthHeaders } from './shared.js';

const OPS = '/.netlify/functions/operations-data';
const BULK_IMPORT_CHUNK = 75;

const TRAINEE_TYPES = ['Student', 'Doctor', 'IT', 'Corporate'];
const CITIES = ['Cairo', 'Giza', 'Alexandria', 'Other'];
const COURSE_CATEGORIES = ['Technical', 'Soft Skills', 'Medical', 'Corporate', 'Other'];
const TARGET_AUDIENCES = ['Students', 'Doctors', 'Companies', 'Mixed'];
const DELIVERY_TYPES = ['Online', 'Offline', 'Hybrid'];
const ENROLLMENT_STATUSES = ['Registered', 'Attended', 'Completed', 'Cancelled'];
const PAYMENT_STATUSES = ['Pending', 'Paid', 'Waived'];

function goToView(viewId) {
  if (viewId === 'trainee-profile') {
    document.querySelectorAll('.area-tab').forEach((t) => {
      t.classList.toggle('active', t.getAttribute('data-area') === 'operations');
    });
    document.querySelectorAll('.subnav').forEach((s) => {
      s.classList.toggle('hidden', s.getAttribute('data-for-area') !== 'operations');
    });
  }
  document.dispatchEvent(new CustomEvent('sbs:goto-view', { detail: { viewId } }));
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

const traineesState = { page: 1, pageSize: 20, total: 0, sort: 'created_at', dir: 'desc' };
const coursesState = { page: 1, pageSize: 20, total: 0 };
const batchesState = { page: 1, pageSize: 20, total: 0 };
const enrollmentsState = { page: 1, pageSize: 20, total: 0 };
let profileDetail = null;
let selectedTraineeIds = new Set();
let selectedEnrollmentIds = new Set();

const wizard = {
  step: 1,
  trainee: null,
  course: null,
  batch: null,
};

let wizardCourseById = {};
let wizardBatchById = {};

function fillSelect(sel, options, placeholder) {
  if (!sel) return;
  const opts = placeholder
    ? [`<option value="">${placeholder}</option>`, ...options.map((o) => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`)]
    : options.map((o) => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`);
  sel.innerHTML = opts.join('');
}

function fillSelectRaw(sel, htmlOptions) {
  if (!sel) return;
  sel.innerHTML = htmlOptions.join('');
}

export function onOperationsViewChange(viewId) {
  const bar = document.getElementById('operationsGlobalBar');
  const opsPrefix = 'operations-';
  const showBar =
    (viewId.startsWith(opsPrefix) && viewId !== 'operations-home') || viewId === 'trainee-profile';
  if (bar) {
    bar.classList.toggle('hidden', !showBar);
    bar.setAttribute('aria-hidden', showBar ? 'false' : 'true');
  }
  if (viewId === 'operations-trainees') loadTraineesList();
  if (viewId === 'operations-courses') loadCoursesList();
  if (viewId === 'operations-batches') {
    loadCourseOptionsForBatchFilter();
    loadBatchesList();
  }
  if (viewId === 'operations-enrollments') {
    fillFilterSelects();
    loadEnrollmentsList();
  }
  if (viewId === 'operations-bulk') {
    fillFilterSelects();
  }
  if (viewId === 'operations-bulk') {
    /* bulk import entity select only */
  }
}

function fillFilterSelects() {
  const es = document.getElementById('enrollmentsFilterStatus');
  const ps = document.getElementById('enrollmentsFilterPay');
  if (es)
    fillSelectRaw(
      es,
      [`<option value="">All enrollment statuses</option>`].concat(ENROLLMENT_STATUSES.map((s) => `<option value="${s}">${s}</option>`)),
    );
  if (ps)
    fillSelectRaw(
      ps,
      [`<option value="">All payment statuses</option>`].concat(PAYMENT_STATUSES.map((s) => `<option value="${s}">${s}</option>`)),
    );
  const bulkEs = document.getElementById('enrollmentsBulkEnrollmentStatus');
  const bulkPs = document.getElementById('enrollmentsBulkPaymentStatus');
  if (bulkEs)
    fillSelectRaw(
      bulkEs,
      [`<option value="">Set enrollment status…</option>`].concat(ENROLLMENT_STATUSES.map((s) => `<option value="${s}">${s}</option>`)),
    );
  if (bulkPs)
    fillSelectRaw(
      bulkPs,
      [`<option value="">Set payment status…</option>`].concat(PAYMENT_STATUSES.map((s) => `<option value="${s}">${s}</option>`)),
    );
  const pe = document.getElementById('pe_payment_status');
  if (pe) fillSelect(pe, PAYMENT_STATUSES);
}

/* ——— Global search ——— */
let globalSearchTimer = null;
async function runGlobalSearch(q) {
  const box = document.getElementById('opsGlobalSearchResults');
  if (!box) return;
  if (q.length < 2) {
    box.classList.add('hidden');
    box.innerHTML = '';
    return;
  }
  try {
    const data = await jsonFetch(`${OPS}?resource=search&q=${encodeURIComponent(q)}&limit=8`, { headers: getAuthHeaders() });
    const rows = data.results || [];
    if (!rows.length) {
      box.innerHTML = '<p class="muted ops-search-empty">No matches.</p>';
      box.classList.remove('hidden');
      return;
    }
    box.innerHTML = rows
      .map(
        (r) =>
          `<button type="button" class="ops-search-row" role="option" data-id="${escapeHtml(r.id)}">
            <strong>${escapeHtml(r.trainee_id || '')}</strong> ${escapeHtml(r.full_name || '')}
            <span class="muted">${escapeHtml(r.phone || '')} · ${escapeHtml(r.email || '')}</span>
          </button>`,
      )
      .join('');
    box.querySelectorAll('.ops-search-row').forEach((btn) => {
      btn.addEventListener('click', () => {
        box.classList.add('hidden');
        openTraineeProfile(btn.getAttribute('data-id'));
      });
    });
    box.classList.remove('hidden');
  } catch (_) {
    box.innerHTML = '<p class="inline-error">Search failed.</p>';
    box.classList.remove('hidden');
  }
}

/* ——— Trainees list ——— */
function traineesQueryParams() {
  const q = document.getElementById('traineesListQ')?.value.trim() || '';
  const trainee_type = document.getElementById('traineesFilterType')?.value || '';
  const city = document.getElementById('traineesFilterCity')?.value || '';
  const status = document.getElementById('traineesFilterStatus')?.value || '';
  const sortSel = document.getElementById('traineesSort')?.value || 'created_at';
  traineesState.sort = sortSel;
  const dir = sortSel === 'full_name' || sortSel === 'trainee_id' ? 'asc' : 'desc';
  traineesState.dir = dir;
  const p = new URLSearchParams({
    entity: 'trainees',
    page: String(traineesState.page),
    pageSize: String(traineesState.pageSize),
    sort: traineesState.sort,
    dir,
  });
  if (q) p.set('q', q);
  if (trainee_type) p.set('trainee_type', trainee_type);
  if (city) p.set('city', city);
  if (status) p.set('status', status);
  return p.toString();
}

export async function loadTraineesList() {
  const body = document.getElementById('traineesTableBody');
  const cards = document.getElementById('traineesCards');
  const info = document.getElementById('traineesPageInfo');
  if (!body) return;
  try {
    const data = await jsonFetch(`${OPS}?${traineesQueryParams()}`, { headers: getAuthHeaders() });
    traineesState.total = data.total || 0;
    const items = data.items || [];
    if (info) {
      const from = items.length ? (traineesState.page - 1) * traineesState.pageSize + 1 : 0;
      const to = (traineesState.page - 1) * traineesState.pageSize + items.length;
      info.textContent = items.length ? `Showing ${from}–${to} of ${traineesState.total}` : 'No trainees match.';
    }
    body.innerHTML = items
      .map(
        (r) => `<tr>
        <td><input type="checkbox" class="trainee-row-check" data-id="${escapeHtml(r.id)}" /></td>
        <td>${escapeHtml(r.full_name || '')}</td>
        <td>${escapeHtml(r.phone || '')}</td>
        <td>${escapeHtml(r.email || '')}</td>
        <td>${escapeHtml(r.trainee_type || '')}</td>
        <td>${escapeHtml(r.city || '')}</td>
        <td>${escapeHtml(r.status || '')}</td>
        <td>
          <button type="button" class="btn btn-secondary btn-sm" data-profile="${escapeHtml(r.id)}">Profile</button>
          <button type="button" class="btn btn-secondary btn-sm" data-edit="${escapeHtml(r.id)}">Edit</button>
        </td>
      </tr>`,
      )
      .join('');
    body.querySelectorAll('[data-profile]').forEach((b) =>
      b.addEventListener('click', () => openTraineeProfile(b.getAttribute('data-profile'))),
    );
    body.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => openTraineeFormEdit(b.getAttribute('data-edit'))));

    if (cards) {
      cards.innerHTML = items
        .map(
          (r) => `<article class="ops-mobile-card">
          <div class="ops-mobile-card-head"><strong>${escapeHtml(r.full_name || '')}</strong><span class="muted">${escapeHtml(r.status || '')}</span></div>
          <p class="muted">${escapeHtml(r.phone || '')} · ${escapeHtml(r.email || '')}</p>
          <button type="button" class="btn btn-secondary btn-block" data-profile="${escapeHtml(r.id)}">View</button>
        </article>`,
        )
        .join('');
      cards.querySelectorAll('[data-profile]').forEach((b) =>
        b.addEventListener('click', () => openTraineeProfile(b.getAttribute('data-profile'))),
      );
    }

    document.getElementById('traineesSelectAll')?.addEventListener('change', (e) => {
      const on = e.target.checked;
      document.querySelectorAll('.trainee-row-check').forEach((c) => {
        c.checked = on;
        if (on) selectedTraineeIds.add(c.getAttribute('data-id'));
        else selectedTraineeIds.delete(c.getAttribute('data-id'));
      });
    });
    document.querySelectorAll('.trainee-row-check').forEach((c) => {
      c.addEventListener('change', () => {
        const id = c.getAttribute('data-id');
        if (c.checked) selectedTraineeIds.add(id);
        else selectedTraineeIds.delete(id);
      });
    });
  } catch (err) {
    if (info) info.textContent = err.message || 'Failed to load trainees';
  }
}

function setupTraineeFormRefs() {
  fillSelect(document.getElementById('tf_trainee_type'), TRAINEE_TYPES, '');
  fillSelect(document.getElementById('tf_city'), CITIES, '');
}

function showTraineeForm(show) {
  document.getElementById('traineeFormCard')?.classList.toggle('hidden', !show);
}

function openTraineeFormNew() {
  setupTraineeFormRefs();
  document.getElementById('traineeFormTitle').textContent = 'New trainee';
  document.getElementById('traineeFormInternalId').value = '';
  document.getElementById('traineeForm').reset();
  document.getElementById('tf_trainee_id_ro').value = '';
  document.getElementById('tf_status').value = 'Active';
  document.getElementById('traineeAdvancedFields')?.classList.add('hidden');
  document.getElementById('traineeFormMsg').textContent = '';
  showTraineeForm(true);
}

async function submitTraineeForm(e) {
  e.preventDefault();
  const msg = document.getElementById('traineeFormMsg');
  const internalId = document.getElementById('traineeFormInternalId').value;
  const payload = {
    full_name: document.getElementById('tf_full_name').value.trim(),
    phone: document.getElementById('tf_phone').value.trim(),
    email: document.getElementById('tf_email').value.trim(),
    trainee_type: document.getElementById('tf_trainee_type').value || null,
    city: document.getElementById('tf_city').value || null,
    company_name: document.getElementById('tf_company_name').value.trim() || null,
    job_title: document.getElementById('tf_job_title').value.trim() || null,
    university: document.getElementById('tf_university').value.trim() || null,
    specialty: document.getElementById('tf_specialty').value.trim() || null,
    company_id: document.getElementById('tf_company_id').value.trim() || null,
    created_date: document.getElementById('tf_created_date').value || null,
    status: document.getElementById('tf_status').value,
    notes: document.getElementById('tf_notes').value.trim() || null,
  };
  if (!payload.full_name || !payload.phone || !payload.email) {
    if (msg) msg.textContent = 'Full name, phone, and email are required.';
    return;
  }
  if (internalId) {
    const tid = document.getElementById('tf_trainee_id_ro').value.trim();
    payload.id = internalId;
    payload.trainee_id = tid;
  }
  try {
    const data = await jsonFetch(`${OPS}?entity=trainees`, {
      method: internalId ? 'PUT' : 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (msg) msg.textContent = 'Saved.';
    if (!internalId && data.item?.trainee_id) document.getElementById('tf_trainee_id_ro').value = data.item.trainee_id;
    await loadTraineesList();
    setTimeout(() => showTraineeForm(false), 600);
  } catch (err) {
    if (msg) msg.textContent = err.message;
  }
}

/* ——— Trainee profile ——— */
async function openTraineeProfile(internalUuid) {
  goToView('trainee-profile');
  try {
    const data = await jsonFetch(`${OPS}?entity=trainees&id=${encodeURIComponent(internalUuid)}&include=enrollments`, {
      headers: getAuthHeaders(),
    });
    profileDetail = data;
    renderTraineeProfile();
  } catch (e) {
    profileDetail = null;
    document.getElementById('traineeProfileHeader').innerHTML = `<p class="inline-error">${escapeHtml(e.message)}</p>`;
  }
}

function renderTraineeProfile() {
  const { item, enrollments, summary } = profileDetail || {};
  const head = document.getElementById('traineeProfileHeader');
  if (!item || !head) return;
  const initials = (item.full_name || '?')
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  head.innerHTML = `<div class="trainee-profile-head-inner">
    <div class="trainee-avatar" aria-hidden="true">${escapeHtml(initials)}</div>
    <div class="trainee-profile-meta">
      <h2>${escapeHtml(item.full_name || '')}</h2>
      <p class="muted">${escapeHtml(item.trainee_id || '')} · ${escapeHtml(item.phone || '')} · ${escapeHtml(item.email || '')}</p>
      <p class="muted">${escapeHtml(item.trainee_type || '')} · ${escapeHtml(item.city || '')}</p>
      <div class="profile-actions">
        <button type="button" class="btn btn-primary profile-action-enroll">+ Enroll</button>
        <button type="button" class="btn btn-secondary profile-action-edit">Edit</button>
      </div>
      <span class="status-pill">${escapeHtml(item.status || '')}</span>
    </div>
  </div>`;
  head.querySelector('.profile-action-enroll')?.addEventListener('click', () => openEnrollmentWizardFromProfile());
  head.querySelector('.profile-action-edit')?.addEventListener('click', () => {
    if (item.id) void openTraineeFormEdit(item.id);
  });
  const ov = document.getElementById('profileTabOverview');
  if (ov) {
    ov.innerHTML = `<p><strong>Total enrollments:</strong> ${summary?.enrollment_count ?? 0} · <strong>Total paid (EGP):</strong> ${summary?.total_paid ?? 0}</p>
      <table class="ops-data-table"><tbody>
        <tr><th>Company</th><td>${escapeHtml(item.company_name || '—')}</td></tr>
        <tr><th>Job title</th><td>${escapeHtml(item.job_title || '—')}</td></tr>
        <tr><th>University</th><td>${escapeHtml(item.university || '—')}</td></tr>
        <tr><th>Notes</th><td>${escapeHtml(item.notes || '—')}</td></tr>
      </tbody></table>`;
  }
  const en = document.getElementById('profileTabEnrollments');
  if (en) {
    if (!(enrollments || []).length) {
      en.innerHTML = '<p class="muted">This trainee has no enrollments yet. Use + Enroll to add one.</p>';
    } else {
      en.innerHTML = `<div class="table-wrap"><table class="ops-data-table"><thead><tr>
        <th>Course</th><th>Batch</th><th>Status</th><th>Payment</th><th>Amount</th><th></th></tr></thead><tbody>
        ${enrollments
          .map(
            (r) => `<tr>
          <td>${escapeHtml(r.course_name || r.course_id || '')}</td>
          <td>${escapeHtml(r.batch_name || r.batch_id || '')}</td>
          <td>${escapeHtml(r.enrollment_status || '')}</td>
          <td>${escapeHtml(r.payment_status || '')}</td>
          <td>${r.amount_paid ?? ''}</td>
          <td><button type="button" class="btn btn-secondary btn-sm btn-pe" data-eid="${escapeHtml(r.id)}">Payment</button></td>
        </tr>`,
          )
          .join('')}
      </tbody></table></div>`;
      en.querySelectorAll('.btn-pe').forEach((b) => {
        b.addEventListener('click', () => openPaymentEditor(enrollments.find((x) => x.id === b.getAttribute('data-eid'))));
      });
    }
  }
  const notes = document.getElementById('profileTabNotes');
  if (notes) {
    notes.innerHTML = `<label for="profileNotesTa">Notes (saved on trainee record)</label>
      <textarea id="profileNotesTa" rows="4" class="full">${escapeHtml(item.notes || '')}</textarea>
      <button type="button" class="btn btn-primary" id="btnSaveProfileNotes">Save notes</button>
      <p id="profileNotesMsg" class="inline-note"></p>`;
    document.getElementById('btnSaveProfileNotes')?.addEventListener('click', async () => {
      const ta = document.getElementById('profileNotesTa');
      const m = document.getElementById('profileNotesMsg');
      try {
        await jsonFetch(`${OPS}?entity=trainees`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            id: item.id,
            trainee_id: item.trainee_id,
            full_name: item.full_name,
            phone: item.phone,
            email: item.email,
            trainee_type: item.trainee_type,
            company_name: item.company_name,
            job_title: item.job_title,
            university: item.university,
            specialty: item.specialty,
            city: item.city,
            company_id: item.company_id,
            created_date: item.created_date,
            status: item.status,
            notes: ta.value.trim() || null,
          }),
        });
        if (m) m.textContent = 'Notes saved.';
        item.notes = ta.value;
      } catch (err) {
        if (m) m.textContent = err.message;
      }
    });
  }

  document.querySelectorAll('.profile-tab').forEach((t) => t.classList.remove('active'));
  document.querySelector('.profile-tab[data-tab="overview"]')?.classList.add('active');
  document.getElementById('profileTabOverview')?.classList.remove('hidden');
  document.getElementById('profileTabEnrollments')?.classList.add('hidden');
  document.getElementById('profileTabNotes')?.classList.add('hidden');
}

function bindProfileTabs() {
  document.querySelectorAll('.profile-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      document.querySelectorAll('.profile-tab').forEach((b) => b.classList.toggle('active', b === btn));
      document.getElementById('profileTabOverview')?.classList.toggle('hidden', tab !== 'overview');
      document.getElementById('profileTabEnrollments')?.classList.toggle('hidden', tab !== 'enrollments');
      document.getElementById('profileTabNotes')?.classList.toggle('hidden', tab !== 'notes');
    });
  });
}

/* ——— Courses ——— */
function coursesParams() {
  const q = document.getElementById('coursesListQ')?.value.trim() || '';
  const p = new URLSearchParams({
    entity: 'courses',
    page: String(coursesState.page),
    pageSize: String(coursesState.pageSize),
    sort: 'created_at',
    dir: 'desc',
  });
  if (q) p.set('q', q);
  return p.toString();
}

async function loadCoursesList() {
  const body = document.getElementById('coursesTableBody');
  const info = document.getElementById('coursesPageInfo');
  if (!body) return;
  try {
    const data = await jsonFetch(`${OPS}?${coursesParams()}`, { headers: getAuthHeaders() });
    coursesState.total = data.total || 0;
    const items = data.items || [];
    if (info) info.textContent = `Page ${coursesState.page} · ${coursesState.total} total`;
    body.innerHTML = items
      .map(
        (r) => `<tr>
      <td>${escapeHtml(r.course_id)}</td>
      <td>${escapeHtml(r.course_name || '')}</td>
      <td>${escapeHtml(r.category || '')}</td>
      <td>${escapeHtml(r.delivery_type || '')}</td>
      <td>${r.price ?? ''}</td>
      <td>${escapeHtml(r.status || '')}</td>
      <td><button type="button" class="btn btn-secondary btn-sm" data-edit-course="${escapeHtml(r.id)}">Edit</button></td>
    </tr>`,
      )
      .join('');
    body.querySelectorAll('[data-edit-course]').forEach((b) =>
      b.addEventListener('click', () => openCourseForm((data.items || []).find((x) => x.id === b.getAttribute('data-edit-course')))),
    );
  } catch (e) {
    if (info) info.textContent = e.message;
  }
}

function setupCourseForm() {
  fillSelect(document.getElementById('cf_category'), COURSE_CATEGORIES, '');
  fillSelect(document.getElementById('cf_target_audience'), TARGET_AUDIENCES, '');
  fillSelect(document.getElementById('cf_delivery_type'), DELIVERY_TYPES, '');
}

function openCourseForm(row) {
  setupCourseForm();
  document.getElementById('courseFormCard')?.classList.remove('hidden');
  document.getElementById('courseFormMsg').textContent = '';
  if (!row) {
    document.getElementById('courseFormTitle').textContent = 'New course';
    document.getElementById('courseForm').reset();
    document.getElementById('cf_internal_id').value = '';
    document.getElementById('cf_course_id_ro').value = '';
    document.getElementById('cf_status').value = 'Active';
    return;
  }
  document.getElementById('courseFormTitle').textContent = 'Edit course';
  document.getElementById('cf_internal_id').value = row.id;
  document.getElementById('cf_course_name').value = row.course_name || '';
  document.getElementById('cf_category').value = row.category || '';
  document.getElementById('cf_target_audience').value = row.target_audience || '';
  document.getElementById('cf_duration_hours').value = row.duration_hours ?? '';
  document.getElementById('cf_delivery_type').value = row.delivery_type || '';
  document.getElementById('cf_price').value = row.price ?? '';
  document.getElementById('cf_description').value = row.description || '';
  document.getElementById('cf_status').value = row.status || 'Active';
  document.getElementById('cf_course_id_ro').value = row.course_id || '';
}

async function submitCourseForm(e) {
  e.preventDefault();
  const id = document.getElementById('cf_internal_id').value;
  const payload = {
    course_name: document.getElementById('cf_course_name').value.trim(),
    category: document.getElementById('cf_category').value || null,
    target_audience: document.getElementById('cf_target_audience').value || null,
    duration_hours: document.getElementById('cf_duration_hours').value || null,
    delivery_type: document.getElementById('cf_delivery_type').value || null,
    price: document.getElementById('cf_price').value || null,
    description: document.getElementById('cf_description').value.trim() || null,
    status: document.getElementById('cf_status').value,
  };
  if (id) {
    payload.id = id;
    payload.course_id = document.getElementById('cf_course_id_ro').value.trim();
  }
  try {
    await jsonFetch(`${OPS}?entity=courses`, {
      method: id ? 'PUT' : 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    document.getElementById('courseFormCard')?.classList.add('hidden');
    await loadCoursesList();
  } catch (err) {
    document.getElementById('courseFormMsg').textContent = err.message;
  }
}

/* ——— Batches ——— */
async function loadCourseOptionsForBatchFilter() {
  const sel = document.getElementById('batchesFilterCourse');
  if (!sel) return;
  try {
    const data = await jsonFetch(`${OPS}?entity=courses&page=1&pageSize=500`, { headers: getAuthHeaders() });
    const opts = [`<option value="">All courses</option>`].concat(
      (data.items || []).map((c) => `<option value="${escapeHtml(c.course_id)}">${escapeHtml(c.course_name)} (${escapeHtml(c.course_id)})</option>`),
    );
    sel.innerHTML = opts.join('');
  } catch (_) {
    /* ignore */
  }
}

function batchesParams() {
  const q = document.getElementById('batchesListQ')?.value.trim() || '';
  const course_id = document.getElementById('batchesFilterCourse')?.value || '';
  const p = new URLSearchParams({
    entity: 'batches',
    page: String(batchesState.page),
    pageSize: String(batchesState.pageSize),
    sort: 'created_at',
    dir: 'desc',
  });
  if (q) p.set('q', q);
  if (course_id) p.set('course_id', course_id);
  return p.toString();
}

async function loadBatchesList() {
  const body = document.getElementById('batchesTableBody');
  const info = document.getElementById('batchesPageInfo');
  if (!body) return;
  try {
    const data = await jsonFetch(`${OPS}?${batchesParams()}`, { headers: getAuthHeaders() });
    batchesState.total = data.total || 0;
    const items = data.items || [];
    if (info) info.textContent = `Page ${batchesState.page} · ${batchesState.total} total`;
    body.innerHTML = items
      .map(
        (r) => `<tr>
      <td>${escapeHtml(r.batch_id)}</td>
      <td>${escapeHtml(r.course_id || '')}</td>
      <td>${escapeHtml(r.batch_name || '')}</td>
      <td>${escapeHtml(r.start_date || '')}–${escapeHtml(r.end_date || '')}</td>
      <td>${escapeHtml(r.trainer || '')}</td>
      <td>${r.capacity ?? ''}</td>
      <td>${r.enrolled_count ?? 0}</td>
      <td><button type="button" class="btn btn-secondary btn-sm" data-edit-batch="${escapeHtml(r.id)}">Edit</button></td>
    </tr>`,
      )
      .join('');
    body.querySelectorAll('[data-edit-batch]').forEach((b) => {
      b.addEventListener('click', async () => {
        const id = b.getAttribute('data-edit-batch');
        const all = await jsonFetch(`${OPS}?${batchesParams()}`, { headers: getAuthHeaders() });
        const row = (all.items || []).find((x) => x.id === id);
        if (row) openBatchForm(row);
      });
    });
  } catch (e) {
    if (info) info.textContent = e.message;
  }
}

async function refreshBatchCourseDatalist() {
  const dl = document.getElementById('datalist_batch_course_pick');
  if (!dl) return;
  const data = await jsonFetch(`${OPS}?entity=courses&page=1&pageSize=500`, { headers: getAuthHeaders() });
  dl.innerHTML = (data.items || [])
    .map((c) => `<option value="${escapeHtml(c.course_id)}">${escapeHtml(c.course_name)}</option>`)
    .join('');
}

function openBatchForm(row) {
  document.getElementById('batchFormCard')?.classList.remove('hidden');
  document.getElementById('batchFormMsg').textContent = '';
  void refreshBatchCourseDatalist();
  if (!row) {
    document.getElementById('batchFormTitle').textContent = 'New batch';
    document.getElementById('batchForm').reset();
    document.getElementById('bf_internal_id').value = '';
    document.getElementById('bf_course_id').value = '';
    document.getElementById('bf_batch_id_ro').value = '';
    return;
  }
  document.getElementById('batchFormTitle').textContent = 'Edit batch';
  document.getElementById('bf_internal_id').value = row.id;
  document.getElementById('bf_course_pick').value = row.course_id || '';
  document.getElementById('bf_course_id').value = row.course_id || '';
  document.getElementById('bf_batch_name').value = row.batch_name || '';
  document.getElementById('bf_trainer').value = row.trainer || '';
  document.getElementById('bf_location').value = row.location || '';
  document.getElementById('bf_capacity').value = row.capacity ?? '';
  document.getElementById('bf_start_date').value = row.start_date || '';
  document.getElementById('bf_end_date').value = row.end_date || '';
  document.getElementById('bf_batch_id_ro').value = row.batch_id || '';
}

async function submitBatchForm(e) {
  e.preventDefault();
  const pick = document.getElementById('bf_course_pick').value.trim();
  let course_id = document.getElementById('bf_course_id').value.trim();
  if (!course_id && pick) {
    const data = await jsonFetch(`${OPS}?entity=courses&page=1&pageSize=500&q=${encodeURIComponent(pick)}`, { headers: getAuthHeaders() });
    const match =
      (data.items || []).find((c) => c.course_id === pick) || (data.items || []).find((c) => (c.course_name || '').toLowerCase() === pick.toLowerCase());
    course_id = match ? match.course_id : pick;
  }
  document.getElementById('bf_course_id').value = course_id;
  const id = document.getElementById('bf_internal_id').value;
  const payload = {
    course_id,
    batch_name: document.getElementById('bf_batch_name').value.trim() || null,
    trainer: document.getElementById('bf_trainer').value.trim() || null,
    location: document.getElementById('bf_location').value.trim() || null,
    capacity: document.getElementById('bf_capacity').value || null,
    start_date: document.getElementById('bf_start_date').value || null,
    end_date: document.getElementById('bf_end_date').value || null,
  };
  if (id) {
    payload.id = id;
    payload.batch_id = document.getElementById('bf_batch_id_ro').value.trim();
  }
  if (!course_id) {
    document.getElementById('batchFormMsg').textContent = 'Select a valid course.';
    return;
  }
  try {
    await jsonFetch(`${OPS}?entity=batches`, {
      method: id ? 'PUT' : 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    document.getElementById('batchFormCard')?.classList.add('hidden');
    await loadBatchesList();
  } catch (err) {
    document.getElementById('batchFormMsg').textContent = err.message;
  }
}

/* ——— Enrollments + wizard ——— */
function enrollmentsParams() {
  const q = document.getElementById('enrollmentsListQ')?.value.trim() || '';
  const p = new URLSearchParams({
    entity: 'enrollments',
    page: String(enrollmentsState.page),
    pageSize: String(enrollmentsState.pageSize),
    sort: 'created_at',
    dir: 'desc',
  });
  if (q) p.set('q', q);
  const es = document.getElementById('enrollmentsFilterStatus')?.value;
  const ps = document.getElementById('enrollmentsFilterPay')?.value;
  if (es) p.set('enrollment_status', es);
  if (ps) p.set('payment_status', ps);
  return p.toString();
}

async function loadEnrollmentsList() {
  const body = document.getElementById('enrollmentsTableBody');
  const info = document.getElementById('enrollmentsPageInfo');
  if (!body) return;
  try {
    const data = await jsonFetch(`${OPS}?${enrollmentsParams()}`, { headers: getAuthHeaders() });
    enrollmentsState.total = data.total || 0;
    const items = data.items || [];
    if (info) info.textContent = `Page ${enrollmentsState.page} · ${enrollmentsState.total} total`;
    body.innerHTML = items
      .map(
        (r) => `<tr>
      <td><input type="checkbox" class="enroll-row-check" data-id="${escapeHtml(r.id)}" data-eid="${escapeHtml(r.enrollment_id)}" /></td>
      <td>${escapeHtml(r.enrollment_id)}</td>
      <td>${escapeHtml(r.trainee_name || r.trainee_id)}</td>
      <td>${escapeHtml(r.course_name || r.course_id || '')}</td>
      <td>${escapeHtml(r.batch_name || r.batch_id || '')}</td>
      <td>${escapeHtml(r.enrollment_status || '')}</td>
      <td>${escapeHtml(r.payment_status || '')}</td>
      <td>${r.amount_paid ?? ''}</td>
      <td><button type="button" class="btn btn-secondary btn-sm" data-pay="${escapeHtml(r.id)}">Payment</button></td>
    </tr>`,
      )
      .join('');
    body.querySelectorAll('[data-pay]').forEach((b) => {
      b.addEventListener('click', () => openPaymentEditor(items.find((x) => x.id === b.getAttribute('data-pay'))));
    });
    document.getElementById('enrollSelectAll')?.addEventListener('change', (ev) => {
      const on = ev.target.checked;
      document.querySelectorAll('.enroll-row-check').forEach((c) => {
        c.checked = on;
        syncEnrollBulk();
      });
    });
    document.querySelectorAll('.enroll-row-check').forEach((c) => c.addEventListener('change', syncEnrollBulk));
  } catch (e) {
    if (info) info.textContent = e.message;
  }
}

function syncEnrollBulk() {
  selectedEnrollmentIds.clear();
  document.querySelectorAll('.enroll-row-check:checked').forEach((c) => {
    selectedEnrollmentIds.add(c.getAttribute('data-eid'));
  });
  const bar = document.getElementById('enrollmentsBulkBar');
  const n = selectedEnrollmentIds.size;
  if (bar) {
    bar.classList.toggle('hidden', n === 0);
    const lbl = document.getElementById('enrollmentsBulkCount');
    if (lbl) lbl.textContent = `${n} selected`;
  }
}

async function ensureWizardCoursesLoaded() {
  const sel = document.getElementById('wiz_course_select');
  if (!sel || sel.dataset.loaded === '1') return;
  sel.innerHTML = '<option value="">Loading courses…</option>';
  try {
    const data = await jsonFetch(`${OPS}?entity=courses&pageSize=500&page=1`, { headers: getAuthHeaders() });
    const items = data.items || [];
    wizardCourseById = {};
    sel.innerHTML =
      '<option value="">Select a course…</option>' +
      items
        .map((c) => {
          wizardCourseById[c.course_id] = c;
          return `<option value="${escapeHtml(c.course_id)}">${escapeHtml(c.course_name)} (${escapeHtml(c.course_id)})</option>`;
        })
        .join('');
    sel.dataset.loaded = '1';
  } catch (_) {
    sel.innerHTML = '<option value="">Could not load courses</option>';
  }
}

async function loadWizardBatchSelect(courseId) {
  const sel = document.getElementById('wiz_batch_select');
  if (!sel) return;
  wizardBatchById = {};
  if (!courseId) {
    sel.innerHTML = '<option value="">Select a course first…</option>';
    sel.disabled = true;
    return;
  }
  sel.disabled = false;
  sel.innerHTML = '<option value="">Loading batches…</option>';
  try {
    const data = await jsonFetch(`${OPS}?entity=batches&course_id=${encodeURIComponent(courseId)}&pageSize=200`, { headers: getAuthHeaders() });
    const items = data.items || [];
    items.forEach((b) => {
      wizardBatchById[b.batch_id] = b;
    });
    sel.innerHTML =
      '<option value="">Select a batch…</option>' +
      items
        .map((b) => {
          const cap = b.capacity != null ? Number(b.capacity) : null;
          const en = b.enrolled_count ?? 0;
          const hint = cap != null ? ` · ${en}/${cap}` : '';
          return `<option value="${escapeHtml(b.batch_id)}">${escapeHtml(b.batch_name || b.batch_id)}${hint}</option>`;
        })
        .join('');
    if (!items.length) sel.innerHTML = '<option value="">No batches for this course</option>';
  } catch (_) {
    sel.innerHTML = '<option value="">Could not load batches</option>';
  }
}

/** Open enrollment wizard from trainee profile with trainee pre-selected (skips step 1). */
function openEnrollmentWizardFromProfile() {
  const item = profileDetail?.item;
  if (!item?.id || !item.trainee_id) return;
  resetWizard();
  wizard.trainee = {
    id: item.id,
    trainee_id: item.trainee_id,
    full_name: item.full_name || '',
  };
  const sel = document.getElementById('wiz_trainee_selected');
  if (sel) sel.textContent = `Selected: ${wizard.trainee.full_name} (${wizard.trainee.trainee_id})`;
  const next1 = document.getElementById('btnWizNext1');
  if (next1) next1.disabled = false;
  goToView('operations-enrollments');
  document.getElementById('enrollmentWizardCard')?.classList.remove('hidden');
  setWizardStep(2);
}

function resetWizard() {
  wizard.step = 1;
  wizard.trainee = null;
  wizard.course = null;
  wizard.batch = null;
  document.getElementById('wiz_trainee_search').value = '';
  document.getElementById('wiz_course_search').value = '';
  document.getElementById('wiz_trainee_results').innerHTML = '';
  document.getElementById('wiz_course_results').innerHTML = '';
  document.getElementById('wiz_trainee_selected').textContent = '';
  document.getElementById('wiz_course_selected').textContent = '';
  document.getElementById('wiz_batch_cards').innerHTML = '';
  const wcs = document.getElementById('wiz_course_select');
  const wbs = document.getElementById('wiz_batch_select');
  if (wcs) wcs.value = '';
  if (wbs) {
    wbs.innerHTML = '<option value="">Select a course first…</option>';
    wbs.disabled = true;
  }
  document.getElementById('wizMsg').textContent = '';
  fillSelect(document.getElementById('wiz_enrollment_status'), ENROLLMENT_STATUSES);
  fillSelect(document.getElementById('wiz_payment_status'), PAYMENT_STATUSES);
  const d = new Date();
  document.getElementById('wiz_enroll_date').value = d.toISOString().slice(0, 10);
  document.getElementById('wiz_amount_paid').value = '';
  document.getElementById('wiz_notes').value = '';
  wizToggleAmount();
}

function setWizardStep(n) {
  wizard.step = n;
  document.querySelectorAll('.wizard-step').forEach((el) => el.classList.toggle('active', el.getAttribute('data-step') === String(n)));
  document.getElementById('wizStep1').classList.toggle('hidden', n !== 1);
  document.getElementById('wizStep2').classList.toggle('hidden', n !== 2);
  document.getElementById('wizStep3').classList.toggle('hidden', n !== 3);
  document.getElementById('btnWizNext1').disabled = !wizard.trainee;
  document.getElementById('btnWizNext2').disabled = !(wizard.course && wizard.batch);
  if (n === 2) void ensureWizardCoursesLoaded();
}

function wizToggleAmount() {
  const ps = document.getElementById('wiz_payment_status')?.value;
  const wrap = document.getElementById('wiz_amount_wrap');
  if (!wrap) return;
  const show = ps === 'Paid';
  wrap.style.display = show ? '' : 'none';
  if (!show) document.getElementById('wiz_amount_paid').value = '';
}

async function wizSearchTrainees(q) {
  const box = document.getElementById('wiz_trainee_results');
  if (!box) return;
  if (q.length < 2) {
    box.innerHTML = '';
    return;
  }
  const data = await jsonFetch(`${OPS}?resource=search&q=${encodeURIComponent(q)}&limit=12`, { headers: getAuthHeaders() });
  box.innerHTML = (data.results || [])
    .map(
      (r) =>
        `<button type="button" class="ops-ta-item" data-tid="${escapeHtml(r.trainee_id)}" data-iid="${escapeHtml(r.id)}">${escapeHtml(r.full_name)} · ${escapeHtml(
          r.trainee_id,
        )}</button>`,
    )
    .join('');
  box.querySelectorAll('.ops-ta-item').forEach((b) => {
    b.addEventListener('click', () => {
      const tid = b.getAttribute('data-tid');
      const iid = b.getAttribute('data-iid');
      const name = b.textContent.split(' · ')[0];
      wizard.trainee = { trainee_id: tid, id: iid, full_name: name };
      document.getElementById('wiz_trainee_selected').textContent = `Selected: ${name} (${tid})`;
      setWizardStep(1);
      document.getElementById('btnWizNext1').disabled = false;
    });
  });
}

async function wizSearchCourses(q) {
  const box = document.getElementById('wiz_course_results');
  if (!box || q.length < 2) {
    if (box) box.innerHTML = '';
    return;
  }
  const data = await jsonFetch(`${OPS}?entity=courses&q=${encodeURIComponent(q)}&pageSize=15`, { headers: getAuthHeaders() });
  const list = data.items || [];
  window.__wizLastCourses = list;
  box.innerHTML = list
    .map(
      (c) =>
        `<button type="button" class="ops-ta-item" data-cid="${escapeHtml(c.course_id)}">${escapeHtml(c.course_name)} (${escapeHtml(c.course_id)})</button>`,
    )
    .join('');
  box.querySelectorAll('.ops-ta-item').forEach((b) => {
    b.addEventListener('click', async () => {
      const cid = b.getAttribute('data-cid');
      const items = window.__wizLastCourses || [];
      wizard.course = items.find((x) => x.course_id === cid) || { course_id: cid, course_name: b.textContent.split('(')[0].trim() };
      document.getElementById('wiz_course_selected').textContent = `Course: ${wizard.course.course_name} (${cid})`;
      const selC = document.getElementById('wiz_course_select');
      if (selC && wizardCourseById[cid]) selC.value = cid;
      await loadWizardBatchSelect(cid);
      await loadWizardBatchCards(cid);
      wizard.batch = null;
      const selB = document.getElementById('wiz_batch_select');
      if (selB) selB.value = '';
      setWizardStep(2);
      document.getElementById('btnWizNext2').disabled = true;
    });
  });
}

async function loadWizardBatchCards(courseId) {
  const host = document.getElementById('wiz_batch_cards');
  if (!host) return;
  const data = await jsonFetch(`${OPS}?entity=batches&course_id=${encodeURIComponent(courseId)}&pageSize=100`, { headers: getAuthHeaders() });
  const items = data.items || [];
  if (!items.length) {
    host.innerHTML = '<p class="muted">No batches for this course yet. Create one under Batches.</p>';
    return;
  }
  host.innerHTML = items
    .map((b) => {
      const cap = b.capacity != null ? Number(b.capacity) : null;
      const en = b.enrolled_count ?? 0;
      let tier = 'cap-ok';
      if (cap && cap > 0) {
        const pct = (100 * en) / cap;
        if (pct >= 100) tier = 'cap-full';
        else if (pct >= 80) tier = 'cap-warn';
      }
      return `<button type="button" class="batch-picker-card ${tier}" data-bid="${escapeHtml(b.batch_id)}" data-json="${escapeHtml(JSON.stringify(b).replace(/"/g, '&quot;'))}">
        <strong>${escapeHtml(b.batch_name || b.batch_id)}</strong>
        <span class="muted">${escapeHtml(b.start_date || '')}–${escapeHtml(b.end_date || '')}</span>
        <span>${escapeHtml(b.trainer || '')} · ${escapeHtml(b.location || '')}</span>
        <span>Enrolled ${en}${cap != null ? ` / ${cap}` : ''}</span>
      </button>`;
    })
    .join('');
  host.querySelectorAll('.batch-picker-card').forEach((card) => {
    card.addEventListener('click', () => {
      const bid = card.getAttribute('data-bid');
      wizard.batch = (items || []).find((x) => x.batch_id === bid);
      const selB = document.getElementById('wiz_batch_select');
      if (selB && bid) selB.value = bid;
      host.querySelectorAll('.batch-picker-card').forEach((c) => c.classList.remove('batch-picker-selected'));
      card.classList.add('batch-picker-selected');
      setWizardStep(2);
      updateWizSummary();
    });
  });
}

function updateWizSummary() {
  const el = document.getElementById('wiz_summary');
  if (!el) return;
  const t = wizard.trainee;
  const c = wizard.course;
  const b = wizard.batch;
  el.innerHTML = `<p><strong>Trainee:</strong> ${escapeHtml(t?.full_name || '')} (${escapeHtml(t?.trainee_id || '')})</p>
    <p><strong>Batch:</strong> ${escapeHtml(b?.batch_name || b?.batch_id || '')} → <strong>Course:</strong> ${escapeHtml(c?.course_name || '')} (${escapeHtml(c?.course_id || '')})</p>`;
}

async function saveWizardEnrollment() {
  const msg = document.getElementById('wizMsg');
  if (!wizard.trainee || !wizard.batch) {
    if (msg) msg.textContent = 'Complete all steps.';
    return;
  }
  const payload = {
    trainee_id: wizard.trainee.trainee_id,
    batch_id: wizard.batch.batch_id,
    enrollment_status: document.getElementById('wiz_enrollment_status').value,
    payment_status: document.getElementById('wiz_payment_status').value,
    amount_paid: document.getElementById('wiz_amount_paid').value || null,
    enroll_date: document.getElementById('wiz_enroll_date').value || null,
    notes: document.getElementById('wiz_notes').value.trim() || null,
  };
  if (payload.payment_status === 'Paid' && (!payload.amount_paid || Number(payload.amount_paid) <= 0)) {
    if (msg) msg.textContent = 'Enter amount paid for Paid status.';
    return;
  }
  if (payload.payment_status === 'Waived') payload.amount_paid = null;
  try {
    await jsonFetch(`${OPS}?entity=enrollments`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (msg) msg.textContent = 'Enrollment saved.';
    await loadEnrollmentsList();
  } catch (e) {
    if (msg) msg.textContent = e.message;
  }
}

function openPaymentEditor(row) {
  if (!row) return;
  document.getElementById('paymentEditCard')?.classList.remove('hidden');
  document.getElementById('pe_enrollment_internal_id').value = row.id;
  document.getElementById('pe_enrollment_label').textContent = `${row.enrollment_id} · ${row.trainee_id}`;
  fillSelect(document.getElementById('pe_payment_status'), PAYMENT_STATUSES);
  document.getElementById('pe_payment_status').value = row.payment_status || 'Pending';
  document.getElementById('pe_amount_paid').value = row.amount_paid ?? '';
  document.getElementById('pe_notes').value = row.notes || '';
  document.getElementById('peMsg').textContent = '';
  window.__peRow = row;
}

async function savePaymentEditor() {
  const row = window.__peRow;
  const msg = document.getElementById('peMsg');
  if (!row) return;
  const payment_status = document.getElementById('pe_payment_status').value;
  const amount_paid = document.getElementById('pe_amount_paid').value;
  const notes = document.getElementById('pe_notes').value.trim() || null;
  if (payment_status === 'Paid' && (!amount_paid || Number(amount_paid) <= 0)) {
    if (msg) msg.textContent = 'Amount paid required when status is Paid.';
    return;
  }
  const payload = {
    id: row.id,
    enrollment_id: row.enrollment_id,
    trainee_id: row.trainee_id,
    batch_id: row.batch_id,
    enrollment_status: row.enrollment_status,
    payment_status,
    amount_paid: payment_status === 'Waived' ? null : amount_paid || null,
    certificate_issued: row.certificate_issued,
    enroll_date: row.enroll_date,
    notes: notes != null ? notes : row.notes,
  };
  try {
    await jsonFetch(`${OPS}?entity=enrollments`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    document.getElementById('paymentEditCard')?.classList.add('hidden');
    await loadEnrollmentsList();
    if (profileDetail && profileDetail.item) await openTraineeProfile(profileDetail.item.id);
  } catch (e) {
    if (msg) msg.textContent = e.message;
  }
}

async function openTraineeFormEdit(internalId) {
  setupTraineeFormRefs();
  try {
    const data = await jsonFetch(`${OPS}?entity=trainees&id=${encodeURIComponent(internalId)}`, { headers: getAuthHeaders() });
    const row = data.item;
    if (!row) throw new Error('Trainee not found');
    document.getElementById('traineeFormTitle').textContent = 'Edit trainee';
    document.getElementById('traineeFormInternalId').value = row.id;
    document.getElementById('tf_full_name').value = row.full_name || '';
    document.getElementById('tf_phone').value = row.phone || '';
    document.getElementById('tf_email').value = row.email || '';
    document.getElementById('tf_trainee_type').value = row.trainee_type || '';
    document.getElementById('tf_city').value = row.city || '';
    document.getElementById('tf_company_name').value = row.company_name || '';
    document.getElementById('tf_job_title').value = row.job_title || '';
    document.getElementById('tf_university').value = row.university || '';
    document.getElementById('tf_specialty').value = row.specialty || '';
    document.getElementById('tf_company_id').value = row.company_id || '';
    document.getElementById('tf_created_date').value = row.created_date || '';
    document.getElementById('tf_status').value = row.status || 'Active';
    document.getElementById('tf_notes').value = row.notes || '';
    document.getElementById('tf_trainee_id_ro').value = row.trainee_id || '';
    document.getElementById('traineeFormMsg').textContent = '';
    goToView('operations-trainees');
    showTraineeForm(true);
  } catch (e) {
    alert(e.message);
  }
}

function buildTraineeTypeCityFilters() {
  const ft = document.getElementById('traineesFilterType');
  const fc = document.getElementById('traineesFilterCity');
  if (ft) {
    ft.innerHTML = `<option value="">All types</option>${TRAINEE_TYPES.map((t) => `<option value="${t}">${t}</option>`).join('')}`;
  }
  if (fc) {
    fc.innerHTML = `<option value="">All cities</option>${CITIES.map((t) => `<option value="${t}">${t}</option>`).join('')}`;
  }
}

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

async function runExcelImport(arrayBuffer, entity) {
  const msg = document.getElementById('bulkImportMsg');
  if (typeof XLSX === 'undefined') {
    if (msg) msg.textContent = 'Excel library failed to load.';
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
    if (msg) msg.textContent = 'No data rows found.';
    return;
  }
  if (msg) msg.textContent = `Importing ${rows.length} row(s)…`;
  let imported = 0;
  let failed = 0;
  const errorSamples = [];
  for (let offset = 0; offset < rows.length; offset += BULK_IMPORT_CHUNK) {
    const chunk = rows.slice(offset, offset + BULK_IMPORT_CHUNK);
    try {
      const data = await jsonFetch(`${OPS}?entity=${encodeURIComponent(entity)}&bulk=1`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ items: chunk }),
      });
      imported += data.imported || 0;
      failed += data.failed || 0;
      if (data.errors && data.errors.length) {
        data.errors.forEach((er) => {
          if (errorSamples.length < 8) errorSamples.push(`row ${offset + er.index + 1}: ${er.message}`);
        });
      }
    } catch (err) {
      if (msg) msg.textContent = err.message || 'Import failed.';
      return;
    }
  }
  let text = `Imported ${imported} row(s).`;
  if (failed) text += ` ${failed} validation error(s).`;
  if (errorSamples.length) text += ` Examples: ${errorSamples.join('; ')}`;
  if (msg) msg.textContent = text;
  if (entity === 'trainees') await loadTraineesList();
  if (entity === 'courses') await loadCoursesList();
  if (entity === 'batches') await loadBatchesList();
  if (entity === 'enrollments') await loadEnrollmentsList();
}

export function initOperations() {
  buildTraineeTypeCityFilters();
  bindProfileTabs();
  setupTraineeFormRefs();

  document.getElementById('btnProfileBack')?.addEventListener('click', () => goToView('operations-trainees'));

  document.getElementById('btnNewTrainee')?.addEventListener('click', openTraineeFormNew);
  document.getElementById('btnTraineeFormCancel')?.addEventListener('click', () => showTraineeForm(false));
  document.getElementById('traineeForm')?.addEventListener('submit', submitTraineeForm);
  document.getElementById('btnTraineesRefresh')?.addEventListener('click', () => {
    traineesState.page = 1;
    loadTraineesList();
  });
  document.getElementById('traineesListQ')?.addEventListener(
    'input',
    debounce(() => {
      traineesState.page = 1;
      loadTraineesList();
    }, 320),
  );
  ['traineesFilterType', 'traineesFilterCity', 'traineesFilterStatus', 'traineesSort'].forEach((id) => {
    document.getElementById(id)?.addEventListener('change', () => {
      traineesState.page = 1;
      loadTraineesList();
    });
  });
  document.getElementById('btnTraineesPrev')?.addEventListener('click', () => {
    if (traineesState.page > 1) {
      traineesState.page -= 1;
      loadTraineesList();
    }
  });
  document.getElementById('btnTraineesNext')?.addEventListener('click', () => {
    const maxPage = Math.ceil(traineesState.total / traineesState.pageSize) || 1;
    if (traineesState.page < maxPage) {
      traineesState.page += 1;
      loadTraineesList();
    }
  });

  document.getElementById('btnTraineeAdvancedToggle')?.addEventListener('click', () => {
    const adv = document.getElementById('traineeAdvancedFields');
    const btn = document.getElementById('btnTraineeAdvancedToggle');
    if (!adv) return;
    const hidden = adv.classList.toggle('hidden');
    if (btn) btn.textContent = hidden ? 'Show advanced options' : 'Hide advanced options';
  });

  const gSearch = document.getElementById('opsGlobalSearchInput');
  gSearch?.addEventListener('input', () => {
    clearTimeout(globalSearchTimer);
    const v = gSearch.value.trim();
    globalSearchTimer = setTimeout(() => runGlobalSearch(v), 300);
  });
  document.addEventListener('click', (ev) => {
    const box = document.getElementById('opsGlobalSearchResults');
    if (box && !box.contains(ev.target) && ev.target !== gSearch) box.classList.add('hidden');
  });

  document.getElementById('btnNewCourse')?.addEventListener('click', () => openCourseForm(null));
  document.getElementById('courseForm')?.addEventListener('submit', submitCourseForm);
  document.getElementById('btnCourseCancel')?.addEventListener('click', () => document.getElementById('courseFormCard')?.classList.add('hidden'));
  document.getElementById('btnCoursesRefresh')?.addEventListener('click', () => {
    coursesState.page = 1;
    loadCoursesList();
  });
  document.getElementById('coursesListQ')?.addEventListener('input', debounce(loadCoursesList, 300));
  document.getElementById('btnCoursesPrev')?.addEventListener('click', () => {
    if (coursesState.page > 1) {
      coursesState.page -= 1;
      loadCoursesList();
    }
  });
  document.getElementById('btnCoursesNext')?.addEventListener('click', () => {
    const maxPage = Math.ceil(coursesState.total / coursesState.pageSize) || 1;
    if (coursesState.page < maxPage) {
      coursesState.page += 1;
      loadCoursesList();
    }
  });

  document.getElementById('btnNewBatch')?.addEventListener('click', () => openBatchForm(null));
  document.getElementById('batchForm')?.addEventListener('submit', submitBatchForm);
  document.getElementById('btnBatchCancel')?.addEventListener('click', () => document.getElementById('batchFormCard')?.classList.add('hidden'));
  document.getElementById('btnBatchesRefresh')?.addEventListener('click', () => {
    batchesState.page = 1;
    loadBatchesList();
  });
  document.getElementById('batchesListQ')?.addEventListener('input', debounce(loadBatchesList, 300));
  document.getElementById('batchesFilterCourse')?.addEventListener('change', loadBatchesList);
  document.getElementById('btnBatchesPrev')?.addEventListener('click', () => {
    if (batchesState.page > 1) {
      batchesState.page -= 1;
      loadBatchesList();
    }
  });
  document.getElementById('btnBatchesNext')?.addEventListener('click', () => {
    const maxPage = Math.ceil(batchesState.total / batchesState.pageSize) || 1;
    if (batchesState.page < maxPage) {
      batchesState.page += 1;
      loadBatchesList();
    }
  });
  document.getElementById('bf_course_pick')?.addEventListener('change', (e) => {
    document.getElementById('bf_course_id').value = e.target.value.trim();
  });

  document.getElementById('btnStartEnrollmentWizard')?.addEventListener('click', () => {
    resetWizard();
    document.getElementById('enrollmentWizardCard')?.classList.remove('hidden');
    setWizardStep(1);
  });
  document.getElementById('btnWizCancel')?.addEventListener('click', () => {
    document.getElementById('enrollmentWizardCard')?.classList.add('hidden');
  });
  document.getElementById('btnWizNext1')?.addEventListener('click', () => setWizardStep(2));
  document.getElementById('btnWizBack2')?.addEventListener('click', () => setWizardStep(1));
  document.getElementById('btnWizNext2')?.addEventListener('click', () => {
    updateWizSummary();
    setWizardStep(3);
  });
  document.getElementById('btnWizBack3')?.addEventListener('click', () => setWizardStep(2));
  document.getElementById('btnWizSave')?.addEventListener('click', saveWizardEnrollment);
  document.getElementById('btnWizAnother')?.addEventListener('click', () => {
    const keepBatch = wizard.batch;
    const keepCourse = wizard.course;
    resetWizard();
    wizard.batch = keepBatch;
    wizard.course = keepCourse;
    setWizardStep(1);
    if (keepCourse) {
      void (async () => {
        await ensureWizardCoursesLoaded();
        const selC = document.getElementById('wiz_course_select');
        if (selC && keepCourse.course_id) selC.value = keepCourse.course_id;
        await loadWizardBatchSelect(keepCourse.course_id);
        const selB = document.getElementById('wiz_batch_select');
        if (selB && keepBatch?.batch_id) selB.value = keepBatch.batch_id;
        await loadWizardBatchCards(keepCourse.course_id);
        if (keepBatch?.batch_id) {
          document.querySelectorAll('.batch-picker-card').forEach((c) => {
            c.classList.toggle('batch-picker-selected', c.getAttribute('data-bid') === keepBatch.batch_id);
          });
        }
      })();
    }
  });
  document.getElementById('wiz_course_select')?.addEventListener('change', async (e) => {
    const cid = e.target.value;
    wizard.course = cid ? wizardCourseById[cid] : null;
    wizard.batch = null;
    document.getElementById('wiz_course_results').innerHTML = '';
    document.getElementById('wiz_course_search').value = '';
    document.getElementById('wiz_course_selected').textContent = wizard.course ? `Course: ${wizard.course.course_name} (${cid})` : '';
    document.getElementById('wiz_batch_cards').innerHTML = '';
    await loadWizardBatchSelect(cid);
    setWizardStep(2);
  });
  document.getElementById('wiz_batch_select')?.addEventListener('change', (e) => {
    const bid = e.target.value;
    wizard.batch = bid ? wizardBatchById[bid] : null;
    const host = document.getElementById('wiz_batch_cards');
    if (host) {
      host.querySelectorAll('.batch-picker-card').forEach((c) => {
        c.classList.toggle('batch-picker-selected', bid && c.getAttribute('data-bid') === bid);
      });
    }
    setWizardStep(2);
    updateWizSummary();
  });
  document.getElementById('wiz_trainee_search')?.addEventListener('input', debounce((e) => void wizSearchTrainees(e.target.value.trim()), 300));
  document.getElementById('wiz_course_search')?.addEventListener('input', debounce((e) => void wizSearchCourses(e.target.value.trim()), 300));
  document.getElementById('wiz_payment_status')?.addEventListener('change', wizToggleAmount);

  document.getElementById('btnEnrollmentsRefresh')?.addEventListener('click', loadEnrollmentsList);
  document.getElementById('enrollmentsListQ')?.addEventListener('input', debounce(loadEnrollmentsList, 300));
  document.getElementById('enrollmentsFilterStatus')?.addEventListener('change', loadEnrollmentsList);
  document.getElementById('enrollmentsFilterPay')?.addEventListener('change', loadEnrollmentsList);
  document.getElementById('btnEnrollmentsPrev')?.addEventListener('click', () => {
    if (enrollmentsState.page > 1) {
      enrollmentsState.page -= 1;
      loadEnrollmentsList();
    }
  });
  document.getElementById('btnEnrollmentsNext')?.addEventListener('click', () => {
    const maxPage = Math.ceil(enrollmentsState.total / enrollmentsState.pageSize) || 1;
    if (enrollmentsState.page < maxPage) {
      enrollmentsState.page += 1;
      loadEnrollmentsList();
    }
  });
  document.getElementById('btnEnrollmentsBulkApply')?.addEventListener('click', async () => {
    const ids = [...selectedEnrollmentIds];
    const es = document.getElementById('enrollmentsBulkEnrollmentStatus')?.value || '';
    const ps = document.getElementById('enrollmentsBulkPaymentStatus')?.value || '';
    if (!ids.length) return;
    if (!es && !ps) {
      alert('Select an enrollment and/or payment status to apply.');
      return;
    }
    const body = { enrollment_ids: ids };
    if (es) body.enrollment_status = es;
    if (ps) body.payment_status = ps;
    try {
      await jsonFetch(`${OPS}?resource=bulk-enrollments`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });
      await loadEnrollmentsList();
      document.getElementById('enrollmentsBulkBar')?.classList.add('hidden');
    } catch (e) {
      alert(e.message);
    }
  });

  document.getElementById('btnPaymentSave')?.addEventListener('click', savePaymentEditor);
  document.getElementById('btnPaymentCancel')?.addEventListener('click', () => document.getElementById('paymentEditCard')?.classList.add('hidden'));

  document.getElementById('excelImportFile')?.addEventListener('change', async (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    if (!/\.xlsx$/i.test(f.name || '')) {
      document.getElementById('bulkImportMsg').textContent = 'Choose a .xlsx file.';
      return;
    }
    const entity = document.getElementById('bulkEntitySelect')?.value || 'enrollments';
    await runExcelImport(await f.arrayBuffer(), entity);
  });
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
    const payment_status = String(document.getElementById('bulkPaymentStatus')?.value || '');
    const amountPaidEl = document.getElementById('bulkAmountPaid');
    const amount_paid = amountPaidEl && amountPaidEl.value !== '' ? amountPaidEl.value : undefined;
    if (!enrollment_ids.length) {
      if (msg) msg.textContent = 'Enter at least one enrollment ID.';
      return;
    }
    if (!enrollment_status && !payment_status) {
      if (msg) msg.textContent = 'Select enrollment status and/or payment status.';
      return;
    }
    if (!confirm(`Apply bulk update to ${enrollment_ids.length} enrollment(s)?`)) return;
    try {
      const body = { enrollment_ids };
      if (enrollment_status) body.enrollment_status = enrollment_status;
      if (payment_status) body.payment_status = payment_status;
      if (amount_paid !== undefined) body.amount_paid = amount_paid;
      const data = await jsonFetch(`${OPS}?resource=bulk-enrollments`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });
      if (msg) msg.textContent = `Updated ${data.updated} row(s).`;
    } catch (err) {
      if (msg) msg.textContent = err.message;
    }
  });
}

export async function loadPipeline() {
  const grid = document.getElementById('pipelineGrid');
  const msg = document.getElementById('pipelineMsg');
  if (!grid) return;
  try {
    const data = await jsonFetch(`${OPS}?resource=pipeline`, { headers: getAuthHeaders() });
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
    const data = await jsonFetch(`${OPS}?resource=capacity`, { headers: getAuthHeaders() });
    body.innerHTML = (data.capacity || [])
      .map(
        (r) =>
          `<tr><td>${r.batch_id ?? ''}${r.batch_name ? ` · ${escapeHtml(r.batch_name)}` : ''}</td><td>${r.course_id ?? ''}</td><td>${r.capacity ?? ''}</td><td>${r.enrolled ?? ''}</td><td>${r.utilization_pct != null ? `${r.utilization_pct}%` : ''}</td></tr>`,
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
    const data = await jsonFetch(`${OPS}?resource=data-quality`, { headers: getAuthHeaders() });
    if (summary) {
      summary.innerHTML = `<p>Orphan trainee refs: <strong>${data.orphan_trainee_refs}</strong></p>
          <p>Orphan batch refs: <strong>${data.orphan_batch_refs}</strong></p>
          <p>Duplicate enrollment IDs: <strong>${data.duplicate_enrollment_ids}</strong></p>
          <p>Paid with zero amount: <strong>${data.paid_with_zero_amount ?? 0}</strong></p>`;
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
