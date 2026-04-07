import { jsonFetch } from './shared.js';

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function uploadSubmissionFile(token, assignmentId, file) {
  const meta = await jsonFetch('/.netlify/functions/public-classroom-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token,
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
    throw new Error(t || `File upload failed (${put.status})`);
  }
  return { publicUrl: meta.publicUrl, path: meta.path };
}

function wireSubmissionForms(token) {
  document.querySelectorAll('.public-submission-form').forEach((form) => {
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const assignmentId = String(form.getAttribute('data-assignment-id') || '').trim();
      if (!assignmentId) return;

      const msg = form.querySelector('.public-submission-msg');
      const submitBtn = form.querySelector('.public-submission-submit');
      const nameInput = form.querySelector('.public-submission-name');
      const emailInput = form.querySelector('.public-submission-email');
      const textInput = form.querySelector('.public-submission-text');
      const fileInput = form.querySelector('.public-submission-file');

      const traineeName = String(nameInput?.value || '').trim();
      const traineeEmail = String(emailInput?.value || '').trim();
      const submissionText = String(textInput?.value || '').trim();
      const file = fileInput && fileInput.files && fileInput.files[0];

      if (!traineeName) {
        if (msg) msg.textContent = 'Your name is required.';
        return;
      }
      if (!submissionText && !file) {
        if (msg) msg.textContent = 'Add text/link or upload a file.';
        return;
      }

      if (submitBtn) submitBtn.disabled = true;
      if (msg) msg.textContent = 'Submitting...';

      try {
        let fileUrl = null;
        let fileStorageKey = null;
        if (file) {
          const up = await uploadSubmissionFile(token, assignmentId, file);
          fileUrl = up.publicUrl;
          fileStorageKey = up.path;
        }

        const res = await jsonFetch('/.netlify/functions/public-classroom-submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token,
            assignment_id: assignmentId,
            trainee_name: traineeName,
            trainee_email: traineeEmail || null,
            submission_text: submissionText || null,
            file_url: fileUrl,
            file_storage_key: fileStorageKey,
          }),
        });

        if (msg) msg.textContent = res.updated ? 'Updated successfully.' : 'Submitted successfully.';
        if (fileInput) fileInput.value = '';
      } catch (err) {
        if (msg) msg.textContent = err.message || 'Submit failed.';
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  });
}

function wireReviewLookup(token) {
  const form = document.getElementById('publicReviewLookupForm');
  const emailInput = document.getElementById('publicReviewEmail');
  const msg = document.getElementById('publicReviewMsg');
  const host = document.getElementById('publicReviewResults');
  if (!form || !emailInput || !host) return;
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const email = String(emailInput.value || '').trim().toLowerCase();
    if (!email) return;
    host.innerHTML = '';
    if (msg) msg.textContent = 'Loading...';
    try {
      const data = await jsonFetch('/.netlify/functions/public-classroom-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email }),
      });
      const items = data.items || [];
      if (!items.length) {
        host.innerHTML = '<p class="muted">No submissions found for this email in this classroom.</p>';
      } else {
        host.innerHTML = items
          .map((it) => {
            const reviewed = !!it.review;
            const grade = reviewed && it.review.grade != null ? String(it.review.grade) : '—';
            const feedback = reviewed && it.review.feedback ? escapeHtml(it.review.feedback) : 'No feedback yet.';
            const reviewedAt = reviewed && it.review.reviewed_at ? String(it.review.reviewed_at).replace('T', ' ').slice(0, 16) : '';
            const status = reviewed ? 'Reviewed' : 'Pending review';
            return `<article class="public-classroom-item">
              <strong>${escapeHtml(it.assignment_title || 'Assignment')}</strong>
              <p class="muted small-margin">Status: ${escapeHtml(status)}</p>
              <p class="small-margin"><strong>Grade:</strong> ${escapeHtml(grade)}</p>
              <p class="small-margin"><strong>Feedback:</strong> ${feedback}</p>
              ${reviewedAt ? `<p class="muted small-margin">Reviewed at: ${escapeHtml(reviewedAt)}</p>` : ''}
            </article>`;
          })
          .join('');
      }
      if (msg) msg.textContent = '';
    } catch (err) {
      if (msg) msg.textContent = err.message || 'Could not load review.';
    }
  });
}

/**
 * Load read-only classroom for participants (?classroom=<token>, no auth).
 */
