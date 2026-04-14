const { cors, json, getSupabaseServiceClient, getSupabaseApiUrl } = require('../lib/_shared');
const { verifyTraineeAuth } = require('../lib/trainee-auth');
const { assertTraineeAssignmentAccess } = require('../lib/trainee-portal');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors };
  if (!['GET', 'POST'].includes(event.httpMethod)) return json({ error: 'Method not allowed' }, 405);

  const auth = verifyTraineeAuth(event);
  if (!auth) return json({ error: 'Unauthorized' }, 401);

  const supabase = getSupabaseServiceClient();
  if (!supabase) return json({ error: 'Server config missing' }, 500);

  let body = {};
  if (event.httpMethod === 'POST') {
    try {
      body = JSON.parse(event.body || '{}');
    } catch (_) {
      return json({ error: 'Invalid JSON' }, 400);
    }
  }
  const assignmentId = String(event.httpMethod === 'GET' ? event.queryStringParameters?.assignment_id || '' : body.assignment_id || '').trim();
  if (!assignmentId) return json({ error: 'assignment_id is required' }, 400);

  const gate = await assertTraineeAssignmentAccess(supabase, String(auth.trainee_id || '').trim(), assignmentId);
  if (!gate.ok) return json({ error: gate.error }, gate.status);

  const traineeEmail = String(auth.email || '').trim().toLowerCase();
  if (event.httpMethod === 'GET') {
    const { data: row, error } = await supabase
      .from('classroom_assignment_submissions')
      .select('id, assignment_id, trainee_name, trainee_email, submission_text, file_url, file_storage_key, status, submitted_at, updated_at')
      .eq('assignment_id', assignmentId)
      .eq('trainee_email', traineeEmail)
      .maybeSingle();
    if (error) return json({ error: error.message || 'Could not load submission' }, 500);
    return json({ item: row || null });
  }

  const submissionText = body.submission_text != null ? String(body.submission_text) : null;
  const fileUrl = body.file_url != null ? String(body.file_url) : null;
  const fileStorageKey = body.file_storage_key != null ? String(body.file_storage_key) : null;
  if (!submissionText && !fileUrl) return json({ error: 'Provide submission_text or file_url' }, 400);

  if (fileUrl || fileStorageKey) {
    const base = getSupabaseApiUrl();
    const expectedPrefix = `${base}/storage/v1/object/public/classroom-submissions/`;
    const key = String(fileStorageKey || '').trim();
    const url = String(fileUrl || '').trim();
    if (!key || !url) return json({ error: 'file_url and file_storage_key must be provided together' }, 400);
    if (!url.startsWith(expectedPrefix)) return json({ error: 'Invalid file_url for classroom submissions' }, 400);
    if (!key.startsWith(`${assignmentId}/`)) return json({ error: 'Invalid file_storage_key for assignment' }, 400);
  }

  const { data: trainee } = await supabase.from('trainees').select('full_name').eq('trainee_id', auth.trainee_id).maybeSingle();
  const traineeName = String(trainee?.full_name || traineeEmail);
  const { data: existing } = await supabase
    .from('classroom_assignment_submissions')
    .select('id')
    .eq('assignment_id', assignmentId)
    .eq('trainee_email', traineeEmail)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from('classroom_assignment_submissions')
      .update({
        trainee_name: traineeName,
        submission_text: submissionText,
        file_url: fileUrl,
        file_storage_key: fileStorageKey,
        status: 'submitted',
        updated_at: new Date().toISOString(),
        submitted_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select('*')
      .single();
    if (error) return json({ error: error.message || 'Could not update submission' }, 500);
    await supabase.from('classroom_submission_reviews').delete().eq('submission_id', existing.id);
    return json({ ok: true, updated: true, item: data });
  }

  const row = {
    assignment_id: assignmentId,
    trainee_name: traineeName,
    trainee_email: traineeEmail,
    submission_text: submissionText,
    file_url: fileUrl,
    file_storage_key: fileStorageKey,
    status: 'submitted',
  };
  const { data, error } = await supabase.from('classroom_assignment_submissions').insert(row).select('*').single();
  if (error) return json({ error: error.message || 'Could not save submission' }, 500);
  return json({ ok: true, updated: false, item: data });
};
