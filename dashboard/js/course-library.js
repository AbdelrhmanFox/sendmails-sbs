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
let selectedChapterId = '__uncategorized__';

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

function extractExtension(value) {
  const txt = String(value || '').toLowerCase().split(/[?#]/)[0];
  const m = txt.match(/\.([a-z0-9]{2,8})$/i);
  return m ? m[1] : '';
}

function detectFileKind(url, title) {
  const ext = extractExtension(url) || extractExtension(title);
  if (ext === 'pdf') return { icon: '📄', label: 'PDF' };
  if (['ppt', 'pptx'].includes(ext)) return { icon: '📊', label: 'PPT' };
  if (['doc', 'docx'].includes(ext)) return { icon: '📝', label: 'DOC' };
  if (['xls', 'xlsx', 'csv'].includes(ext)) return { icon: '📈', label: 'XLS' };
  if (['mp4', 'webm', 'mov', 'mkv', 'avi', 'm4v'].includes(ext)) return { icon: '🎬', label: 'VIDEO' };
  if (['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac'].includes(ext)) return { icon: '🎵', label: 'AUDIO' };
  return { icon: '📎', label: 'FILE' };
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
  const panel = $('courseLibraryMatFormPanel');
  if (panel) panel.removeAttribute('open');
  const tog = $('courseLibraryMatFormToggle');
  if (tog) tog.textContent = '+ Add resource link';
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
  const panel = $('courseLibraryMatFormPanel');
  if (panel) panel.setAttribute('open', '');
  const tog = $('courseLibraryMatFormToggle');
  if (tog) tog.textContent = 'Editing resource link';
  setTimeout(() => $('courseLibraryMatTitle')?.focus(), 50);
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

function renderMaterialRows(materials) {
  if (!materials || !materials.length) {
    return '<div class="empty-state" style="padding:24px 0"><p class="empty-state__title">No links yet</p><p class="empty-state__hint">Use the form below to add a resource link.</p></div>';
  }
  return `<ul class="course-library-mat-list">${materials
    .map((m) => {
      const fileKind = detectFileKind(m.url, m.title);
      const desc = m.description ? `<p class="muted" style="font-size:12px;margin:2px 0 0">${escapeHtml(m.description)}</p>` : '';
      return `<li class="course-library-mat-row">
        <div class="course-library-mat-main">
          <a href="${escapeHtml(m.url)}" target="_blank" rel="noopener noreferrer" class="course-library-link">${escapeHtml(fileKind.icon)} ${escapeHtml(m.title)}</a>
          <p class="muted" style="font-size:12px;margin:2px 0 0">${escapeHtml(fileKind.label)}</p>
          ${desc}
        </div>
        <div class="course-library-mat-actions">
          <button type="button" class="btn btn-ghost btn-sm course-lib-edit-mat" data-id="${escapeHtml(m.id)}">Edit</button>
          <button type="button" class="btn btn-ghost btn-sm course-lib-del-mat" data-id="${escapeHtml(m.id)}">Remove</button>
        </div>
      </li>`;
    })
    .join('')}</ul>`;
}

function renderChapterNav(data) {
  const nav = $('courseLibraryChapterNav');
  if (!nav) return;
  const chapters = data.chapters || [];
  const items = [
    `<button type="button" class="cl-chapter-btn ${selectedChapterId === '__uncategorized__' ? 'active' : ''}" data-cid="__uncategorized__">Uncategorized <span class="badge badge--muted" style="margin-left:4px">${(data.uncategorized || []).length}</span></button>`,
    ...chapters.map((ch) => {
      const count = (ch.materials || []).length;
      const active = selectedChapterId === ch.id;
      return `<button type="button" class="cl-chapter-btn ${active ? 'active' : ''}" data-cid="${escapeHtml(ch.id)}" data-title="${escapeHtml(ch.title)}">
        <span class="cl-chapter-btn-label">${escapeHtml(ch.title)}</span>
        <span class="badge badge--muted" style="margin-left:4px">${count}</span>
      </button>`;
    }),
  ];
  nav.innerHTML = items.join('');

  nav.querySelectorAll('.cl-chapter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cid = btn.getAttribute('data-cid');
      selectedChapterId = cid;
      nav.querySelectorAll('.cl-chapter-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      renderTree(librarySnapshot || { chapters: [], uncategorized: [] });
    });
  });

  // Rename / delete buttons on chapter items (show on hover via CSS — we place them in the nav)
  nav.querySelectorAll('.cl-chapter-btn[data-cid]:not([data-cid="__uncategorized__"])').forEach((btn) => {
    btn.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const id = btn.getAttribute('data-cid');
      const title = btn.getAttribute('data-title') || '';
      $('courseLibraryRenameChapterId').value = id || '';
      $('courseLibraryRenameChapterTitle').value = title;
      $('courseLibraryRenamePanel')?.classList.remove('hidden');
      $('courseLibraryRenameChapterTitle')?.focus();
    });
  });
}

