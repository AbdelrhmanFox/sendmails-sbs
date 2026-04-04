const crypto = require('crypto');
const { cors, json, getSupabaseServiceClient, verifyAuth, getSupabaseApiUrl } = require('../lib/_shared');

const TRAINER_ROLES = ['admin', 'trainer'];

async function assertCourseAccess(supabase, auth, courseId) {
  const cid = String(courseId || '').trim();
  if (!cid) return { ok: false, status: 400, error: 'course_id required' };
  const { data: course, error } = await supabase.from('courses').select('course_id').eq('course_id', cid).maybeSingle();
  if (error) return { ok: false, status: 500, error: error.message || 'Course lookup failed' };
  if (!course) return { ok: false, status: 404, error: 'Course not found' };
  if (auth.role === 'admin') return { ok: true, course_id: cid };
  const uname = String(auth.username || '').trim();
  const { data: rows, error: be } = await supabase
    .from('batches')
    .select('batch_id')
    .eq('course_id', cid)
    .eq('trainer', uname)
    .limit(1);
  if (be) return { ok: false, status: 500, error: be.message || 'Access check failed' };
  if (rows && rows.length) return { ok: true, course_id: cid };
  return { ok: false, status: 403, error: 'Forbidden' };
}

function safeFilename(name) {
  const base = String(name || 'file').split(/[/\\]/).pop() || 'file';
  return base.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120) || 'file';
}

/**
 * POST { course_id, filename, contentType } → signed upload URL + public URL for course_materials.url
 */
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors };
  if (event.httpMethod !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const auth = verifyAuth(event);
  if (!auth) return json({ error: 'Unauthorized' }, 401);
  if (!TRAINER_ROLES.includes(auth.role)) return json({ error: 'Trainer or admin role required' }, 403);

  const supabase = getSupabaseServiceClient();
  if (!supabase) return json({ error: 'Server config missing' }, 500);

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (_) {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const courseId = String(body.course_id || '').trim();
  const gate = await assertCourseAccess(supabase, auth, courseId);
  if (!gate.ok) return json({ error: gate.error }, gate.status);

  const filename = safeFilename(body.filename);
  const contentType = String(body.contentType || 'application/octet-stream').slice(0, 200);
  const objectPath = `${courseId}/${crypto.randomUUID()}_${filename}`;

  const { data, error } = await supabase.storage.from('course-materials').createSignedUploadUrl(objectPath);
  if (error) return json({ error: error.message || 'Could not create upload URL' }, 500);
  if (!data || !data.signedUrl) return json({ error: 'Upload URL missing' }, 500);

  const base = getSupabaseApiUrl();
  if (!base) return json({ error: 'Server config missing' }, 500);
  const pathKey = data.path || objectPath;
  const publicUrl = `${base}/storage/v1/object/public/course-materials/${pathKey}`;

  return json({
    signedUrl: data.signedUrl,
    path: pathKey,
    token: data.token || null,
    publicUrl,
    contentType,
  });
};
