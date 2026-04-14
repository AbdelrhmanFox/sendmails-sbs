import {
  jsonFetch,
  getAuthHeaders,
  showToast,
  detectFileKind,
  renderFileTypeIcon,
  initUploadDropzones,
} from './shared.js';

const state = {
  courses: [],
  currentBatchId: '',
  me: null,
};

function esc(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function loadMe() {
  const data = await jsonFetch('/.netlify/functions/trainee-me', { headers: getAuthHeaders() });
  state.me = data;
  const welcome = document.getElementById('traineeWelcome');
  if (welcome) welcome.textContent = data?.trainee?.full_name || data?.account?.email || 'Trainee';
  const hint = document.getElementById('traineePasswordHint');
  if (hint) {
    hint.textContent = data?.account?.must_change_password
      ? 'Security update required: change your temporary password now.'
      : 'Your account password is up to date.';
  }
}

function renderCourses() {
  const host = document.getElementById('traineeCoursesList');
  if (!host) return;
  if (!state.courses.length) {
    host.innerHTML = '<p class="muted">No enrollments are currently assigned to your account.</p>';
    return;
  }
  host.innerHTML = state.courses
    .map(
      (item) => `<button type="button" class="trainee-course-item ${state.currentBatchId === item.batch_id ? 'active' : ''}" data-batch-id="${esc(
        item.batch_id,
      )}">
      <strong>${esc(item.course_name || 'Untitled Course')}</strong>
      <span>${esc(item.batch_name || item.batch_id)}</span>
    </button>`,
    )
    .join('');
  host.querySelectorAll('.trainee-course-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.currentBatchId = String(btn.getAttribute('data-batch-id') || '');
      renderCourses();
      void loadClassroom();
    });
  });
}

function renderResourceList(items = []) {
  if (!items.length) return '<p class="muted">No resources published yet.</p>';
  return `<ul class="pub-resources">${items
    .map((m) => {
      const kind = detectFileKind(m.url, m.title, m.mime_type);
      return `<li class="pub-resource-card">
        <div class="pub-resource-head">
          <div class="pub-resource-title">${esc(m.title || 'Resource')}</div>
          <span class="pub-resource-tag">${renderFileTypeIcon(kind.iconKey, kind.label)}</span>
        </div>
        <p class="muted">${esc(m.description || '')}</p>
        <a href="${esc(m.url || '#')}" target="_blank" rel="noopener noreferrer">Open resource</a>
      </li>`;
    })
    .join('')}</ul>`;
}

function bindSubmissionForms() {
  document.querySelectorAll('.trainee-submission-form').forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const assignmentId = String(form.getAttribute('data-assignment-id') || '');
      const text = String(form.querySelector('[name="submission_text"]')?.value || '').trim();
      const fileInput = form.querySelector('input[type="file"]');
      let fileUrl = '';
      let fileStorageKey = '';
      if (fileInput && fileInput.files && fileInput.files[0]) {
        const f = fileInput.files[0];
        const uploadCfg = await jsonFetch('/.netlify/functions/trainee-submission-upload', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            assignment_id: assignmentId,
            filename: f.name,
            contentType: f.type || 'application/octet-stream',
          }),
        });
        const putRes = await fetch(uploadCfg.uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': f.type || 'application/octet-stream' },
          body: f,
        });
        if (!putRes.ok) throw new Error('Could not upload file');
        fileUrl = uploadCfg.publicUrl || '';
        fileStorageKey = uploadCfg.objectPath || '';
      }
      await jsonFetch('/.netlify/functions/trainee-submissions', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          assignment_id: assignmentId,
          submission_text: text || null,
          file_url: fileUrl || null,
          file_storage_key: fileStorageKey || null,
        }),
      });
      showToast('Submission saved successfully.', 'success');
      void loadClassroom();
    });
  });
}

async function loadClassroom() {
  if (!state.currentBatchId) return;
  const wrap = document.getElementById('traineeClassroom');
  if (!wrap) return;
  wrap.innerHTML = '<p class="muted">Loading classroom...</p>';
  try {
    const data = await jsonFetch(`/.netlify/functions/trainee-classroom?batch_id=${encodeURIComponent(state.currentBatchId)}`, {
      headers: getAuthHeaders(),
    });
    const assignments = data.assignments || [];
    const mats = data.materials || [];
    const lib = data.course_library || { chapters: [], uncategorized: [] };
    wrap.innerHTML = `
      <div class="card">
        <h3>${esc(data.batch?.course_name || 'Classroom')}</h3>
        <p class="muted">${esc(data.batch?.batch_name || '')}</p>
      </div>
      <div class="card">
        <h3>Assignments</h3>
        ${
          assignments.length
            ? assignments
                .map(
                  (a) => `<article class="trainee-assignment-item">
                <h4>${esc(a.title)}</h4>
                <p class="muted">${esc(a.instructions || '')}</p>
                <p class="muted">Due: ${esc(a.due_date || 'No deadline')}</p>
                <form class="trainee-submission-form" data-assignment-id="${esc(a.id)}">
                  <textarea name="submission_text" placeholder="Write your answer">${esc(a.my_submission?.submission_text || '')}</textarea>
                  <div class="upload-dropzone">
                    <label class="upload-dropzone__label">
                      <span class="upload-dropzone__title">Attach file (optional)</span>
                      <span class="upload-dropzone__hint">PDF, Office, media</span>
                      <input type="file" class="upload-dropzone__input" />
                    </label>
                  </div>
                  <button type="submit" class="btn btn-primary">Save submission</button>
                </form>
              </article>`,
                )
                .join('')
            : '<p class="muted">No assignments yet.</p>'
        }
      </div>
      <div class="card">
        <h3>Batch Materials</h3>
        ${renderResourceList(mats)}
      </div>
      <div class="card">
        <h3>Course Library</h3>
        ${renderResourceList(lib.uncategorized || [])}
        ${(lib.chapters || [])
          .map((ch) => `<details><summary>${esc(ch.title)}</summary>${renderResourceList(ch.materials || [])}</details>`)
          .join('')}
      </div>`;
    initUploadDropzones(wrap);
    bindSubmissionForms();
  } catch (err) {
    wrap.innerHTML = `<p class="inline-error">${esc(err.message || 'Could not load classroom.')}</p>`;
  }
}

async function loadCourses() {
  const data = await jsonFetch('/.netlify/functions/trainee-courses', { headers: getAuthHeaders() });
  state.courses = data.items || [];
  state.currentBatchId = state.currentBatchId || state.courses[0]?.batch_id || '';
  renderCourses();
  void loadClassroom();
}

function initPasswordForm() {
  const form = document.getElementById('traineePasswordForm');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const cur = String(document.getElementById('traineeCurrentPassword')?.value || '');
    const next = String(document.getElementById('traineeNewPassword')?.value || '');
    const conf = String(document.getElementById('traineeConfirmPassword')?.value || '');
    if (next !== conf) {
      showToast('New password and confirmation do not match.', 'error');
      return;
    }
    try {
      await jsonFetch('/.netlify/functions/trainee-change-password', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ currentPassword: cur, newPassword: next }),
      });
      form.reset();
      showToast('Password updated successfully.', 'success');
      void loadMe();
    } catch (err) {
      showToast(err.message || 'Could not update password.', 'error');
    }
  });
}

export function initTraineePortal() {
  initPasswordForm();
}

export async function loadTraineePortal() {
  await loadMe();
  await loadCourses();
}
