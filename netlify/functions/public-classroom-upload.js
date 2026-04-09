const crypto = require('crypto');
const { cors, json, getSupabaseServiceClient, getSupabaseApiUrl } = require('../lib/_shared');
const { validateClassroomUpload } = require('../lib/classroom-upload-allowlist');
const { safeFilename, uploadResponse } = require('../lib/upload-shared');

async function resolveAssignmentByToken(supabase, token, assignmentId) {
  const tok = String(token || '').trim();
  const aid = String(assignmentId || '').trim();
  if (!tok) return { ok: false, status: 400, error: 'token is required' };
  if (!aid) return { ok: false, status: 400, error: 'assignment_id is required' };

  const { data: link, error: le } = await supabase.from('classroom_public_links').select('batch_id').eq('token', tok).maybeSingle();
  if (le) return { ok: false, status: 500, error: 'Could not validate link' };
  if (!link) return { ok: false, status: 404, error: 'Invalid link' };

  const { data: asg, error: ae } = await supabase
    .from('classroom_assignments')
    .select('id, batch_id')
    .eq('id', aid)
    .maybeSingle();
  if (ae || !asg) return { ok: false, status: 404, error: 'Assignment not found' };
  if (asg.batch_id !== link.batch_id) return { ok: false, status: 403, error: 'Assignment does not belong to this classroom' };

  return { ok: true, assignment: asg };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors };
  if (event.httpMethod !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabase = getSupabaseServiceClient();
  if (!supabase) return json({ error: 'Server config missing' }, 500);

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (_) {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const gate = await resolveAssignmentByToken(supabase, body.token, body.assignment_id);
  if (!gate.ok) return json({ error: gate.error }, gate.status);

  const filename = safeFilename(body.filename, 140);
  const typeCheck = validateClassroomUpload(filename, body.contentType);
  if (!typeCheck.ok) return json({ error: typeCheck.error }, 400);

  const objectPath = `${gate.assignment.id}/${crypto.randomUUID()}_${filename}`;

  const { data, error } = await supabase.storage.from('classroom-submissions').createSignedUploadUrl(objectPath);
  if (error) return json({ error: error.message || 'Could not create upload URL' }, 500);
  if (!data || !data.signedUrl) return json({ error: 'Upload URL missing' }, 500);

  const base = getSupabaseApiUrl();
  if (!base) return json({ error: 'Server config missing' }, 500);
  return json(uploadResponse(data, objectPath, base, 'classroom-submissions'));
};