function renderTree(data) {
  // Render chapter sidebar
  renderChapterNav(data);

  const host = $('courseLibraryTree');
  if (!host) return;

  // Determine materials to show based on selectedChapterId
  let materialsToShow = [];
  let chapterTitle = 'Uncategorized';
  let chapterIdForActions = null;

  if (selectedChapterId === '__uncategorized__') {
    materialsToShow = data.uncategorized || [];
    chapterTitle = 'Uncategorized';
    chapterIdForActions = null;
  } else {
    const ch = (data.chapters || []).find((c) => c.id === selectedChapterId);
    if (ch) {
      materialsToShow = ch.materials || [];
      chapterTitle = ch.title;
      chapterIdForActions = ch.id;
    } else {
      materialsToShow = data.uncategorized || [];
      chapterTitle = 'Uncategorized';
      chapterIdForActions = null;
    }
  }

  const chapterActionsHtml = chapterIdForActions
    ? `<div class="cl-main-header-actions">
        <button type="button" class="btn btn-ghost btn-sm course-lib-rename-ch" data-id="${escapeHtml(chapterIdForActions)}" data-title="${escapeHtml(chapterTitle)}">Rename</button>
        <button type="button" class="btn btn-ghost btn-sm btn-danger course-lib-del-ch" data-id="${escapeHtml(chapterIdForActions)}">Remove chapter</button>
      </div>`
    : '';

  host.innerHTML = `<div class="cl-main-header">
    <h4 class="cl-main-title">${escapeHtml(chapterTitle)}</h4>
    ${chapterActionsHtml}
  </div>
  ${renderMaterialRows(materialsToShow)}`;

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
      if (!id || !confirm('Remove this chapter? Its links become uncategorized.')) return;
      try {
        await jsonFetch(`${API}?resource=chapters&id=${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        });
        if (selectedChapterId === id) selectedChapterId = '__uncategorized__';
        await loadLibrary(currentCourseId);
      } catch (e) {
        alert(e.message);
      }
    });
  });

  // Auto-select the chapter in material form chapter select
  const chSel = $('courseLibraryMatChapter');
  if (chSel && selectedChapterId !== '__uncategorized__' && !$('courseLibraryMatEditId')?.value) {
    chSel.value = selectedChapterId;
  }
}

export async function loadLibrary(courseId) {
  const cid = String(courseId || '').trim();
  const shell = $('courseLibraryShell');
  const msg = $('courseLibraryMsg');
  if (!cid) {
    currentCourseId = '';
    librarySnapshot = null;
    selectedChapterId = '__uncategorized__';
    if (shell) shell.classList.add('hidden');
    clearMaterialForm();
    return;
  }
  if (cid !== currentCourseId) selectedChapterId = '__uncategorized__';
  currentCourseId = cid;
  if (shell) shell.classList.remove('hidden');
  const tree = $('courseLibraryTree');
  if (tree) tree.innerHTML = '<div class="skeleton-row"></div><div class="skeleton-row"></div>';
  if (msg) msg.textContent = '';
  try {
    const data = await jsonFetch(`${API}?resource=library&course_id=${encodeURIComponent(cid)}`, {
      headers: getAuthHeaders(),
    });
    librarySnapshot = data;
    fillChapterSelect(data.chapters || [], 'Uncategorized');
    renderTree(data);
    clearMaterialForm();
  } catch (e) {
    librarySnapshot = null;
    if (tree) tree.innerHTML = '';
    if (msg) msg.textContent = e.message || 'Could not load library.';
  }
}

export async function loadCourseLibrary() {
  const sel = $('courseLibrarySelect');
  const msg = $('courseLibraryMsg');
  if (!sel) return;
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

    const currentEditItem = editId ? findMaterialById(editId) : null;
    const finalUrl = String($('courseLibraryMatUrl')?.value || '').trim() || String(currentEditItem?.url || '').trim();
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
