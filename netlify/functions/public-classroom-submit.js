const { cors, json, getSupabaseServiceClient, getSupabaseApiUrl } = require('../lib/_shared');

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

  const assignmentId = gate.assignment.id;
  const traineeName = String(body.trainee_name || '').trim();
  const traineeEmail = String(body.trainee_email || '').trim();
  const submissionText = body.submission_text != null ? String(body.submission_text) : null;
  const fileUrl = body.file_url != null ? String(body.file_url) : null;
  const fileStorageKey = body.file_storage_key != null ? String(body.file_storage_key) : null;

  if (!traineeName) return json({ error: 'trainee_name is required' }, 400);
  if (!submissionText && !fileUrl) return json({ error: 'Provide submission_text or file_url' }, 400);
  if (fileUrl || fileStorageKey) {
    const base = getSupabaseApiUrl();
    if (!base) return json({ error: 'Server config missing' }, 500);
    const expectedPrefix = `${base}/storage/v1/object/public/classroom-submissions/`;
    const key = String(fileStorageKey || '').trim();
    const url = String(fileUrl || '').trim();
    if (!key || !url) return json({ error: 'file_url and file_storage_key must be provided together' }, 400);
    if (!url.startsWith(expectedPrefix)) return json({ error: 'Invalid file_url for classroom submissions' }, 400);
    if (!key.startsWith(`${assignmentId}/`)) return json({ error: 'Invalid file_storage_key for assignment' }, 400);
    if (!url.endsWith(key)) return json({ error: 'file_url and file_storage_key mismatch' }, 400);
  }

  let existing = null;
  if (traineeEmail) {
    const { data } = await supabase
      .from('classroom_assignment_submissions')
      .select('*')
      .eq('assignment_id', assignmentId)
      .eq('trainee_email', traineeEmail)
      .maybeSingle();
    existing = data || null;
  }

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
    return json({ ok: true, item: data, updated: true });
  }

  const row = {
    assignment_id: assignmentId,
    trainee_name: traineeName,
    trainee_email: traineeEmail || null,
    submission_text: submissionText,
    file_url: fileUrl,
    file_storage_key: fileStorageKey,
    status: 'submitted',
  };
  const { data, error } = await supabase.from('classroom_assignment_submissions').insert(row).select('*').single();
  if (error) return json({ error: error.message || 'Could not save submission' }, 500);
  return json({ ok: true, item: data, updated: false });
};
