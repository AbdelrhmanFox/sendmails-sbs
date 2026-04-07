import { jsonFetch, getAuthHeaders } from './shared.js';

const CLASSROOM = '/.netlify/functions/classroom-data';
const CLASSROOM_UPLOAD = '/.netlify/functions/classroom-assignment-upload';

let currentBatchId = '';
let currentBatchLabel = '';
let currentClassroomCourseId = '';
let assignmentsCache = [];
let materialsCache = [];
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

function clearMaterialEditing() {
  const hid = $('classroomMatEditId');
  if (hid) hid.value = '';
  $('classroomMaterialForm')?.reset();
  const sub = $('classroomMatSubmit');
  if (sub) sub.textContent = 'Add link';
  $('classroomMatCancelEdit')?.classList.add('hidden');
  const h = $('classroomMatFormHeading');
  if (h) h.textContent = 'Add resource link';
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
}

function beginMaterialEdit(m) {
  const hid = $('classroomMatEditId');
  if (hid) hid.value = m.id || '';
  const t = $('classroomMatTitle');
  const u = $('classroomMatUrl');
  const d = $('classroomMatDesc');
  if (t) t.value = m.title || '';
  if (u) u.value = m.url || '';
  if (d) d.value = m.description || '';
  const sub = $('classroomMatSubmit');
  if (sub) sub.textContent = 'Save changes';
  $('classroomMatCancelEdit')?.classList.remove('hidden');
  const h = $('classroomMatFormHeading');
  if (h) h.textContent = 'Edit resource link';
  t?.focus();
  switchClassroomTab('materials');
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
  title?.focus();
  switchClassroomTab('classwork');
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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
  if (msg) msg.textContent = 'Loading…';
  try {
    const data = await jsonFetch(`${CLASSROOM}?resource=classrooms`, { headers: getAuthHeaders() });
    const items = data.items || [];
    if (!items.length) {
      grid.innerHTML = '<p class="muted">No assigned courses yet. Ask admin to map your username to a course.</p>';
      if (msg) msg.textContent = '';
      return;
    }
    grid.innerHTML = items
      .map((b) => {
        const title = [escapeHtml(b.course_name || ''), escapeHtml(b.batch_name || b.batch_id)].filter(Boolean).join(' · ');
        const label = `${b.course_name || ''} · ${b.batch_name || b.batch_id}`.trim() || b.batch_id;
        return `<article class="card classroom-card" role="listitem">
          <h4>${title || escapeHtml(b.batch_id)}</h4>
          <p class="muted small-margin">${escapeHtml(b.batch_id)}${b.trainer ? ` · Trainer: ${escapeHtml(b.trainer)}` : ''}</p>
          <p class="classroom-card-meta"><strong>${Number(b.enrolled_count) || 0}</strong> enrolled</p>
          <button type="button" class="btn btn-primary classroom-open-btn" data-batch-id="${escapeHtml(b.batch_id)}" data-label="${escapeHtml(label)}" data-course-id="${escapeHtml(b.course_id || '')}">Open classroom</button>
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
    if (msg) msg.textContent = '';
  } catch (e) {
    grid.innerHTML = '';
    if (msg) msg.textContent = e.message || 'Could not load classrooms.';
  }
}

function buildParticipantShareUrl(token) {
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}?classroom=${token}`;
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
    input.placeholder = e.message || 'Could not load link';
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
  currentBatchId = '';
  currentBatchLabel = '';
  currentClassroomCourseId = '';
  assignmentsCache = [];
  materialsCache = [];
  submissionsAssignmentId = '';
  submissionsCache = [];
  clearAssignmentEditing();
  clearMaterialEditing();
  showPanel(true);
}

async function refreshClassroomData() {
  if (!currentBatchId) return;
  await Promise.all([loadAssignmentsList(), loadMaterialsList()]);
  await loadSubmissionsBoard();
  updateGradeAssignmentSelect();
  const sel = $('classroomGradeAssignmentSelect');
  const aid = sel && sel.value;
  if (aid) await loadGradesTable(aid);
  else {
    const tbody = $('classroomGradesBody');
    if (tbody) tbody.innerHTML = '';
  }
}

function renderSubmissionsList() {
  const host = $('classroomSubmissionsList');
  if (!host) return;
  if (!submissionsAssignmentId) {
    host.innerHTML = '<p class="muted">Select an assignment to view submissions.</p>';
    return;
  }
  if (!submissionsCache.length) {
    host.innerHTML = '<p class="muted">No submissions yet.</p>';
    return;
  }
  host.innerHTML = submissionsCache
    .map((s) => {
      const status = s.status === 'reviewed' ? 'Reviewed' : 'Submitted';
      const when = s.submitted_at ? String(s.submitted_at).replace('T', ' ').slice(0, 16) : '';
      const file = s.file_url
        ? `<a href="${escapeHtml(s.file_url)}" target="_blank" rel="noopener noreferrer">Open file</a>`
        : '<span class="muted">No file</span>';
      const snippet = s.submission_text ? `<p class="muted small-margin">${escapeHtml(String(s.submission_text).slice(0, 180))}</p>` : '';
      return `<article class="classroom-submission-card" data-id="${escapeHtml(s.id)}">
        <div class="classroom-submission-card-head">
          <strong>${escapeHtml(s.trainee_name || 'Trainee')}</strong>
          <span class="classroom-submission-status">${escapeHtml(status)}</span>
        </div>
        <p class="muted small-margin">${escapeHtml(s.trainee_email || '')}${when ? ` · ${escapeHtml(when)}` : ''}</p>
        <p class="small-margin">${file}</p>
        ${snippet}
      </article>`;
    })
    .join('');
  host.querySelectorAll('.classroom-submission-card').forEach((card) => {
    card.addEventListener('click', () => {
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
    host.innerHTML = '<p class="muted">No assignments yet.</p>';
    submissionsAssignmentId = '';
    submissionsCache = [];
    renderSubmissionsList();
    return;
  }
  host.innerHTML = assignmentsCache
    .map((a) => {
      const on = submissionsAssignmentId === a.id;
      const due = a.due_date ? `Due ${escapeHtml(a.due_date)}` : 'No due date';
      return `<button type="button" class="classroom-submissions-asg ${on ? 'active' : ''}" data-id="${escapeHtml(a.id)}">
        <strong>${escapeHtml(a.title)}</strong>
        <span class="muted">${due}</span>
      </button>`;
    })
    .join('');
  host.querySelectorAll('.classroom-submissions-asg').forEach((btn) => {
    btn.addEventListener('click', () => {
      const aid = btn.getAttribute('data-id');
      host.querySelectorAll('.classroom-submissions-asg').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      $('classroomReviewSubmissionId').value = '';
      $('classroomReviewTarget').textContent = 'Select a submission.';
      $('classroomSubmissionReviewForm')?.reset();
      void loadSubmissionsForAssignment(aid);
    });
  });
  if (!submissionsAssignmentId && assignmentsCache[0]) {
    const first = assignmentsCache[0].id;
    submissionsAssignmentId = first;
    const firstBtn = host.querySelector(`.classroom-submissions-asg[data-id="${first}"]`);
    if (firstBtn) firstBtn.classList.add('active');
    await loadSubmissionsForAssignment(first);
    return;
  }
  if (submissionsAssignmentId) await loadSubmissionsForAssignment(submissionsAssignmentId);
}

function updateGradeAssignmentSelect() {
  const sel = $('classroomGradeAssignmentSelect');
  if (!sel) return;
  const prev = sel.value;
  sel.innerHTML =
    '<option value="">— Select an assignment —</option>' +
    assignmentsCache
      .map((a) => `<option value="${escapeHtml(a.id)}">${escapeHtml(a.title)}</option>`)
      .join('');
  if (prev && assignmentsCache.some((a) => a.id === prev)) sel.value = prev;
  else if (assignmentsCache.length === 1) sel.value = assignmentsCache[0].id;
  sel.dispatchEvent(new Event('change'));
}

async function loadAssignmentsList() {
  const host = $('classroomAssignmentsList');
  const msg = $('classroomClassworkMsg');
  if (!host || !currentBatchId) return;
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
      host.innerHTML = '<p class="muted">No assignments yet. Add one below.</p>';
      if (msg) msg.textContent = '';
      return;
    }
    host.innerHTML = assignmentsCache
      .map((a) => {
        const due = a.due_date ? ` · Due ${escapeHtml(a.due_date)}` : '';
        const files = assignmentFilesCache[a.id] || [];
        const filesHtml = files.length
          ? `<ul class="classroom-assignment-files">${files
              .map(
                (f) =>
                  `<li><a href="${escapeHtml(f.file_url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(f.title || 'Attachment')}</a>
                    <button type="button" class="btn btn-secondary btn-sm classroom-del-asg-file" data-id="${escapeHtml(f.id)}" data-aid="${escapeHtml(a.id)}">Remove file</button>
                  </li>`,
              )
              .join('')}</ul>`
          : '<p class="muted small-margin">No attachments.</p>';
        return `<div class="classroom-assignment-row">
          <div>
            <strong>${escapeHtml(a.title)}</strong>${due}
            ${a.instructions ? `<p class="muted small-margin">${escapeHtml(a.instructions)}</p>` : ''}
            ${filesHtml}
          </div>
          <div class="classroom-inline-actions">
            <button type="button" class="btn btn-secondary btn-sm classroom-edit-asg" data-id="${escapeHtml(a.id)}">Edit</button>
            <button type="button" class="btn btn-secondary btn-sm classroom-del-asg" data-id="${escapeHtml(a.id)}">Remove</button>
          </div>
        </div>`;
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
        if (!id || !confirm('Remove this assignment and its grades?')) return;
        try {
          await jsonFetch(`${CLASSROOM}?resource=assignments&id=${encodeURIComponent(id)}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
          });
          if (String($('classroomAsgEditId')?.value || '') === id) clearAssignmentEditing();
          await refreshClassroomData();
        } catch (e) {
          alert(e.message);
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
          alert(e.message);
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
  try {
    const data = await jsonFetch(`${CLASSROOM}?resource=materials&batch_id=${encodeURIComponent(currentBatchId)}`, {
      headers: getAuthHeaders(),
    });
    const items = data.items || [];
    materialsCache = items;
    if (!items.length) {
      host.innerHTML = '<li class="muted">No resource links yet.</li>';
      if (msg) msg.textContent = '';
      return;
    }
    host.innerHTML = items
      .map(
        (m) =>
          `<li class="classroom-material-row">
            <div class="classroom-material-main">
              <a href="${escapeHtml(m.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(m.title)}</a>
              ${m.description ? `<span class="muted"> — ${escapeHtml(m.description)}</span>` : ''}
            </div>
            <div class="classroom-inline-actions">
              <button type="button" class="btn btn-secondary btn-sm classroom-edit-mat" data-id="${escapeHtml(m.id)}">Edit</button>
              <button type="button" class="btn btn-secondary btn-sm classroom-del-mat" data-id="${escapeHtml(m.id)}">Remove</button>
            </div>
          </li>`,
      )
      .join('');
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
          alert(e.message);
        }
      });
    });
    if (msg) msg.textContent = '';
  } catch (e) {
    host.innerHTML = '';
    if (msg) msg.textContent = e.message || 'Could not load materials.';
  }
}

async function loadGradesTable(assignmentId) {
  const tbody = $('classroomGradesBody');
  const msg = $('classroomGradesMsg');
  if (!tbody || !assignmentId) {
    if (tbody) tbody.innerHTML = '';
    return;
  }
  try {
    const data = await jsonFetch(`${CLASSROOM}?resource=grades&assignment_id=${encodeURIComponent(assignmentId)}`, {
      headers: getAuthHeaders(),
    });
    const roster = data.roster || [];
    if (!roster.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="muted">No enrollments in this batch yet.</td></tr>';
      if (msg) msg.textContent = '';
      return;
    }
    tbody.innerHTML = roster
      .map((r) => {
        const g = r.grade != null && r.grade !== '' ? String(r.grade) : '';
        const fb = r.feedback != null ? escapeHtml(String(r.feedback).replace(/\r?\n/g, ' ')) : '';
        return `<tr data-trainee-id="${escapeHtml(r.trainee_id)}">
          <td>${escapeHtml(r.full_name)}</td>
          <td><input type="number" class="classroom-grade-input" step="0.01" min="0" max="9999" value="${escapeHtml(g)}" aria-label="Grade for ${escapeHtml(r.full_name)}" /></td>
          <td><input type="text" class="classroom-feedback-input" value="${fb}" maxlength="2000" aria-label="Feedback for ${escapeHtml(r.full_name)}" /></td>
          <td><button type="button" class="btn btn-primary btn-sm classroom-save-grade">Save</button></td>
        </tr>`;
      })
      .join('');
    tbody.querySelectorAll('.classroom-save-grade').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tr = btn.closest('tr');
        const tid = tr && tr.getAttribute('data-trainee-id');
        if (!tid || !assignmentId) return;
        const gradeInput = tr.querySelector('.classroom-grade-input');
        const fbInput = tr.querySelector('.classroom-feedback-input');
        void saveGrade(assignmentId, tid, gradeInput && gradeInput.value, fbInput && fbInput.value);
      });
    });
    if (msg) msg.textContent = '';
  } catch (e) {
    tbody.innerHTML = '';
    if (msg) msg.textContent = e.message || 'Could not load grades.';
  }
}

async function saveGrade(assignmentId, traineeId, gradeVal, feedback) {
  const msg = $('classroomGradesMsg');
  try {
    await jsonFetch(`${CLASSROOM}?resource=grades`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        assignment_id: assignmentId,
        trainee_id: traineeId,
        grade: gradeVal === '' ? null : gradeVal,
        feedback: feedback || null,
      }),
    });
    if (msg) msg.textContent = 'Saved.';
    setTimeout(() => {
      if (msg) msg.textContent = '';
    }, 2000);
  } catch (e) {
    if (msg) msg.textContent = e.message || 'Save failed.';
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
  $('classroomBackBtn')?.addEventListener('click', () => closeClassroomRoom());

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
      $('classroomClassworkMsg').textContent = err.message || 'Failed to save assignment.';
    }
  });

  $('classroomAsgCancelEdit')?.addEventListener('click', () => clearAssignmentEditing());

  $('classroomMaterialForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentBatchId) return;
    const title = String($('classroomMatTitle')?.value || '').trim();
    const url = String($('classroomMatUrl')?.value || '').trim();
    const description = String($('classroomMatDesc')?.value || '').trim();
    if (!title || !url) return;
    const editId = String($('classroomMatEditId')?.value || '').trim();
    try {
      if (editId) {
        await jsonFetch(`${CLASSROOM}?resource=materials&id=${encodeURIComponent(editId)}`, {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            title,
            url,
            description: description || null,
          }),
        });
        clearMaterialEditing();
      } else {
        await jsonFetch(`${CLASSROOM}?resource=materials`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            batch_id: currentBatchId,
            title,
            url,
            description: description || null,
          }),
        });
        clearMaterialEditing();
      }
      await loadMaterialsList();
      $('classroomMaterialsMsg').textContent = '';
    } catch (err) {
      $('classroomMaterialsMsg').textContent = err.message || 'Failed to save link.';
    }
  });

  $('classroomMatCancelEdit')?.addEventListener('click', () => clearMaterialEditing());

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
      if (msg) msg.textContent = 'Review saved.';
      if (submissionsAssignmentId) await loadSubmissionsForAssignment(submissionsAssignmentId);
    } catch (err) {
      if (msg) msg.textContent = err.message || 'Could not save review.';
    }
  });

  $('classroomGradeAssignmentSelect')?.addEventListener('change', (ev) => {
    const aid = String(ev.target.value || '').trim();
    void loadGradesTable(aid);
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
