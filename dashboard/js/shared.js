export const AUTH_TOKEN = 'sbs_token';
export const AUTH_ROLE = 'sbs_role';
export const AUTH_USER = 'sbs_username';
export const DEMO_WHATSAPP_SUPPORT_NUMBER = 'sbs_demo_whatsapp_support_number';

export const authToken = localStorage.getItem(AUTH_TOKEN);
export const authRole = localStorage.getItem(AUTH_ROLE);
export const authUsername = localStorage.getItem(AUTH_USER);

export function getAuthHeaders() {
  const tok = localStorage.getItem(AUTH_TOKEN);
  return tok ? { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

export async function jsonFetch(url, options = {}) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const parts = [data.error, data.hint, data.details].filter(Boolean);
    const msg = parts.length ? parts.join(' — ') : `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

export const ROLE_AREAS = {
  admin: ['operations', 'training', 'finance', 'automation', 'admin'],
  staff: ['operations', 'automation'],
  trainer: ['training'],
  trainee: ['training'],
  user: ['automation'],
  accountant: ['finance'],
};

export function areasForRole(role) {
  return ROLE_AREAS[role] || ROLE_AREAS.user;
}

export function normalizePhone(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const leadPlus = raw.startsWith('+');
  const digits = raw.replace(/\D+/g, '');
  return (leadPlus ? '+' : '') + digits;
}

export function showToast(message, tone = 'info') {
  const txt = String(message || '').trim();
  if (!txt) return;
  let host = document.getElementById('appToastHost');
  if (!host) {
    host = document.createElement('div');
    host.id = 'appToastHost';
    host.style.position = 'fixed';
    host.style.right = '16px';
    host.style.bottom = '16px';
    host.style.display = 'flex';
    host.style.flexDirection = 'column';
    host.style.gap = '8px';
    host.style.zIndex = '9999';
    document.body.appendChild(host);
  }
  const item = document.createElement('div');
  item.textContent = txt;
  item.style.padding = '10px 12px';
  item.style.borderRadius = '10px';
  item.style.color = '#fff';
  item.style.fontSize = '13px';
  item.style.maxWidth = '320px';
  item.style.boxShadow = '0 8px 20px rgba(0,0,0,0.24)';
  item.style.background =
    tone === 'error' ? '#b42318' : tone === 'success' ? '#067647' : tone === 'warn' ? '#b54708' : '#155eef';
  host.appendChild(item);
  setTimeout(() => {
    item.style.opacity = '0';
    item.style.transition = 'opacity .25s ease';
    setTimeout(() => item.remove(), 260);
  }, 2800);
}

export const RESOURCE_UPLOAD_MAX_MB = 100;
export const RESOURCE_UPLOAD_ACCEPT =
  '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,' +
  '.mp4,.webm,.mov,.mkv,.avi,.m4v,.mp3,.wav,.m4a,.aac,.ogg,.flac';

export const ENTERPRISE_TERMS = {
  trainee: 'Trainee',
  course: 'Course',
  batch: 'Batch',
  enrollment: 'Enrollment',
  material: 'Material',
  session: 'Session',
};

export const COPY = {
  actions: {
    create: 'Create',
    update: 'Update',
    remove: 'Remove',
    view: 'View',
    assign: 'Assign',
    saveChanges: 'Save changes',
  },
  status: {
    active: 'Active',
    archived: 'Archived',
    pending: 'Pending',
    completed: 'Completed',
    failed: 'Failed',
  },
  common: {
    actionFailed: 'Could not complete the action.',
    changesSaved: 'Changes saved successfully.',
    loading: 'Loading...',
  },
};

export function requiredFieldMessage(fieldLabel) {
  return `${String(fieldLabel || 'Field').trim() || 'Field'} is required.`;
}

export function createdMessage(entityLabel) {
  const entity = String(entityLabel || 'Record').trim() || 'Record';
  return `${entity} created successfully.`;
}

export function removedMessage(entityLabel) {
  const entity = String(entityLabel || 'Record').trim() || 'Record';
  return `${entity} removed successfully.`;
}

export function couldNotMessage(actionLabel) {
  const action = String(actionLabel || 'complete this action').trim() || 'complete this action';
  return `Could not ${action}.`;
}

export function extractFileExtension(value) {
  const txt = String(value || '').toLowerCase().split(/[?#]/)[0];
  const m = txt.match(/\.([a-z0-9]{2,8})$/i);
  return m ? m[1] : '';
}

export function detectFileKind(url, title, mimeType) {
  const ext = extractFileExtension(url) || extractFileExtension(title);
  const mime = String(mimeType || '').toLowerCase();
  if (ext === 'pdf' || mime.includes('pdf')) return { icon: 'PDF', iconKey: 'pdf', label: 'PDF' };
  if (['ppt', 'pptx'].includes(ext) || mime.includes('presentation')) return { icon: 'PPT', iconKey: 'ppt', label: 'PPT' };
  if (['doc', 'docx'].includes(ext) || mime.includes('word')) return { icon: 'DOC', iconKey: 'doc', label: 'DOC' };
  if (['xls', 'xlsx', 'csv'].includes(ext) || mime.includes('sheet')) return { icon: 'XLS', iconKey: 'xls', label: 'XLS' };
  if (['mp4', 'webm', 'mov', 'mkv', 'avi', 'm4v'].includes(ext) || mime.includes('video')) return { icon: 'VID', iconKey: 'video', label: 'VIDEO' };
  if (['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac'].includes(ext) || mime.includes('audio')) return { icon: 'AUD', iconKey: 'audio', label: 'AUDIO' };
  return { icon: 'FILE', iconKey: 'file', label: 'FILE' };
}

export function renderFileTypeIcon(iconKey, label) {
  const key = String(iconKey || 'file').toLowerCase();
  const txt = String(label || 'FILE').slice(0, 4).toUpperCase();
  const tone =
    key === 'pdf'
      ? '#d92d20'
      : key === 'ppt'
        ? '#c2410c'
        : key === 'doc'
          ? '#155eef'
          : key === 'xls'
            ? '#067647'
            : key === 'video'
              ? '#7a5af8'
              : key === 'audio'
                ? '#0e9384'
                : '#667085';
  return `<span class="file-kind-icon" aria-hidden="true" style="display:inline-flex;align-items:center;justify-content:center;min-width:30px;height:18px;padding:0 6px;border-radius:6px;background:${tone};color:#fff;font-size:10px;font-weight:700;letter-spacing:.2px;line-height:1">${txt}</span>`;
}

export function isDownloadResource(url, storageObjectKey = null) {
  if (String(storageObjectKey || '').trim()) return true;
  const u = String(url || '').toLowerCase();
  if (!u) return false;
  if (u.includes('/storage/v1/object/public/')) return true;
  return /\.(pdf|doc|docx|ppt|pptx|xls|xlsx|txt|mp4|webm|mov|mkv|avi|m4v|mp3|wav|m4a|aac|ogg|flac)(\?|#|$)/i.test(u);
}

export function initUploadDropzones(scope = document) {
  const root = scope && typeof scope.querySelectorAll === 'function' ? scope : document;
  const labels = root.querySelectorAll('.upload-dropzone__label');
  labels.forEach((label) => {
    const input = label.querySelector('input[type="file"]');
    if (!input || label.dataset.bound === '1') return;
    label.dataset.bound = '1';
    const status = root.querySelector(`[data-upload-status-for="${input.id}"]`);

    const updateStatus = () => {
      const files = input.files ? Array.from(input.files) : [];
      if (!status) return;
      if (!files.length) {
        status.textContent = input.multiple ? 'No files selected.' : 'No file selected.';
        return;
      }
      if (files.length === 1) {
        status.textContent = `Selected: ${files[0].name}`;
        return;
      }
      status.textContent = `${files.length} files selected.`;
    };

    input.addEventListener('change', updateStatus);

    ['dragenter', 'dragover'].forEach((evt) =>
      label.addEventListener(evt, (e) => {
        e.preventDefault();
        label.classList.add('is-dragover');
      }),
    );

    ['dragleave', 'dragend', 'drop'].forEach((evt) =>
      label.addEventListener(evt, (e) => {
        e.preventDefault();
        label.classList.remove('is-dragover');
      }),
    );

    label.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      if (!dt || !dt.files || !dt.files.length) return;
      const transfer = new DataTransfer();
      if (input.multiple) {
        Array.from(dt.files).forEach((f) => transfer.items.add(f));
      } else {
        transfer.items.add(dt.files[0]);
      }
      input.files = transfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    updateStatus();
  });
}
