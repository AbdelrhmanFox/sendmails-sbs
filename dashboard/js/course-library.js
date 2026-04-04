import { jsonFetch, getAuthHeaders } from './shared.js';

const API = '/.netlify/functions/course-library-data';
const UPLOAD_API = '/.netlify/functions/course-library-upload';

async function uploadCourseMaterialFile(courseId, file) {
  const res = await jsonFetch(UPLOAD_API, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      course_id: courseId,
      filename: file.name,
      contentType: file.type || 'application/octet-stream',
    }),
  });
  const headers = { 'Content-Type': file.type || 'application/octet-stream' };
  if (res.token) headers.Authorization = `Bearer ${res.token}`;
  const put = await fetch(res.signedUrl, { method: 'PUT', body: file, headers });
  if (!put.ok) {
    const t = await put.text().catch(() => '');
    throw new Error(t || `Upload failed (${put.status})`);
  }
  return { publicUrl: res.publicUrl, path: res.path };
}

let currentCourseId = '';
let librarySnapshot = null;

function $(id) {
  return document.getElementById(id);
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function clearMaterialForm() {
  const hid = $('courseLibraryMatEditId');
  if (hid) hid.value = '';
  $('courseLibraryMaterialForm')?.reset();
  const sub = $('courseLibraryMatSubmit');
  if (sub) sub.textContent = 'Add link';
  $('courseLibraryMatCancelEdit')?.classList.add('hidden');
  const h = $('courseLibraryMatHeading');
  if (h) h.textContent = 'Add resource link';
  const f = $('courseLibraryMatFile');
  if (f) f.value = '';
}

function beginMaterialEdit(m) {
  const hid = $('courseLibraryMatEditId');
  if (hid) hid.value = m.id || '';
  $('courseLibraryMatTitle').value = m.title || '';
  $('courseLibraryMatUrl').value = m.url || '';
  $('courseLibraryMatDesc').value = m.description || '';
  const sel = $('courseLibraryMatChapter');
  if (sel) {
    const ch = m.chapter_id || '';
    sel.value = ch;
  }
  $('courseLibraryMatSubmit').textContent = 'Save changes';
  $('courseLibraryMatCancelEdit')?.classList.remove('hidden');
  $('courseLibraryMatHeading').textContent = 'Edit resource link';
  $('courseLibraryMatTitle')?.focus();
}

function findMaterialById(id) {
  if (!librarySnapshot || !id) return null;
  for (const ch of librarySnapshot.chapters || []) {
    const m = (ch.materials || []).find((x) => x.id === id);
    if (m) return { ...m, chapter_id: m.chapter_id != null ? m.chapter_id : ch.id };
  }
  const u = (librarySnapshot.uncategorized || []).find((x) => x.id === id);
  return u ? { ...u, chapter_id: null } : null;
}

function fillChapterSelect(chapters, uncategorizedLabel) {
  const sel = $('courseLibraryMatChapter');
  if (!sel) return;
  const opts = [`<option value="">${escapeHtml(uncategorizedLabel)}</option>`].concat(
    (chapters || []).map((c) => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.title)}</option>`),
  );
  sel.innerHTML = opts.join('');
}

function renderTree(data) {
  const host = $('courseLibraryTree');
  if (!host) return;
  const parts = [];
  (data.chapters || []).forEach((ch) => {
    const mats = (ch.materials || [])
      .map((m) => {
        const desc = m.description ? ` <span class="muted">— ${escapeHtml(m.description)}</span>` : '';
        return `<li class="course-library-mat-row">
          <div class="course-library-mat-main">
            <a href="${escapeHtml(m.url)}" target="_blank" rel="noopener noreferrer" class="course-library-link">${escapeHtml(m.title)}</a>${desc}
          </div>
          <div class="course-library-mat-actions">
            <button type="button" class="btn btn-ghost btn-sm course-lib-edit-mat" data-id="${escapeHtml(m.id)}">Edit</button>
            <button type="button" class="btn btn-ghost btn-sm course-lib-del-mat" data-id="${escapeHtml(m.id)}">Remove</button>
          </div>
        </li>`;
      })
      .join('');
    parts.push(`<div class="course-library-chapter" data-chapter-id="${escapeHtml(ch.id)}">
      <div class="course-library-chapter__head">
        <h3 class="course-library-chapter__title">${escapeHtml(ch.title)}</h3>
        <div class="course-library-chapter__actions">
          <button type="button" class="btn btn-ghost btn-sm course-lib-rename-ch" data-id="${escapeHtml(ch.id)}" data-title="${escapeHtml(ch.title)}">Rename</button>
          <button type="button" class="btn btn-ghost btn-sm course-lib-del-ch" data-id="${escapeHtml(ch.id)}">Remove</button>
        </div>
      </div>
      <ul class="course-library-mat-list">${mats || '<li class="course-library-empty">No links in this chapter yet.</li>'}</ul>
    </div>`);
  });

  const unc = (data.uncategorized || [])
    .map((m) => {
      const desc = m.description ? ` <span class="muted">— ${escapeHtml(m.description)}</span>` : '';
      return `<li class="course-library-mat-row">
        <div class="course-library-mat-main">
          <a href="${escapeHtml(m.url)}" target="_blank" rel="noopener noreferrer" class="course-library-link">${escapeHtml(m.title)}</a>${desc}
        </div>
        <div class="course-library-mat-actions">
          <button type="button" class="btn btn-ghost btn-sm course-lib-edit-mat" data-id="${escapeHtml(m.id)}">Edit</button>
          <button type="button" class="btn btn-ghost btn-sm course-lib-del-mat" data-id="${escapeHtml(m.id)}">Remove</button>
        </div>
      </li>`;
    })
    .join('');

  parts.push(`<div class="course-library-chapter course-library-chapter--muted">
    <h3 class="course-library-chapter__title course-library-chapter__title--subtle">Uncategorized</h3>
    <ul class="course-library-mat-list">${unc || '<li class="course-library-empty">No uncategorized links.</li>'}</ul>
  </div>`);

  host.innerHTML = parts.join('');

  host.querySelectorAll('.course-lib-edit-mat').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const m = findMaterialById(id);
      if (m) beginMaterialEdit(m);
    });
  });

  host.querySelectorAll('.course-lib-del-mat').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      if (!id || !currentCourseId) return;
      if (!confirm('Remove this link?')) return;
      try {
        await jsonFetch(`${API}?resource=materials&id=${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        });
        if (String($('courseLibraryMatEditId')?.value || '') === id) clearMaterialForm();
        await loadLibrary(currentCourseId);
      } catch (e) {
        alert(e.message);
      }
    });
  });

  host.querySelectorAll('.course-lib-rename-ch').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const title = btn.getAttribute('data-title') || '';
      $('courseLibraryRenameChapterId').value = id || '';
      $('courseLibraryRenameChapterTitle').value = title;
      $('courseLibraryRenamePanel')?.classList.remove('hidden');
      $('courseLibraryRenameChapterTitle')?.focus();
    });
  });

  host.querySelectorAll('.course-lib-del-ch').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      if (!id || !confirm('Remove this chapter? Links in it become uncategorized.')) return;
      try {
        await jsonFetch(`${API}?resource=chapters&id=${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        });
        await loadLibrary(currentCourseId);
      } catch (e) {
        alert(e.message);
      }
    });
  });
}

export async function loadLibrary(courseId) {
  const cid = String(courseId || '').trim();
  const shell = $('courseLibraryShell');
  const msg = $('courseLibraryMsg');
  if (!cid) {
    currentCourseId = '';
    librarySnapshot = null;
    if (shell) shell.classList.add('hidden');
    clearMaterialForm();
    return;
  }
  currentCourseId = cid;
  if (shell) shell.classList.remove('hidden');
  if (msg) msg.textContent = 'Loading…';
  try {
    const data = await jsonFetch(`${API}?resource=library&course_id=${encodeURIComponent(cid)}`, {
      headers: getAuthHeaders(),
    });
    librarySnapshot = data;
    fillChapterSelect(data.chapters || [], 'Uncategorized');
    renderTree(data);
    clearMaterialForm();
    if (msg) msg.textContent = '';
  } catch (e) {
    librarySnapshot = null;
    const tree = $('courseLibraryTree');
    if (tree) tree.innerHTML = '';
    if (msg) msg.textContent = e.message || 'Could not load library.';
  }
}

export async function loadCourseLibrary() {
  const sel = $('courseLibrarySelect');
  const msg = $('courseLibraryMsg');
  if (!sel) return;
  if (msg) msg.textContent = 'Loading courses…';
  try {
    const data = await jsonFetch(`${API}?resource=courses`, { headers: getAuthHeaders() });
    const items = data.items || [];
    const prev = sel.value;
    sel.innerHTML =
      '<option value="">— Select a course —</option>' +
      items.map((c) => `<option value="${escapeHtml(c.course_id)}">${escapeHtml(c.course_name)} (${escapeHtml(c.course_id)})</option>`).join('');
    if (prev && items.some((c) => c.course_id === prev)) sel.value = prev;
    else if (currentCourseId && items.some((c) => c.course_id === currentCourseId)) sel.value = currentCourseId;
    if (msg) msg.textContent = '';
  } catch (e) {
    sel.innerHTML = '<option value="">— Select a course —</option>';
    if (msg) msg.textContent = e.message || 'Could not load courses.';
  }
}

export function initCourseLibrary() {
  $('courseLibrarySelect')?.addEventListener('change', (ev) => {
    const v = String(ev.target.value || '').trim();
    void loadLibrary(v);
  });

  $('courseLibraryChapterForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentCourseId) return;
    const title = String($('courseLibraryChapterTitle')?.value || '').trim();
    if (!title) return;
    try {
      await jsonFetch(`${API}?resource=chapters`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ course_id: currentCourseId, title }),
      });
      e.target.reset();
      await loadLibrary(currentCourseId);
    } catch (err) {
      $('courseLibraryMsg').textContent = err.message || 'Could not add chapter.';
    }
  });

  $('courseLibraryRenameChapterForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = String($('courseLibraryRenameChapterId')?.value || '').trim();
    const title = String($('courseLibraryRenameChapterTitle')?.value || '').trim();
    if (!id || !title) return;
    try {
      await jsonFetch(`${API}?resource=chapters&id=${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ title }),
      });
      $('courseLibraryRenamePanel')?.classList.add('hidden');
      await loadLibrary(currentCourseId);
    } catch (err) {
      $('courseLibraryMsg').textContent = err.message || 'Rename failed.';
    }
  });

  $('courseLibraryRenameCancel')?.addEventListener('click', () => {
    $('courseLibraryRenamePanel')?.classList.add('hidden');
  });

  $('courseLibraryMaterialForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentCourseId) return;
    const title = String($('courseLibraryMatTitle')?.value || '').trim();
    const description = String($('courseLibraryMatDesc')?.value || '').trim();
    const chapterSel = String($('courseLibraryMatChapter')?.value || '').trim();
    const editId = String($('courseLibraryMatEditId')?.value || '').trim();
    const fileInput = $('courseLibraryMatFile');
    const file = fileInput && fileInput.files && fileInput.files[0];

    let pendingStorageKey = null;
    if (file) {
      try {
        const up = await uploadCourseMaterialFile(currentCourseId, file);
        $('courseLibraryMatUrl').value = up.publicUrl;
        pendingStorageKey = up.path;
      } catch (err) {
        $('courseLibraryMsg').textContent = err.message || 'Upload failed.';
        return;
      }
    }

    const finalUrl = String($('courseLibraryMatUrl')?.value || '').trim();
    if (!title || !finalUrl) {
      $('courseLibraryMsg').textContent = 'Title and URL are required (add a link or upload a file).';
      return;
    }

    try {
      if (editId) {
        await jsonFetch(`${API}?resource=materials&id=${encodeURIComponent(editId)}`, {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            title,
            url: finalUrl,
            description: description || null,
            chapter_id: chapterSel || null,
            ...(pendingStorageKey ? { storage_object_key: pendingStorageKey } : {}),
          }),
        });
      } else {
        await jsonFetch(`${API}?resource=materials`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            course_id: currentCourseId,
            chapter_id: chapterSel || null,
            title,
            url: finalUrl,
            description: description || null,
            storage_object_key: pendingStorageKey || null,
          }),
        });
      }
      if (fileInput) fileInput.value = '';
      clearMaterialForm();
      await loadLibrary(currentCourseId);
      $('courseLibraryMsg').textContent = '';
    } catch (err) {
      $('courseLibraryMsg').textContent = err.message || 'Save failed.';
    }
  });

  $('courseLibraryMatCancelEdit')?.addEventListener('click', () => clearMaterialForm());

  document.addEventListener('sbs:open-course-library', (e) => {
    const cid = e.detail && e.detail.courseId ? String(e.detail.courseId).trim() : '';
    document.dispatchEvent(new CustomEvent('sbs:goto-view', { detail: { viewId: 'training-course-library' } }));
    void (async () => {
      await loadCourseLibrary();
      if (cid) {
        const sel = $('courseLibrarySelect');
        if (sel) {
          sel.value = cid;
          await loadLibrary(cid);
        }
      }
    })();
  });
}
