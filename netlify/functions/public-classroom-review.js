const { cors, json, getSupabaseServiceClient } = require('../lib/_shared');

async function resolveBatchByToken(supabase, token) {
  const tok = String(token || '').trim();
  if (!tok) return { ok: false, status: 400, error: 'token is required' };
  const { data: link, error: le } = await supabase.from('classroom_public_links').select('batch_id').eq('token', tok).maybeSingle();
  if (le) return { ok: false, status: 500, error: 'Could not validate link' };
  if (!link) return { ok: false, status: 404, error: 'Invalid link' };
  return { ok: true, batch_id: link.batch_id };
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

  const gate = await resolveBatchByToken(supabase, body.token);
  if (!gate.ok) return json({ error: gate.error }, gate.status);

  const email = String(body.email || '').trim().toLowerCase();
  if (!email) return json({ error: 'email is required' }, 400);

  const { data: assignments, error: ae } = await supabase.from('classroom_assignments').select('id, title').eq('batch_id', gate.batch_id);
  if (ae) return json({ error: ae.message || 'Could not load assignments' }, 500);
  const asgMap = {};
  (assignments || []).forEach((a) => {
    asgMap[a.id] = a.title || 'Assignment';
  });
  const assignmentIds = Object.keys(asgMap);
  if (!assignmentIds.length) return json({ items: [] });

  const { data: subs, error: se } = await supabase
    .from('classroom_assignment_submissions')
    .select('id, assignment_id, trainee_name, trainee_email, status, submitted_at, updated_at')
    .in('assignment_id', assignmentIds)
    .eq('trainee_email', email)
    .order('submitted_at', { ascending: false });
  if (se) return json({ error: se.message || 'Could not load submissions' }, 500);

  const subIds = (subs || []).map((s) => s.id);
  const reviewBySub = {};
  if (subIds.length) {
    const { data: revs, error: re } = await supabase
      .from('classroom_submission_reviews')
      .select('submission_id, grade, feedback, reviewed_at')
      .in('submission_id', subIds);
    if (re) return json({ error: re.message || 'Could not load reviews' }, 500);
    (revs || []).forEach((r) => {
      reviewBySub[r.submission_id] = r;
    });
  }

  const items = (subs || []).map((s) => ({
    submission_id: s.id,
    assignment_id: s.assignment_id,
    assignment_title: asgMap[s.assignment_id] || 'Assignment',
    trainee_name: s.trainee_name,
    status: s.status,
    submitted_at: s.submitted_at,
    updated_at: s.updated_at,
    review: reviewBySub[s.id] || null,
  }));

  return json({ items });
};
