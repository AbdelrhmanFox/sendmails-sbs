import {
  jsonFetch,
  getAuthHeaders,
  showToast,
  detectFileKind,
  RESOURCE_UPLOAD_ACCEPT,
  RESOURCE_UPLOAD_MAX_MB,
  COPY,
  requiredFieldMessage,
  couldNotMessage,
} from './shared.js';

const CLASSROOM = '/.netlify/functions/classroom-data';
const CLASSROOM_UPLOAD = '/.netlify/functions/classroom-assignment-upload';
const CLASSROOM_MATERIAL_UPLOAD = '/.netlify/functions/classroom-material-upload';

let currentBatchId = '';
let currentBatchLabel = '';
let currentClassroomCourseId = '';
let assignmentsCache = [];
let materialsCache = [];
let materialChaptersCache = [];
let submissionsAssignmentId = '';
let submissionsCache = [];
let assignmentFilesCache = {};

async function uploadAssignmentFile(assignmentId, file) {
  const meta = await jsonFetch(CLASSROOM_UPLOAD, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      assignment_id: assignmentId,
      filename: file.name,
      contentType: file.type || 'application/octet-stream',
    }),
  });
  const headers = { 'Content-Type': file.type || 'application/octet-stream' };
  if (meta.token) headers.Authorization = `Bearer ${meta.token}`;
  const put = await fetch(meta.signedUrl, { method: 'PUT', headers, body: file });
  if (!put.ok) {
    const t = await put.text().catch(() => '');
    throw new Error(t || `Upload failed (${put.status})`);
  }
  return { file_url: meta.publicUrl, file_storage_key: meta.path };
}

async function uploadClassroomMaterialFile(batchId, file) {
  const meta = await jsonFetch(CLASSROOM_MATERIAL_UPLOAD, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      batch_id: batchId,
      filename: file.name,
      contentType: file.type || 'application/octet-stream',
    }),
  });
  const headers = { 'Content-Type': file.type || 'application/octet-stream' };
  if (meta.token) headers.Authorization = `Bearer ${meta.token}`;
  const put = await fetch(meta.signedUrl, { method: 'PUT', headers, body: file });
  if (!put.ok) {
    const t = await put.text().catch(() => '');
    throw new Error(t || `Upload failed (${put.status})`);
  }
  return { publicUrl: meta.publicUrl, path: meta.path };
}

function clearMaterialEditing() {
  const hid = $('classroomMatEditId');
  if (hid) hid.value = '';
  $('classroomMaterialForm')?.reset();
  const fIn = $('classroomMatFile');
  if (fIn) fIn.value = '';
  const chapterSel = $('classroomMatChapterId');
  if (chapterSel) chapterSel.value = '';
  const sub = $('classroomMatSubmit');
  if (sub) sub.textContent = 'Create material';
  $('classroomMatCancelEdit')?.classList.add('hidden');
  const h = $('classroomMatFormHeading');
  if (h) h.textContent = 'Create material';
  const panel = $('classroomMatFormPanel');
  if (panel) panel.removeAttribute('open');
  const summary = panel?.querySelector('summary');
  if (summary) summary.textContent = '+ Create material';
}

function clearAssignmentEditing() {
  const hid = $('classroomAsgEditId');
  if (hid) hid.value = '';
  $('classroomAssignmentForm')?.reset();
  const sub = $('classroomAsgSubmit');
  if (sub) sub.textContent = 'Add assignment';
  $('classroomAsgCancelEdit')?.classList.add('hidden');
  const h = $('classroomAsgFormHeading');
  if (h) h.textContent = 'New assignment';
  const panel = $('classroomAsgFormPanel');
  if (panel) panel.removeAttribute('open');
  const summary = panel?.querySelector('summary');
  if (summary) summary.textContent = '+ New assignment';
}

function beginMaterialEdit(m) {
  const hid = $('classroomMatEditId');
  if (hid) hid.value = m.id || '';
  const t = $('classroomMatTitle');
  const u = $('classroomMatUrl');
  const d = $('classroomMatDesc');
  const chapterSel = $('classroomMatChapterId');
  if (t) t.value = m.title || '';
  if (u) u.value = m.url || '';
  if (d) d.value = m.description || '';
  if (chapterSel) chapterSel.value = m.chapter_id || '';
  const sub = $('classroomMatSubmit');
  if (sub) sub.textContent = 'Save changes';
  $('classroomMatCancelEdit')?.classList.remove('hidden');
  const h = $('classroomMatFormHeading');
  const fIn = $('classroomMatFile');
  if (fIn) fIn.value = '';
  if (h) h.textContent = 'Edit resource';
  const panel = $('classroomMatFormPanel');
  if (panel) panel.setAttribute('open', '');
  const summary = panel?.querySelector('summary');
  if (summary) summary.textContent = 'Editing resource';
  switchClassroomTab('materials');
  setTimeout(() => t?.focus(), 50);
}

