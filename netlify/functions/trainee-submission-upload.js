const crypto = require('crypto');
const { cors, json, getSupabaseServiceClient, getSupabaseApiUrl } = require('../lib/_shared');
const { verifyTraineeAuth } = require('../lib/trainee-auth');
const { validateClassroomUpload } = require('../lib/classroom-upload-allowlist');
const { safeFilename, uploadResponse } = require('../lib/upload-shared');
const { assertTraineeAssignmentAccess } = require('../lib/trainee-portal');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors };
  if (event.httpMethod !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const auth = verifyTraineeAuth(event);
  if (!auth) return json({ error: 'Unauthorized' }, 401);

  let body = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch (_) {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const assignmentId = String(body.assignment_id || '').trim();
  const filename = safeFilename(body.filename, 140);
  const typeCheck = validateClassroomUpload(filename, body.contentType);
  if (!typeCheck.ok) return json({ error: typeCheck.error }, 400);

  const supabase = getSupabaseServiceClient();
  if (!supabase) return json({ error: 'Server config missing' }, 500);
  const gate = await assertTraineeAssignmentAccess(supabase, String(auth.trainee_id || '').trim(), assignmentId);
  if (!gate.ok) return json({ error: gate.error }, gate.status);

  const objectPath = `${assignmentId}/${crypto.randomUUID()}_${filename}`;
  const { data, error } = await supabase.storage.from('classroom-submissions').createSignedUploadUrl(objectPath);
  if (error) return json({ error: error.message || 'Could not create upload URL' }, 500);
  if (!data || !data.signedUrl) return json({ error: 'Upload URL missing' }, 500);

  const base = getSupabaseApiUrl();
  if (!base) return json({ error: 'Server config missing' }, 500);
  return json(uploadResponse(data, objectPath, base, 'classroom-submissions'));
};
