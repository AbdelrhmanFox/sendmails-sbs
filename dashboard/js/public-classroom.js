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

/** Update status badge on an assignment card by assignment ID */
function setAsgBadge(assignmentId, statusHtml) {
  const card = document.querySelector(`.pub-asg-card[data-asg-id="${assignmentId}"]`);
  if (!card) return;
  const badge = card.querySelector('.pub-asg-status');
  if (badge) badge.outerHTML = statusHtml;
}

/** Render inline review inside assignment card */
function renderInlineReview(assignmentId, reviewData) {
  const card = document.querySelector(`.pub-asg-card[data-asg-id="${assignmentId}"]`);
  if (!card) return;
  let reviewBlock = card.querySelector('.pub-asg-review');
  if (!reviewBlock) {
    reviewBlock = document.createElement('div');
    reviewBlock.className = 'pub-asg-review';
    card.appendChild(reviewBlock);
  }
  if (!reviewData) {
    reviewBlock.innerHTML = '';
    return;
  }
  const isReviewed = !!reviewData.review;
  const grade = isReviewed && reviewData.review.grade != null ? escapeHtml(String(reviewData.review.grade)) : null;
  const feedback = isReviewed && reviewData.review.feedback ? escapeHtml(reviewData.review.feedback) : null;
  const reviewedAt = isReviewed && reviewData.review.reviewed_at
    ? escapeHtml(String(reviewData.review.reviewed_at).replace('T', ' ').slice(0, 16))
    : null;
  reviewBlock.innerHTML = isReviewed
    ? `<div class="pub-review-card">
        <p class="pub-review-label">Your review</p>
        ${grade != null ? `<p class="pub-review-row"><span class="pub-review-key">Grade</span><strong class="pub-review-val">${grade}</strong></p>` : ''}
        ${feedback ? `<p class="pub-review-row"><span class="pub-review-key">Feedback</span><span class="pub-review-val">${feedback}</span></p>` : ''}
        ${reviewedAt ? `<p class="pub-review-row"><span class="pub-review-key">Reviewed</span><span class="pub-review-val muted">${reviewedAt}</span></p>` : ''}
      </div>`
    : `<div class="pub-review-card pub-review-card--pending">
        <p class="pub-review-label">Your submission is pending review.</p>
      </div>`;
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
      if (msg) msg.textContent = 'Submitting…';

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

        if (msg) msg.textContent = res.updated ? 'Updated successfully.' : 'Submitted!';
        if (fileInput) fileInput.value = '';

        // Update badge and close details panel
        setAsgBadge(assignmentId, `<span class="badge badge--info pub-asg-status">Submitted</span>`);
        const details = form.closest('details');
        if (details) details.removeAttribute('open');
        const summaryEl = details?.querySelector('summary');
        if (summaryEl) summaryEl.textContent = 'Edit submission';
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
  if (!form || !emailInput) return;

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const email = String(emailInput.value || '').trim().toLowerCase();
    if (!email) return;
    if (msg) msg.textContent = 'Looking up…';

    // Clear existing inline reviews
    document.querySelectorAll('.pub-asg-review').forEach((el) => el.remove());

    try {
      const data = await jsonFetch('/.netlify/functions/public-classroom-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email }),
      });
      const items = data.items || [];

      // Build a map: assignmentId → review item
      const reviewMap = {};
      items.forEach((it) => {
        if (it.assignment_id) reviewMap[it.assignment_id] = it;
      });

      // Update each assignment card
      document.querySelectorAll('.pub-asg-card').forEach((card) => {
        const aid = card.getAttribute('data-asg-id');
        const reviewItem = reviewMap[aid];
        if (reviewItem) {
          const isReviewed = !!reviewItem.review;
          setAsgBadge(
            aid,
            isReviewed
              ? `<span class="badge badge--success pub-asg-status">Reviewed</span>`
              : `<span class="badge badge--info pub-asg-status">Submitted</span>`,
          );
          renderInlineReview(aid, reviewItem);
        }
      });

      if (msg) msg.textContent = items.length ? `Found ${items.length} submission${items.length > 1 ? 's' : ''}.` : 'No submissions found for this email.';
    } catch (err) {
      if (msg) msg.textContent = err.message || 'Could not load review.';
    }
  });
}