export async function initPublicClassroom(token) {
  const heading = document.getElementById('publicClassroomHeading');
  const sub = document.getElementById('publicClassroomSub');
  const msg = document.getElementById('publicClassroomMsg');
  const asgHost = document.getElementById('publicClassroomAssignments');
  const courseLibHost = document.getElementById('publicClassroomCourseLibrary');
  const courseLibWrap = document.getElementById('publicClassroomCourseLibraryWrap');
  const matHost = document.getElementById('publicClassroomMaterials');
  if (!asgHost || !matHost) return;
  if (!String(token || '').trim()) {
    asgHost.innerHTML = '';
    matHost.innerHTML = '';
    if (courseLibHost) courseLibHost.innerHTML = '';
    if (courseLibWrap) courseLibWrap.classList.add('hidden');
    if (msg) {
      msg.textContent = 'Missing classroom link.';
      msg.hidden = false;
    }
    return;
  }
  if (msg) {
    msg.hidden = true;
    msg.textContent = '';
  }
    const reviewMsg = document.getElementById('publicReviewMsg');
    const reviewHost = document.getElementById('publicReviewResults');
    if (reviewMsg) reviewMsg.textContent = '';
    if (reviewHost) reviewHost.innerHTML = '';
  asgHost.innerHTML = '<p class="muted">Loading...</p>';
  matHost.innerHTML = '';
  if (courseLibHost) courseLibHost.innerHTML = '';
  if (courseLibWrap) courseLibWrap.classList.add('hidden');
  try {
    const data = await jsonFetch(`/.netlify/functions/public-classroom?token=${encodeURIComponent(token)}`);
    const b = data.batch || {};
    const title = [b.course_name, b.batch_name || b.batch_id].filter(Boolean).join(' · ') || b.batch_id || 'Classroom';
    if (heading) heading.textContent = title;
    if (sub) {
      const extra = b.trainer ? ` · Trainer: ${b.trainer}` : '';
      sub.textContent = `Participant view · no sign-in required${extra}`;
    }
    const assignments = data.assignments || [];
    if (!assignments.length) {
      asgHost.innerHTML = '<p class="muted">No assignments posted yet.</p>';
    } else {
      asgHost.innerHTML = assignments
        .map((a) => {
          const due = a.due_date ? `<p class="muted small-margin">Due ${escapeHtml(a.due_date)}</p>` : '';
          const inst = a.instructions ? `<div class="public-classroom-instructions">${escapeHtml(a.instructions)}</div>` : '';
          const attachments = Array.isArray(a.attachments) ? a.attachments : [];
          const atHtml = attachments.length
            ? `<div class="public-classroom-attachments"><p class="muted small-margin"><strong>Attachments</strong></p><ul class="public-classroom-materials-ul">${attachments
                .map((f) => `<li><a href="${escapeHtml(f.file_url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(f.title || 'Attachment')}</a></li>`)
                .join('')}</ul></div>`
            : '';
          return `<div class="public-classroom-item">
            <strong>${escapeHtml(a.title)}</strong>
            ${due}
            ${inst}
            ${atHtml}
            <form class="public-submission-form" data-assignment-id="${escapeHtml(a.id)}">
              <div class="public-submission-grid">
                <label>Name <input type="text" required class="public-submission-name" maxlength="200" /></label>
                <label>Email (optional) <input type="email" class="public-submission-email" maxlength="200" /></label>
                <label class="full">Your solution (text/link)
                  <textarea class="public-submission-text" rows="3" maxlength="5000" placeholder="Write answer or paste links..."></textarea>
                </label>
                <label class="full">Attachment (optional)
                  <input type="file" class="public-submission-file" />
                </label>
              </div>
              <div class="public-submission-actions">
                <button type="submit" class="btn btn-primary public-submission-submit">Submit solution</button>
                <span class="inline-note public-submission-msg"></span>
              </div>
            </form>
          </div>`;
        })
        .join('');
      wireSubmissionForms(token);
    }
    wireReviewLookup(token);
    const cl = data.course_library;
    if (cl && courseLibHost && courseLibWrap) {
      const hasCh = (cl.chapters || []).some((ch) => (ch.materials || []).length);
      const hasU = (cl.uncategorized || []).length > 0;
      if (hasCh || hasU) {
        courseLibWrap.classList.remove('hidden');
        const blocks = [];
        (cl.chapters || []).forEach((ch) => {
          const items = ch.materials || [];
          if (!items.length) return;
          const lis = items
            .map((m) => {
              const desc = m.description ? ` <span class="muted">— ${escapeHtml(m.description)}</span>` : '';
              return `<li><a href="${escapeHtml(m.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(m.title)}</a>${desc}</li>`;
            })
            .join('');
          blocks.push(`<div class="public-classroom-course-chapter"><h4 class="public-classroom-course-chapter-title">${escapeHtml(ch.title)}</h4><ul class="public-classroom-materials-ul">${lis}</ul></div>`);
        });
        if (cl.uncategorized && cl.uncategorized.length) {
          const lis = cl.uncategorized
            .map((m) => {
              const desc = m.description ? ` <span class="muted">— ${escapeHtml(m.description)}</span>` : '';
              return `<li><a href="${escapeHtml(m.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(m.title)}</a>${desc}</li>`;
            })
            .join('');
          blocks.push(`<div class="public-classroom-course-chapter"><h4 class="public-classroom-course-chapter-title">Other</h4><ul class="public-classroom-materials-ul">${lis}</ul></div>`);
        }
        courseLibHost.innerHTML = blocks.join('');
      }
    }

    const materials = data.materials || [];
    if (!materials.length) {
      matHost.innerHTML = '<p class="muted">No resource links yet.</p>';
    } else {
      matHost.innerHTML = `<ul class="public-classroom-materials-ul">${materials
        .map((m) => {
          const desc = m.description ? ` <span class="muted">— ${escapeHtml(m.description)}</span>` : '';
          return `<li><a href="${escapeHtml(m.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(m.title)}</a>${desc}</li>`;
        })
        .join('')}</ul>`;
    }
  } catch (e) {
    asgHost.innerHTML = '';
    matHost.innerHTML = '';
    if (courseLibHost) courseLibHost.innerHTML = '';
    if (courseLibWrap) courseLibWrap.classList.add('hidden');
    if (msg) {
      msg.textContent = e.message || 'Could not load classroom.';
      msg.hidden = false;
    }
    if (heading) heading.textContent = 'Classroom';
  }
}
