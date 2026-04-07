/**
 * Allowed file types for classroom assignment attachments (trainer) and
 * trainee submission uploads. Enforced by extension; optional MIME hints.
 * Bucket limit is 100MB (see migrations).
 */
const ALLOWED_EXTENSIONS = new Set([
  'pdf',
  'doc',
  'docx',
  'ppt',
  'pptx',
  'xls',
  'xlsx',
  'txt',
  'mp4',
  'webm',
  'mov',
  'mkv',
  'avi',
  'm4v',
  'mp3',
  'wav',
  'm4a',
  'aac',
  'ogg',
  'flac',
]);

function extensionFromFilename(name) {
  const base = String(name || '').split(/[/\\]/).pop() || '';
  const i = base.lastIndexOf('.');
  if (i < 0 || i === base.length - 1) return '';
  return base.slice(i + 1).toLowerCase();
}

/** Accept header strings compatible with HTML file input `accept` (for docs). */
const ACCEPT_ATTR =
  '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,' +
  '.mp4,.webm,.mov,.mkv,.avi,.m4v,.mp3,.wav,.m4a,.aac,.ogg,.flac';

function validateClassroomUpload(filename, contentType) {
  const ext = extensionFromFilename(filename);
  if (!ext) {
    return { ok: false, error: 'File must have an extension (e.g. .pdf, .docx).' };
  }
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return {
      ok: false,
      error:
        'File type not allowed. Supported: PDF, Word, Excel, PowerPoint, text, common video (mp4, webm, mov, …), and audio (mp3, wav, m4a, …).',
    };
  }
  const ct = contentType != null ? String(contentType).trim().toLowerCase() : '';
  if (ct && ct !== 'application/octet-stream') {
    const ok =
      ct === 'application/pdf' ||
      ct.startsWith('video/') ||
      ct.startsWith('audio/') ||
      ct.startsWith('text/') ||
      ct.includes('wordprocessingml') ||
      ct.includes('spreadsheetml') ||
      ct.includes('presentationml') ||
      ct === 'application/msword' ||
      ct === 'application/vnd.ms-excel' ||
      ct === 'application/vnd.ms-powerpoint';
    if (!ok) {
      // Extension already allowed; some browsers mis-report MIME — allow if ext passed
    }
  }
  return { ok: true };
}

module.exports = {
  ALLOWED_EXTENSIONS,
  ACCEPT_ATTR,
  validateClassroomUpload,
  extensionFromFilename,
};