function beginAssignmentEdit(a) {
  const hid = $('classroomAsgEditId');
  if (hid) hid.value = a.id || '';
  const title = $('classroomAsgTitle');
  const inst = $('classroomAsgInstructions');
  const due = $('classroomAsgDue');
  if (title) title.value = a.title || '';
  if (inst) inst.value = a.instructions || '';
  if (due) {
    const raw = a.due_date != null ? String(a.due_date).trim() : '';
    due.value = raw.length >= 10 ? raw.slice(0, 10) : raw;
  }
  const sub = $('classroomAsgSubmit');
  if (sub) sub.textContent = 'Save changes';
  $('classroomAsgCancelEdit')?.classList.remove('hidden');
  const h = $('classroomAsgFormHeading');
  if (h) h.textContent = 'Edit assignment';
  const panel = $('classroomAsgFormPanel');
  if (panel) panel.setAttribute('open', '');
  const summary = panel?.querySelector('summary');
  if (summary) summary.textContent = 'Editing assignment';
  switchClassroomTab('classwork');
  setTimeout(() => title?.focus(), 50);
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function refreshMaterialChapterSelect() {
  const sel = $('classroomMatChapterId');
  if (!sel) return;
  sel.innerHTML = [`<option value="">Uncategorized</option>`]
    .concat((materialChaptersCache || []).map((ch) => `<option value="${escapeHtml(ch.id)}">${escapeHtml(ch.title)}</option>`))
    .join('');
}

function renderMaterialChapterChips() {
  const host = $('classroomMatChapterChips');
  if (!host) return;
  host.innerHTML = (materialChaptersCache || [])
    .map((ch) => `<button type="button" class="classroom-asg-chip classroom-edit-mat-chapter" data-id="${escapeHtml(ch.id)}">${escapeHtml(ch.title)}</button>`)
    .join('');
  host.querySelectorAll('.classroom-edit-mat-chapter').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = String(btn.getAttribute('data-id') || '').trim();
      if (!id) return;
      const curr = materialChaptersCache.find((x) => x.id === id);
      if (!curr) return;
      const next = prompt('Rename session', curr.title || '');
      if (next == null) return;
      const title = String(next || '').trim();
      if (!title) return;
      try {
        await jsonFetch(`${CLASSROOM}?resource=material-chapters&id=${encodeURIComponent(id)}`, {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify({ title }),
        });
        await loadMaterialsList();
      } catch (e) {
        showToast(e.message || COPY.common.actionFailed, 'error');
      }
    });
  });
}

async function loadMaterialChapters() {
  if (!currentBatchId) return;
  const data = await jsonFetch(`${CLASSROOM}?resource=material-chapters&batch_id=${encodeURIComponent(currentBatchId)}`, {
    headers: getAuthHeaders(),
  });
  materialChaptersCache = data.items || [];
  refreshMaterialChapterSelect();
  renderMaterialChapterChips();
}

function $(id) {
  return document.getElementById(id);
}

function showPanel(listVisible) {
  $('classroomListPanel')?.classList.toggle('hidden', !listVisible);
  $('classroomRoomPanel')?.classList.toggle('hidden', listVisible);
}

export async function loadClassrooms() {
  const grid = $('classroomGrid');
  const msg = $('classroomListMsg');
  if (!grid) return;
  if (msg) msg.textContent = '';
  grid.innerHTML = '<div class="skeleton-row"></div><div class="skeleton-row"></div><div class="skeleton-row"></div>';
  try {
    const data = await jsonFetch(`${CLASSROOM}?resource=classrooms`, { headers: getAuthHeaders() });
    const items = data.items || [];
    if (!items.length) {
      grid.innerHTML = `<div class="empty-state">
        <svg class="empty-state__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2"/></svg>
        <p class="empty-state__title">No classrooms yet</p>
        <p class="empty-state__hint">Ask an admin to map your username to a course so your classrooms appear here.</p>
      </div>`;
      return;
    }
    grid.innerHTML = items
      .map((b) => {
        const courseLabel = escapeHtml(b.course_name || b.course_id || '');
        const batchLabel = escapeHtml(b.batch_name || b.batch_id);
        const label = `${b.course_name || ''} · ${b.batch_name || b.batch_id}`.trim() || b.batch_id;
        const count = Number(b.enrolled_count) || 0;
        return `<article class="card classroom-card" role="listitem">
          <div class="classroom-card-header">
            <div>
              <h4 class="classroom-card-title">${batchLabel}</h4>
              ${courseLabel ? `<p class="classroom-card-course muted">${courseLabel}</p>` : ''}
            </div>
            <span class="badge badge--info">${count} enrolled</span>
          </div>
          <p class="muted classroom-card-id">${escapeHtml(b.batch_id)}${b.trainer ? ` · ${escapeHtml(b.trainer)}` : ''}</p>
          <button type="button" class="btn btn-primary btn-sm classroom-open-btn" data-batch-id="${escapeHtml(b.batch_id)}" data-label="${escapeHtml(label)}" data-course-id="${escapeHtml(b.course_id || '')}">Open classroom →</button>
        </article>`;
      })
      .join('');
    grid.querySelectorAll('.classroom-open-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const bid = btn.getAttribute('data-batch-id');
        const lab = btn.getAttribute('data-label') || bid;
        const cid = btn.getAttribute('data-course-id') || '';
        void openClassroom(bid, lab, cid);
      });
    });
  } catch (e) {
    grid.innerHTML = '';
    if (msg) msg.textContent = e.message || 'Could not load classrooms.';
  }
}

