const crypto = require('crypto');
const { cors, json, getSupabaseServiceClient, getSupabaseApiUrl, verifyAuth } = require('../lib/_shared');
const { validateClassroomUpload } = require('../lib/classroom-upload-allowlist');

const TRAINER_ROLES = ['admin', 'trainer'];

async function assertBatchAccess(supabase, auth, batchId) {
  const bid = String(batchId || '').trim();
  if (!bid) return { ok: false, status: 400, error: 'batch_id required' };
  const { data: b, error } = await supabase.from('batches').select('batch_id, trainer, course_id').eq('batch_id', bid).maybeSingle();
  if (error) return { ok: false, status: 500, error: error.message || 'Batch lookup failed' };
  if (!b) return { ok: false, status: 404, error: 'Batch not found' };
  if (auth.role === 'admin') return { ok: true, batch: b };
  const uname = String(auth.username || '').trim();
  if (String(b.trainer || '').trim() === uname) return { ok: true, batch: b };
  if (b.course_id) {
    const { data: mapRows, error: me } = await supabase
      .from('trainer_course_access')
      .select('id')
      .eq('trainer_username', uname)
      .eq('course_id', b.course_id)
      .limit(1);
    if (me) return { ok: false, status: 500, error: me.message || 'Access check failed' };
    if (mapRows && mapRows.length) return { ok: true, batch: b };
  }
  return { ok: false, status: 403, error: 'Forbidden' };
}

function safeFilename(name) {
  const base = String(name || 'file').split(/[/\\]/).pop() || 'file';
  return base.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 140) || 'file';
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors };
  if (event.httpMethod !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let auth = verifyAuth(event);
  if (!auth) return json({ error: 'Unauthorized' }, 401);
  auth = { ...auth, role: String(auth.role || '').trim().toLowerCase() };
  if (!TRAINER_ROLES.includes(auth.role)) return json({ error: 'Trainer or admin role required' }, 403);

  const supabase = getSupabaseServiceClient();
  if (!supabase) return json({ error: 'Server config missing' }, 500);

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (_) {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const batchId = String(body.batch_id || '').trim();
  const gate = await assertBatchAccess(supabase, auth, batchId);
  if (!gate.ok) return json({ error: gate.error }, gate.status);

  const filename = safeFilename(body.filename);
  const typeCheck = validateClassroomUpload(filename, body.contentType);
  if (!typeCheck.ok) return json({ error: typeCheck.error }, 400);

  const objectPath = `${gate.batch.batch_id}/${crypto.randomUUID()}_${filename}`;
  const { data, error } = await supabase.storage.from('classroom-material-files').createSignedUploadUrl(objectPath);
  if (error) return json({ error: error.message || 'Could not create upload URL' }, 500);
  if (!data || !data.signedUrl) return json({ error: 'Upload URL missing' }, 500);

  const base = getSupabaseApiUrl();
  if (!base) return json({ error: 'Server config missing' }, 500);
  const pathKey = data.path || objectPath;
  const publicUrl = `${base}/storage/v1/object/public/classroom-material-files/${pathKey}`;
  return json({ signedUrl: data.signedUrl, token: data.token || null, path: pathKey, publicUrl });
};
