import { jsonFetch } from './shared.js';

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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
  asgHost.innerHTML = '<p class="muted">Loading…</p>';
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
          return `<div class="public-classroom-item">
            <strong>${escapeHtml(a.title)}</strong>
            ${due}
            ${inst}
          </div>`;
        })
        .join('');
    }
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