function buildParticipantShareUrl(token) {
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}?classroom=${token}`;
}

function setClassroomContextMessage(text) {
  const el = $('classroomRoomContextMsg');
  if (el) el.textContent = text || '';
}

/** Loads authoritative batch_name and course_id from the server (e.g. after Operations edits). */
async function syncBatchContextFromServer() {
  const bid = String(currentBatchId || '').trim();
  if (!bid) return { ok: false };
  try {
    const data = await jsonFetch(`${CLASSROOM}?resource=batch-context&batch_id=${encodeURIComponent(bid)}`, {
      headers: getAuthHeaders(),
    });
    currentClassroomCourseId = String(data.course_id || '').trim();
    const bn = String(data.batch_name || '').trim();
    if (bn) {
      currentBatchLabel = bn;
      const titleEl = $('classroomRoomTitle');
      if (titleEl) titleEl.textContent = bn;
    }
    setClassroomContextMessage('');
    $('classroomClassworkMsg').textContent = '';
    $('classroomMaterialsMsg').textContent = '';
    $('classroomGradesMsg').textContent = '';
    return { ok: true };
  } catch (e) {
    const msg = e.message || 'Could not load batch context.';
    setClassroomContextMessage(msg);
    $('classroomClassworkMsg').textContent = msg;
    $('classroomMaterialsMsg').textContent = msg;
    $('classroomGradesMsg').textContent = msg;
    return { ok: false, message: msg };
  }
}

async function loadShareLink() {
  const input = $('classroomShareUrl');
  if (!input || !currentBatchId) return;
  input.value = '';
  input.placeholder = 'Loading…';
  try {
    const data = await jsonFetch(`${CLASSROOM}?resource=share-link&batch_id=${encodeURIComponent(currentBatchId)}`, {
      headers: getAuthHeaders(),
    });
    input.placeholder = '';
    input.value = buildParticipantShareUrl(data.token);
  } catch (e) {
    input.placeholder = '';
    input.value = '';
    input.placeholder = e.message || couldNotMessage('load the share link');
  }
}

async function openClassroom(batchId, label, courseId) {
  currentBatchId = String(batchId || '').trim();
  currentBatchLabel = label || currentBatchId;
  currentClassroomCourseId = String(courseId || '').trim();
  const titleEl = $('classroomRoomTitle');
  if (titleEl) titleEl.textContent = currentBatchLabel;
  showPanel(false);
  $('classroomAssignmentForm')?.reset();
  $('classroomMaterialForm')?.reset();
  clearAssignmentEditing();
  clearMaterialEditing();
  await refreshClassroomData();
  await loadShareLink();
  switchClassroomTab('classwork');
}

function closeClassroomRoom() {
  setClassroomContextMessage('');
  currentBatchId = '';
  currentBatchLabel = '';
  currentClassroomCourseId = '';
  assignmentsCache = [];
  materialsCache = [];
  materialChaptersCache = [];
  submissionsAssignmentId = '';
  submissionsCache = [];
  clearAssignmentEditing();
  clearMaterialEditing();
  showPanel(true);
}

async function refreshClassroomData() {
  if (!currentBatchId) return;
  const sync = await syncBatchContextFromServer();
  if (!sync.ok) {
    assignmentsCache = [];
    materialsCache = [];
    materialChaptersCache = [];
    assignmentFilesCache = {};
    const asgHost = $('classroomAssignmentsList');
    if (asgHost) asgHost.innerHTML = '';
    const matHost = $('classroomMaterialsList');
    if (matHost) matHost.innerHTML = '';
    submissionsAssignmentId = '';
    submissionsCache = [];
    renderSubmissionsList();
    const subAsgHost = $('classroomSubmissionsAssignments');
    if (subAsgHost) subAsgHost.innerHTML = '';
    return;
  }
  await Promise.all([loadAssignmentsList(), loadMaterialsList()]);
  await loadSubmissionsBoard();
}

function renderSubmissionsList() {
  const host = $('classroomSubmissionsList');
  if (!host) return;
  if (!submissionsAssignmentId) {
    host.innerHTML = `<div class="empty-state">
      <svg class="empty-state__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/></svg>
      <p class="empty-state__title">No assignment selected</p>
      <p class="empty-state__hint">Pick an assignment above to see its submissions.</p>
    </div>`;
    return;
  }
  if (!submissionsCache.length) {
    host.innerHTML = `<div class="empty-state">
      <svg class="empty-state__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>
      <p class="empty-state__title">No submissions yet</p>
    </div>`;
    return;
  }
  host.innerHTML = submissionsCache
    .map((s) => {
      const isReviewed = s.status === 'reviewed';
      const statusBadge = isReviewed
        ? `<span class="badge badge--success">Reviewed</span>`
        : `<span class="badge badge--info">Submitted</span>`;
      const when = s.submitted_at ? String(s.submitted_at).replace('T', ' ').slice(0, 16) : '';
      const file = s.file_url
        ? `<a href="${escapeHtml(s.file_url)}" target="_blank" rel="noopener noreferrer" class="classroom-sub-file-link">Open file ↗</a>`
        : '';
      const snippet = s.submission_text ? `<p class="classroom-sub-snippet">${escapeHtml(String(s.submission_text).slice(0, 160))}${s.submission_text.length > 160 ? '…' : ''}</p>` : '';
      return `<article class="classroom-submission-card" data-id="${escapeHtml(s.id)}">
        <div class="classroom-submission-card-head">
          <strong class="classroom-sub-name">${escapeHtml(s.trainee_name || 'Trainee')}</strong>
          ${statusBadge}
        </div>
        <p class="muted small-margin classroom-sub-meta">${escapeHtml(s.trainee_email || '')}${when ? ` · ${escapeHtml(when)}` : ''}</p>
        ${file}
        ${snippet}
      </article>`;
    })
    .join('');
  host.querySelectorAll('.classroom-submission-card').forEach((card) => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('a')) return;
      host.querySelectorAll('.classroom-submission-card').forEach((c) => c.classList.remove('active'));
      card.classList.add('active');
      const id = card.getAttribute('data-id');
      const row = submissionsCache.find((x) => x.id === id);
      if (!row) return;
      $('classroomReviewSubmissionId').value = row.id;
      $('classroomReviewTarget').textContent = `${row.trainee_name || 'Trainee'}${row.trainee_email ? ` (${row.trainee_email})` : ''}`;
      $('classroomReviewGrade').value = row.review && row.review.grade != null ? String(row.review.grade) : '';
      $('classroomReviewFeedback').value = row.review && row.review.feedback ? row.review.feedback : '';
    });
  });
}

async function loadSubmissionsForAssignment(assignmentId) {
  const aid = String(assignmentId || '').trim();
  submissionsAssignmentId = aid;
  submissionsCache = [];
  const msg = $('classroomGradesMsg');
  if (!aid) {
    renderSubmissionsList();
    return;
  }
  try {
    const data = await jsonFetch(`${CLASSROOM}?resource=submissions&assignment_id=${encodeURIComponent(aid)}`, {
      headers: getAuthHeaders(),
    });
    submissionsCache = data.items || [];
    renderSubmissionsList();
    if (msg) msg.textContent = '';
  } catch (e) {
    const host = $('classroomSubmissionsList');
    if (host) host.innerHTML = '';
    if (msg) msg.textContent = e.message || 'Could not load submissions.';
  }
}

async function loadSubmissionsBoard() {
  const host = $('classroomSubmissionsAssignments');
  if (!host) return;
  if (!assignmentsCache.length) {
    host.innerHTML = '<p class="muted" style="font-size:13px">No assignments available. Create one in the Classwork tab.</p>';
    submissionsAssignmentId = '';
    submissionsCache = [];
    renderSubmissionsList();
    return;
  }
  host.innerHTML = assignmentsCache
    .map((a) => {
      const on = submissionsAssignmentId === a.id;
      return `<button type="button" class="classroom-asg-chip ${on ? 'active' : ''}" data-id="${escapeHtml(a.id)}" title="${escapeHtml(a.title)}">
        ${escapeHtml(a.title.length > 32 ? a.title.slice(0, 32) + '…' : a.title)}
      </button>`;
    })
    .join('');
  host.querySelectorAll('.classroom-asg-chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      const aid = btn.getAttribute('data-id');
      host.querySelectorAll('.classroom-asg-chip').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      $('classroomReviewSubmissionId').value = '';
      $('classroomReviewTarget').textContent = 'Select a submission to review.';
      $('classroomSubmissionReviewForm')?.reset();
      void loadSubmissionsForAssignment(aid);
    });
  });
  if (!submissionsAssignmentId && assignmentsCache[0]) {
    const first = assignmentsCache[0].id;
    submissionsAssignmentId = first;
    const firstBtn = host.querySelector(`.classroom-asg-chip[data-id="${first}"]`);
    if (firstBtn) firstBtn.classList.add('active');
    await loadSubmissionsForAssignment(first);
    return;
  }
  if (submissionsAssignmentId) await loadSubmissionsForAssignment(submissionsAssignmentId);
}

async function loadAssignmentsList() {
  const host = $('classroomAssignmentsList');
  const msg = $('classroomClassworkMsg');
  if (!host || !currentBatchId) return;
  host.innerHTML = '<div class="skeleton-row skeleton-row--lg"></div><div class="skeleton-row skeleton-row--lg"></div>';
  try {
    const data = await jsonFetch(`${CLASSROOM}?resource=assignments&batch_id=${encodeURIComponent(currentBatchId)}`, {
      headers: getAuthHeaders(),
    });
    assignmentsCache = data.items || [];
    assignmentFilesCache = {};
    await Promise.all(
      assignmentsCache.map(async (a) => {
        try {
          const fd = await jsonFetch(`${CLASSROOM}?resource=assignment-files&assignment_id=${encodeURIComponent(a.id)}`, {
            headers: getAuthHeaders(),
          });
          assignmentFilesCache[a.id] = fd.items || [];
        } catch (_) {
          assignmentFilesCache[a.id] = [];
        }
      }),
    );
    if (!assignmentsCache.length) {
      host.innerHTML = `<div class="empty-state">
        <svg class="empty-state__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 12h8M12 8v8"/></svg>
        <p class="empty-state__title">No assignments yet</p>
        <p class="empty-state__hint">Use the form below to add the first assignment for this batch.</p>
      </div>`;
      if (msg) msg.textContent = '';
      return;
    }
    host.innerHTML = assignmentsCache
      .map((a) => {
        const today = new Date().toISOString().slice(0, 10);
        const isOverdue = a.due_date && a.due_date < today;
        const dueClass = isOverdue ? 'badge--danger' : 'badge--warn';
        const dueBadge = a.due_date
          ? `<span class="badge ${dueClass}">Due ${escapeHtml(a.due_date)}</span>`
          : '';
        const files = assignmentFilesCache[a.id] || [];
        const filesBadge = files.length ? `<span class="badge badge--muted">${files.length} file${files.length > 1 ? 's' : ''}</span>` : '';
        const filesHtml = files.length
          ? `<ul class="classroom-assignment-files">${files
              .map(
                (f) =>
                  `<li>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;opacity:.6"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    <a href="${escapeHtml(f.file_url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(f.title || 'File')}</a>
                    <button type="button" class="btn btn-ghost btn-sm classroom-del-asg-file" data-id="${escapeHtml(f.id)}" data-aid="${escapeHtml(a.id)}" title="Remove file">✕</button>
                  </li>`,
              )
              .join('')}</ul>`
          : '';
        return `<article class="classroom-asg-card">
          <div class="classroom-asg-card__head">
            <h4 class="classroom-asg-card__title">${escapeHtml(a.title)}</h4>
            <div class="classroom-asg-card__badges">${dueBadge}${filesBadge}</div>
          </div>
          ${a.instructions ? `<p class="classroom-asg-card__instructions">${escapeHtml(a.instructions)}</p>` : ''}
          ${filesHtml}
          <div class="classroom-asg-card__actions">
            <button type="button" class="btn btn-ghost btn-sm classroom-edit-asg" data-id="${escapeHtml(a.id)}">Edit</button>
            <button type="button" class="btn btn-ghost btn-sm btn-danger classroom-del-asg" data-id="${escapeHtml(a.id)}">Remove</button>
          </div>
        </article>`;
      })
      .join('');
    host.querySelectorAll('.classroom-edit-asg').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const a = assignmentsCache.find((x) => x.id === id);
        if (a) beginAssignmentEdit(a);
      });
    });
    host.querySelectorAll('.classroom-del-asg').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        if (!id || !confirm('Remove this assignment and all related files?')) return;
        try {
          await jsonFetch(`${CLASSROOM}?resource=assignments&id=${encodeURIComponent(id)}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
          });
          if (String($('classroomAsgEditId')?.value || '') === id) clearAssignmentEditing();
          await refreshClassroomData();
        } catch (e) {
          showToast(e.message || COPY.common.actionFailed, 'error');
        }
      });
    });
    host.querySelectorAll('.classroom-del-asg-file').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        if (!id) return;
        try {
          await jsonFetch(`${CLASSROOM}?resource=assignment-files&id=${encodeURIComponent(id)}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
          });
          await loadAssignmentsList();
        } catch (e) {
          showToast(e.message || COPY.common.actionFailed, 'error');
        }
      });
    });
    if (msg) msg.textContent = '';
  } catch (e) {
    host.innerHTML = '';
    if (msg) msg.textContent = e.message || 'Could not load assignments.';
  }
}

async function loadMaterialsList() {
  const host = $('classroomMaterialsList');
  const msg = $('classroomMaterialsMsg');
  if (!host || !currentBatchId) return;
  host.innerHTML = '<li class="skeleton-row skeleton-row--sm" style="list-style:none"></li><li class="skeleton-row skeleton-row--sm" style="list-style:none"></li>';
  try {
    await loadMaterialChapters();
    const data = await jsonFetch(`${CLASSROOM}?resource=materials&batch_id=${encodeURIComponent(currentBatchId)}`, {
      headers: getAuthHeaders(),
    });
    const items = data.items || [];
    materialsCache = items;
    if (!items.length) {
      host.innerHTML = `<li style="list-style:none"><div class="empty-state" style="padding:20px 0">
        <p class="empty-state__title">No resource links yet</p>
        <p class="empty-state__hint">Use the form below to create links or upload files for trainees.</p>
      </div></li>`;
      if (msg) msg.textContent = '';
      return;
    }
    const byChapter = new Map();
    (materialChaptersCache || []).forEach((ch) => byChapter.set(ch.id, []));
    const uncategorized = [];
    items.forEach((m) => {
      const cid = String(m.chapter_id || '').trim();
      if (cid && byChapter.has(cid)) byChapter.get(cid).push(m);
      else uncategorized.push(m);
    });
    const renderRows = (rows) =>
      rows
        .map((m) => {
          const fileKind = detectFileKind(m.url, m.title, m.mime_type);
          return `<li class="classroom-material-row">
            <div class="classroom-material-main">
              <a href="${escapeHtml(m.url)}" target="_blank" rel="noopener noreferrer" class="classroom-mat-link">${escapeHtml(fileKind.icon)} ${escapeHtml(
                m.title,
              )}</a>
              ${m.storage_object_key ? ` <span class="badge badge--muted">${escapeHtml(fileKind.label)}</span>` : ''}
              ${m.description ? `<p class="muted small-margin" style="font-size:12px">${escapeHtml(m.description)}</p>` : ''}
            </div>
            <div class="classroom-inline-actions">
              <a href="${escapeHtml(m.url)}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm" ${m.storage_object_key ? 'download' : ''}>
                ${m.storage_object_key ? 'Download' : 'Open'}
              </a>
              <button type="button" class="btn btn-ghost btn-sm classroom-edit-mat" data-id="${escapeHtml(m.id)}">Update</button>
              <button type="button" class="btn btn-ghost btn-sm btn-danger classroom-del-mat" data-id="${escapeHtml(m.id)}">Remove</button>
            </div>
          </li>`;
        })
        .join('');
    const groupedHtml = [];
    (materialChaptersCache || []).forEach((ch) => {
      const rows = byChapter.get(ch.id) || [];
      if (!rows.length) return;
      groupedHtml.push(`<li style="list-style:none"><details class="card" open><summary><strong>${escapeHtml(ch.title)}</strong></summary><ul class="classroom-materials-list">${renderRows(
        rows,
      )}</ul></details></li>`);
    });
    if (uncategorized.length) {
      groupedHtml.push(`<li style="list-style:none"><details class="card" open><summary><strong>Uncategorized</strong></summary><ul class="classroom-materials-list">${renderRows(
        uncategorized,
      )}</ul></details></li>`);
    }
    host.innerHTML = groupedHtml.join('');
    host.querySelectorAll('.classroom-edit-mat').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const m = materialsCache.find((x) => x.id === id);
        if (m) beginMaterialEdit(m);
      });
    });
    host.querySelectorAll('.classroom-del-mat').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        if (!id) return;
        try {
          await jsonFetch(`${CLASSROOM}?resource=materials&id=${encodeURIComponent(id)}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
          });
          if (String($('classroomMatEditId')?.value || '') === id) clearMaterialEditing();
          await loadMaterialsList();
        } catch (e) {
          showToast(e.message || COPY.common.actionFailed, 'error');
        }
      });
    });
    if (msg) msg.textContent = '';
  } catch (e) {
    host.innerHTML = '';
    if (msg) msg.textContent = e.message || 'Could not load materials.';
  }
}