function wirePubResourceTabs() {
  const tabCourse = document.getElementById('pubTabCourse');
  const tabBatch = document.getElementById('pubTabBatch');
  const paneCourse = document.getElementById('pubPaneCourse');
  const paneBatch = document.getElementById('pubPaneBatch');
  if (!tabCourse || !tabBatch) return;

  function activate(which) {
    tabCourse.classList.toggle('active', which === 'course');
    tabCourse.setAttribute('aria-selected', which === 'course' ? 'true' : 'false');
    tabBatch.classList.toggle('active', which === 'batch');
    tabBatch.setAttribute('aria-selected', which === 'batch' ? 'true' : 'false');
    if (paneCourse) { paneCourse.classList.toggle('hidden', which !== 'course'); paneCourse.hidden = which !== 'course'; }
    if (paneBatch) { paneBatch.classList.toggle('hidden', which !== 'batch'); paneBatch.hidden = which !== 'batch'; }
  }

  tabCourse.addEventListener('click', () => activate('course'));
  tabBatch.addEventListener('click', () => activate('batch'));
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
  const matHost = document.getElementById('publicClassroomMaterials');
  const resourcesBlock = document.getElementById('publicResourcesBlock');

  if (!asgHost) return;

  if (!String(token || '').trim()) {
    asgHost.innerHTML = '';
    if (matHost) matHost.innerHTML = '';
    if (courseLibHost) courseLibHost.innerHTML = '';
    if (msg) { msg.textContent = 'Missing classroom link.'; msg.hidden = false; }
    return;
  }

  if (msg) { msg.hidden = true; msg.textContent = ''; }
  asgHost.innerHTML = '<div class="skeleton-row skeleton-row--lg"></div><div class="skeleton-row skeleton-row--lg"></div>';

  wirePubResourceTabs();

  try {
    const data = await jsonFetch(`/.netlify/functions/public-classroom?token=${encodeURIComponent(token)}`);
    const b = data.batch || {};
    const title = [b.course_name, b.batch_name || b.batch_id].filter(Boolean).join(' · ') || b.batch_id || 'Classroom';
    if (heading) heading.textContent = title;
    if (sub) {
      const extra = b.trainer ? ` · Trainer: ${escapeHtml(b.trainer)}` : '';
      sub.textContent = `Participant view · no sign-in required${extra}`;
    }

    const assignments = data.assignments || [];
    const today = new Date().toISOString().slice(0, 10);

    if (!assignments.length) {
      asgHost.innerHTML = `<div class="empty-state">
        <svg class="empty-state__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 12h8"/></svg>
        <p class="empty-state__title">No assignments yet</p>
        <p class="empty-state__hint">Your trainer hasn't posted any assignments for this batch.</p>
      </div>`;
    } else {
      asgHost.innerHTML = assignments
        .map((a) => {
          const isOverdue = a.due_date && a.due_date < today;
          const dueBadge = a.due_date
            ? `<span class="badge ${isOverdue ? 'badge--danger' : 'badge--warn'}">${isOverdue ? 'Overdue' : 'Due'} ${escapeHtml(a.due_date)}</span>`
            : '';
          const inst = a.instructions ? `<div class="pub-asg-instructions">${escapeHtml(a.instructions)}</div>` : '';
          const attachments = Array.isArray(a.attachments) ? a.attachments : [];
          const atHtml = attachments.length
            ? `<div class="pub-asg-attachments">
                <p class="muted pub-asg-att-label">Attachments</p>
                <ul class="pub-asg-att-list">${attachments
                  .map((f) => `<li>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;opacity:.55"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    <a href="${escapeHtml(f.file_url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(f.title || 'Attachment')}</a>
                  </li>`)
                  .join('')}</ul></div>`
            : '';
          return `<article class="pub-asg-card" data-asg-id="${escapeHtml(a.id)}">
            <div class="pub-asg-card__head">
              <h4 class="pub-asg-card__title">${escapeHtml(a.title)}</h4>
              <div class="pub-asg-card__badges">
                ${dueBadge}
                <span class="badge badge--muted pub-asg-status">Not submitted</span>
              </div>
            </div>
            ${inst}
            ${atHtml}
            <details class="pub-asg-submit-panel">
              <summary>Submit my answer</summary>
              <div class="pub-asg-submit-body">
                <form class="public-submission-form" data-assignment-id="${escapeHtml(a.id)}">
                  <div class="public-submission-grid">
                    <label>Name <input type="text" required class="public-submission-name" maxlength="200" placeholder="Your full name" /></label>
                    <label>Email <input type="email" class="public-submission-email" maxlength="200" placeholder="your@email.com" /></label>
                    <label class="full">Your solution (text, link, or both)
                      <textarea class="public-submission-text" rows="3" maxlength="5000" placeholder="Write answer or paste links…"></textarea>
                    </label>
                    <label class="full">Attach file (optional)
                      <input type="file" class="public-submission-file" />
                    </label>
                  </div>
                  <div class="public-submission-actions">
                    <button type="submit" class="btn btn-primary public-submission-submit">Submit</button>
                    <span class="inline-note public-submission-msg"></span>
                  </div>
                </form>
              </div>
            </details>
          </article>`;
        })
        .join('');
      wireSubmissionForms(token);
    }

    wireReviewLookup(token);

    // Course library tab
    const cl = data.course_library;
    const hasCh = cl && (cl.chapters || []).some((ch) => (ch.materials || []).length);
    const hasU = cl && (cl.uncategorized || []).length > 0;
    if (courseLibHost) {
      if (hasCh || hasU) {
        const blocks = [];
        (cl.chapters || []).forEach((ch) => {
          const mats = ch.materials || [];
          if (!mats.length) return;
          const lis = mats
            .map((m) => {
              const desc = m.description ? `<span class="muted"> — ${escapeHtml(m.description)}</span>` : '';
              return `<li><a href="${escapeHtml(m.url)}" target="_blank" rel="noopener noreferrer" class="pub-lib-link">${escapeHtml(m.title)}</a>${desc}</li>`;
            })
            .join('');
          blocks.push(`<div class="pub-lib-chapter"><h4 class="pub-lib-chapter-title">${escapeHtml(ch.title)}</h4><ul class="public-classroom-materials-ul">${lis}</ul></div>`);
        });
        if (cl.uncategorized && cl.uncategorized.length) {
          const lis = cl.uncategorized
            .map((m) => {
              const desc = m.description ? `<span class="muted"> — ${escapeHtml(m.description)}</span>` : '';
              return `<li><a href="${escapeHtml(m.url)}" target="_blank" rel="noopener noreferrer" class="pub-lib-link">${escapeHtml(m.title)}</a>${desc}</li>`;
            })
            .join('');
          blocks.push(`<div class="pub-lib-chapter"><h4 class="pub-lib-chapter-title">Other resources</h4><ul class="public-classroom-materials-ul">${lis}</ul></div>`);
        }
        courseLibHost.innerHTML = blocks.join('');
      } else {
        courseLibHost.innerHTML = '<p class="muted" style="font-size:13px">No course content yet.</p>';
      }
    }

    // Batch materials tab
    const materials = data.materials || [];
    if (matHost) {
      if (!materials.length) {
        matHost.innerHTML = '<p class="muted" style="font-size:13px">No batch materials yet.</p>';
      } else {
        matHost.innerHTML = `<ul class="public-classroom-materials-ul">${materials
          .map((m) => {
            const desc = m.description ? `<span class="muted"> — ${escapeHtml(m.description)}</span>` : '';
            return `<li><a href="${escapeHtml(m.url)}" target="_blank" rel="noopener noreferrer" class="pub-lib-link">${escapeHtml(m.title)}</a>${desc}</li>`;
          })
          .join('')}</ul>`;
      }
    }

    // Show resources block
    if (resourcesBlock) resourcesBlock.classList.remove('hidden');

  } catch (e) {
    if (asgHost) asgHost.innerHTML = '';
    if (matHost) matHost.innerHTML = '';
    if (courseLibHost) courseLibHost.innerHTML = '';
    if (msg) { msg.textContent = e.message || 'Could not load classroom.'; msg.hidden = false; }
    if (heading) heading.textContent = 'Classroom';
  }
}
