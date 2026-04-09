function normalizeRole(role) {
  return String(role || '').trim().toLowerCase();
}

function ensureUploadRole(role, allowed = ['admin', 'trainer']) {
  const normalized = normalizeRole(role);
  return { ok: allowed.includes(normalized), role: normalized };
}

function safeFilename(name, maxLen = 140) {
  const base = String(name || 'file').split(/[/\\]/).pop() || 'file';
  return base.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, maxLen) || 'file';
}

function buildPublicObjectUrl(apiBase, bucket, pathKey) {
  return `${apiBase}/storage/v1/object/public/${bucket}/${pathKey}`;
}

function uploadResponse(data, objectPath, apiBase, bucket) {
  const pathKey = data.path || objectPath;
  return {
    signedUrl: data.signedUrl,
    token: data.token || null,
    path: pathKey,
    publicUrl: buildPublicObjectUrl(apiBase, bucket, pathKey),
  };
}

module.exports = {
  normalizeRole,
  ensureUploadRole,
  safeFilename,
  uploadResponse,
  buildPublicObjectUrl,
};