function switchClassroomTab(which) {
  const tabs = [
    { id: 'classroomTabClasswork', pane: 'classroomPaneClasswork' },
    { id: 'classroomTabMaterials', pane: 'classroomPaneMaterials' },
    { id: 'classroomTabGrades', pane: 'classroomPaneGrades' },
  ];
  tabs.forEach(({ id, pane }) => {
    const t = $(id);
    const p = $(pane);
    const on = (which === 'classwork' && id === 'classroomTabClasswork') || (which === 'materials' && id === 'classroomTabMaterials') || (which === 'grades' && id === 'classroomTabGrades');
    if (t) {
      t.classList.toggle('active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
    }
    if (p) {
      p.classList.toggle('hidden', !on);
      p.hidden = !on;
    }
  });
}

export function initClassroom() {
  const asgInput = $('classroomAsgFiles');
  if (asgInput) asgInput.setAttribute('accept', RESOURCE_UPLOAD_ACCEPT);
  const matInput = $('classroomMatFile');
  if (matInput) matInput.setAttribute('accept', RESOURCE_UPLOAD_ACCEPT);
  const matHint = document.querySelector('#classroomPaneMaterials .muted.small-margin.full');
  if (matHint) {
    matHint.textContent = `Allowed file types: PDF, Office documents, video, and audio. You can upload multiple files at once. Leave URL empty when uploading files. Max ${RESOURCE_UPLOAD_MAX_MB} MB per file.`;
  }

  $('classroomBackBtn')?.addEventListener('click', () => closeClassroomRoom());

  document.addEventListener('sbs:classroom-batch-updated', (e) => {
    const bid = e.detail && e.detail.batch_id ? String(e.detail.batch_id).trim() : '';
    if (bid && bid === String(currentBatchId || '').trim()) void refreshClassroomData();
  });

  $('classroomTabClasswork')?.addEventListener('click', () => switchClassroomTab('classwork'));
  $('classroomTabMaterials')?.addEventListener('click', () => switchClassroomTab('materials'));
  $('classroomTabGrades')?.addEventListener('click', () => switchClassroomTab('grades'));

  $('classroomAssignmentForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentBatchId) return;
    const title = String($('classroomAsgTitle')?.value || '').trim();
    const instructions = String($('classroomAsgInstructions')?.value || '');
    const due = String($('classroomAsgDue')?.value || '').trim();
    const fileInput = $('classroomAsgFiles');
    const files = fileInput && fileInput.files ? Array.from(fileInput.files) : [];
    if (!title) return;
    const editId = String($('classroomAsgEditId')?.value || '').trim();
    try {
      let assignmentId = editId || '';
      if (editId) {
        const res = await jsonFetch(`${CLASSROOM}?resource=assignments&id=${encodeURIComponent(editId)}`, {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            title,
            instructions: instructions || null,
            due_date: due || null,
          }),
        });
        assignmentId = res.item && res.item.id ? res.item.id : editId;
        clearAssignmentEditing();
      } else {
        const res = await jsonFetch(`${CLASSROOM}?resource=assignments`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            batch_id: currentBatchId,
            title,
            instructions: instructions || null,
            due_date: due || null,
          }),
        });
        assignmentId = res.item && res.item.id ? res.item.id : '';
        clearAssignmentEditing();
      }
      if (assignmentId && files.length) {
        for (const file of files) {
          const up = await uploadAssignmentFile(assignmentId, file);
          await jsonFetch(`${CLASSROOM}?resource=assignment-files`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
              assignment_id: assignmentId,
              title: file.name,
              file_url: up.file_url,
              file_storage_key: up.file_storage_key,
              mime_type: file.type || null,
              file_size_bytes: file.size || null,
            }),
          });
        }
      }
      if (fileInput) fileInput.value = '';
      await refreshClassroomData();
    } catch (err) {
      $('classroomClassworkMsg').textContent = err.message || couldNotMessage('save the assignment');
    }
  });

  $('classroomAsgCancelEdit')?.addEventListener('click', () => clearAssignmentEditing());

  $('classroomMaterialForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentBatchId) return;
    const title = String($('classroomMatTitle')?.value || '').trim();
    let url = String($('classroomMatUrl')?.value || '').trim();
    const description = String($('classroomMatDesc')?.value || '').trim();
    const chapterId = String($('classroomMatChapterId')?.value || '').trim() || null;
    const fileInput = $('classroomMatFile');
    const files = fileInput && fileInput.files ? Array.from(fileInput.files) : [];
    const editId = String($('classroomMatEditId')?.value || '').trim();
    const msg = $('classroomMaterialsMsg');
    if (!title) {
      if (msg) msg.textContent = requiredFieldMessage('Title');
      return;
    }
    const currentEditItem = editId ? materialsCache.find((x) => x.id === editId) : null;
    if (!files.length && !url && !currentEditItem?.url) {
      if (msg) msg.textContent = 'URL or file upload is required.';
      return;
    }
    try {
      if (editId && files.length > 1) {
        if (msg) msg.textContent = 'When updating, upload one file only.';
        return;
      }
      let createdCount = 0;
      let payload = {
        title,
        description: description || null,
        chapter_id: chapterId,
      };
      if (files.length) {
        if (editId) {
          const f = files[0];
          const up = await uploadClassroomMaterialFile(currentBatchId, f);
          payload.url = up.publicUrl;
          payload.storage_object_key = up.path;
          payload.mime_type = f.type || null;
          payload.file_size_bytes = f.size ?? null;
        } else {
          for (const f of files) {
            const up = await uploadClassroomMaterialFile(currentBatchId, f);
            const fileTitle = files.length === 1 ? title : `${title} - ${f.name}`;
            await jsonFetch(`${CLASSROOM}?resource=materials`, {
              method: 'POST',
              headers: getAuthHeaders(),
              body: JSON.stringify({
                batch_id: currentBatchId,
                title: fileTitle,
                url: up.publicUrl,
                chapter_id: chapterId,
                storage_object_key: up.path,
                mime_type: f.type || null,
                file_size_bytes: f.size ?? null,
                description: description || null,
              }),
            });
            createdCount += 1;
          }
        }
      } else {
        // Keep existing file URL on edit if user only changes title/description.
        payload.url = url || String(currentEditItem?.url || '').trim();
        if (editId) {
          const m = currentEditItem;
          const prevUrl = m ? String(m.url || '').trim() : '';
          if (m && url !== prevUrl) {
            payload.storage_object_key = null;
          }
        }
      }
      if (editId) {
        await jsonFetch(`${CLASSROOM}?resource=materials&id=${encodeURIComponent(editId)}`, {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        });
        clearMaterialEditing();
      } else {
        if (!files.length) {
          await jsonFetch(`${CLASSROOM}?resource=materials`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
              batch_id: currentBatchId,
              ...payload,
            }),
          });
          createdCount = 1;
        }
        clearMaterialEditing();
      }
      if (fileInput) fileInput.value = '';
      await loadMaterialsList();
      if (msg) msg.textContent = createdCount > 1 ? `${createdCount} files uploaded successfully.` : '';
    } catch (err) {
      if (msg) msg.textContent = err.message || couldNotMessage('save the material');
    }
  });

  $('classroomMatCancelEdit')?.addEventListener('click', () => clearMaterialEditing());

  $('classroomMatChapterForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentBatchId) return;
    const title = String($('classroomMatChapterTitle')?.value || '').trim();
    if (!title) return;
    try {
      await jsonFetch(`${CLASSROOM}?resource=material-chapters`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ batch_id: currentBatchId, title }),
      });
      e.target.reset();
      await loadMaterialsList();
    } catch (err) {
      showToast(err.message || couldNotMessage('create the session'), 'error');
    }
  });

  $('classroomSubmissionReviewForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = String($('classroomReviewSubmissionId')?.value || '').trim();
    if (!id) return;
    const gradeVal = String($('classroomReviewGrade')?.value || '').trim();
    const feedback = String($('classroomReviewFeedback')?.value || '');
    const msg = $('classroomGradesMsg');
    try {
      await jsonFetch(`${CLASSROOM}?resource=submissions&id=${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          grade: gradeVal === '' ? null : gradeVal,
          feedback: feedback || null,
        }),
      });
      if (msg) msg.textContent = COPY.common.changesSaved;
      if (submissionsAssignmentId) await loadSubmissionsForAssignment(submissionsAssignmentId);
    } catch (err) {
      if (msg) msg.textContent = err.message || couldNotMessage('save the review');
    }
  });

  $('classroomGotoCourseLibrary')?.addEventListener('click', () => {
    document.dispatchEvent(
      new CustomEvent('sbs:open-course-library', {
        detail: { courseId: currentClassroomCourseId || '' },
      }),
    );
  });

  $('classroomCopyShareUrl')?.addEventListener('click', async () => {
    const input = $('classroomShareUrl');
    if (!input || !input.value) return;
    try {
      await navigator.clipboard.writeText(input.value);
    } catch (_) {
      input.select();
      document.execCommand('copy');
    }
  });
}
