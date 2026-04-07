const crypto = require('crypto');
const { cors, json, getSupabaseServiceClient, getSupabaseApiUrl, verifyAuth } = require('../lib/_shared');

const TRAINER_ROLES = ['admin', 'trainer'];

async function assertAssignmentAccess(supabase, auth, assignmentId) {
  const aid = String(assignmentId || '').trim();
  if (!aid) return { ok: false, status: 400, error: 'assignment_id required' };
  const { data: asg, error: ae } = await supabase.from('classroom_assignments').select('id, batch_id').eq('id', aid).maybeSingle();
  if (ae || !asg) return { ok: false, status: 404, error: 'Assignment not found' };
  if (auth.role === 'admin') return { ok: true, assignment: asg };
  const uname = String(auth.username || '').trim();
  const { data: batch, error: be } = await supabase.from('batches').select('trainer, course_id').eq('batch_id', asg.batch_id).maybeSingle();
  if (be || !batch) return { ok: false, status: 404, error: 'Batch not found' };
  if (String(batch.trainer || '').trim() === uname) return { ok: true, assignment: asg };
  if (batch.course_id) {
    const { data: rows, error: me } = await supabase
      .from('trainer_course_access')
      .select('id')
      .eq('trainer_username', uname)
      .eq('course_id', batch.course_id)
      .limit(1);
    if (me) return { ok: false, status: 500, error: me.message || 'Access check failed' };
    if (rows && rows.length) return { ok: true, assignment: asg };
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

  const gate = await assertAssignmentAccess(supabase, auth, body.assignment_id);
  if (!gate.ok) return json({ error: gate.error }, gate.status);

  const filename = safeFilename(body.filename);
  const objectPath = `${gate.assignment.id}/${crypto.randomUUID()}_${filename}`;
  const { data, error } = await supabase.storage.from('classroom-assignment-files').createSignedUploadUrl(objectPath);
  if (error) return json({ error: error.message || 'Could not create upload URL' }, 500);
  if (!data || !data.signedUrl) return json({ error: 'Upload URL missing' }, 500);

  const base = getSupabaseApiUrl();
  if (!base) return json({ error: 'Server config missing' }, 500);
  const pathKey = data.path || objectPath;
  const publicUrl = `${base}/storage/v1/object/public/classroom-assignment-files/${pathKey}`;
  return json({ signedUrl: data.signedUrl, token: data.token || null, path: pathKey, publicUrl });
};
