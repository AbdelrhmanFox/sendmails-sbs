const { cors, json, getSupabaseServiceClient, verifyAuth } = require('../lib/_shared');

function canRead(role) {
  return ['admin', 'staff', 'trainer'].includes(String(role || '').trim().toLowerCase());
}

function canWrite(role) {
  return ['admin', 'staff'].includes(String(role || '').trim().toLowerCase());
}

function bodyJson(event) {
  try {
    return JSON.parse(event.body || '{}');
  } catch (_) {
    return null;
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors };
  if (!['GET', 'POST'].includes(event.httpMethod)) return json({ error: 'Method not allowed' }, 405);

  const auth = verifyAuth(event);
  if (!auth) return json({ error: 'Unauthorized' }, 401);
  const role = String(auth.role || '').trim().toLowerCase();
  if (!canRead(role)) return json({ error: 'Forbidden' }, 403);

  const supabase = getSupabaseServiceClient();
  if (!supabase) return json({ error: 'Server config missing' }, 500);

  const resource = String(event.queryStringParameters?.resource || '').trim().toLowerCase();

  if (resource === 'programs') {
    if (event.httpMethod === 'GET') {
      const { data, error } = await supabase.from('programs').select('*').order('created_at', { ascending: false }).limit(300);
      if (error) return json({ error: error.message || 'Could not load programs' }, 500);
      return json({ items: data || [] });
    }
    if (!canWrite(role)) return json({ error: 'Forbidden' }, 403);
    const body = bodyJson(event);
    if (!body) return json({ error: 'Invalid JSON' }, 400);
    const code = String(body.program_code || '').trim();
    const name = String(body.program_name || '').trim();
    if (!code || !name) return json({ error: 'program_code and program_name required' }, 400);
    const row = {
      program_code: code,
      program_name: name,
      description: body.description != null ? String(body.description) : null,
      status: String(body.status || 'active').trim(),
    };
    const { data, error } = await supabase.from('programs').insert(row).select('*').single();
    if (error) return json({ error: error.message || 'Could not create program' }, 500);
    return json({ ok: true, item: data });
  }

  if (resource === 'cohorts') {
    if (event.httpMethod === 'GET') {
      const programId = String(event.queryStringParameters?.program_id || '').trim();
      let q = supabase.from('cohorts').select('*').order('created_at', { ascending: false }).limit(300);
      if (programId) q = q.eq('program_id', programId);
      const { data, error } = await q;
      if (error) return json({ error: error.message || 'Could not load cohorts' }, 500);
      return json({ items: data || [] });
    }
    if (!canWrite(role)) return json({ error: 'Forbidden' }, 403);
    const body = bodyJson(event);
    if (!body) return json({ error: 'Invalid JSON' }, 400);
    const code = String(body.cohort_code || '').trim();
    const name = String(body.cohort_name || '').trim();
    if (!code || !name) return json({ error: 'cohort_code and cohort_name required' }, 400);
    const row = {
      cohort_code: code,
      cohort_name: name,
      program_id: body.program_id ? String(body.program_id).trim() : null,
      start_date: body.start_date || null,
      end_date: body.end_date || null,
      status: String(body.status || 'planned').trim(),
    };
    const { data, error } = await supabase.from('cohorts').insert(row).select('*').single();
    if (error) return json({ error: error.message || 'Could not create cohort' }, 500);
    return json({ ok: true, item: data });
  }

  if (resource === 'cohort-enrollments') {
    if (event.httpMethod === 'GET') {
      const cohortId = String(event.queryStringParameters?.cohort_id || '').trim();
      if (!cohortId) return json({ error: 'cohort_id required' }, 400);
      const { data, error } = await supabase
        .from('cohort_enrollments')
        .select('*')
        .eq('cohort_id', cohortId)
        .order('joined_at', { ascending: false })
        .limit(500);
      if (error) return json({ error: error.message || 'Could not load cohort enrollments' }, 500);
      return json({ items: data || [] });
    }
    if (!canWrite(role)) return json({ error: 'Forbidden' }, 403);
    const body = bodyJson(event);
    if (!body) return json({ error: 'Invalid JSON' }, 400);
    const cohortId = String(body.cohort_id || '').trim();
    const traineeId = String(body.trainee_id || '').trim();
    if (!cohortId || !traineeId) return json({ error: 'cohort_id and trainee_id required' }, 400);
    const row = {
      cohort_id: cohortId,
      trainee_id: traineeId,
      enrollment_state: String(body.enrollment_state || 'active').trim(),
    };
    const { data, error } = await supabase
      .from('cohort_enrollments')
      .upsert(row, { onConflict: 'cohort_id,trainee_id' })
      .select('*')
      .single();
    if (error) return json({ error: error.message || 'Could not save cohort enrollment' }, 500);
    return json({ ok: true, item: data });
  }

  if (resource === 'rubric-templates') {
    if (event.httpMethod === 'GET') {
      const { data, error } = await supabase.from('rubric_templates').select('*').order('created_at', { ascending: false }).limit(300);
      if (error) return json({ error: error.message || 'Could not load rubric templates' }, 500);
      return json({ items: data || [] });
    }
    if (!canWrite(role)) return json({ error: 'Forbidden' }, 403);
    const body = bodyJson(event);
    if (!body) return json({ error: 'Invalid JSON' }, 400);
    const name = String(body.name || '').trim();
    if (!name) return json({ error: 'name required' }, 400);
    const row = {
      name,
      description: body.description != null ? String(body.description) : null,
      created_by: String(auth.username || '').trim() || null,
    };
    const { data, error } = await supabase.from('rubric_templates').insert(row).select('*').single();
    if (error) return json({ error: error.message || 'Could not create rubric template' }, 500);
    return json({ ok: true, item: data });
  }

  if (resource === 'rubric-criteria') {
    if (event.httpMethod === 'GET') {
      const rubricId = String(event.queryStringParameters?.rubric_id || '').trim();
      if (!rubricId) return json({ error: 'rubric_id required' }, 400);
      const { data, error } = await supabase
        .from('rubric_criteria')
        .select('*')
        .eq('rubric_id', rubricId)
        .order('sort_order', { ascending: true });
      if (error) return json({ error: error.message || 'Could not load rubric criteria' }, 500);
      return json({ items: data || [] });
    }
    if (!canWrite(role)) return json({ error: 'Forbidden' }, 403);
    const body = bodyJson(event);
    if (!body) return json({ error: 'Invalid JSON' }, 400);
    const rubricId = String(body.rubric_id || '').trim();
    const criterion = String(body.criterion || '').trim();
    if (!rubricId || !criterion) return json({ error: 'rubric_id and criterion required' }, 400);
    const row = {
      rubric_id: rubricId,
      criterion,
      max_points: body.max_points != null && body.max_points !== '' ? Number(body.max_points) : 1,
      weight: body.weight != null && body.weight !== '' ? Number(body.weight) : 1,
      sort_order: body.sort_order != null && body.sort_order !== '' ? Number(body.sort_order) : 0,
    };
    const { data, error } = await supabase.from('rubric_criteria').insert(row).select('*').single();
    if (error) return json({ error: error.message || 'Could not create rubric criterion' }, 500);
    return json({ ok: true, item: data });
  }

  if (resource === 'certificates') {
    if (event.httpMethod === 'GET') {
      const traineeId = String(event.queryStringParameters?.trainee_id || '').trim();
      let q = supabase.from('certificates').select('*').order('issued_at', { ascending: false }).limit(500);
      if (traineeId) q = q.eq('trainee_id', traineeId);
      const { data, error } = await q;
      if (error) return json({ error: error.message || 'Could not load certificates' }, 500);
      return json({ items: data || [] });
    }
    if (!canWrite(role)) return json({ error: 'Forbidden' }, 403);
    const body = bodyJson(event);
    if (!body) return json({ error: 'Invalid JSON' }, 400);
    const traineeId = String(body.trainee_id || '').trim();
    const courseId = String(body.course_id || '').trim();
    const certNo = String(body.certificate_no || '').trim();
    if (!traineeId || !courseId || !certNo) return json({ error: 'trainee_id, course_id, and certificate_no required' }, 400);
    const row = {
      trainee_id: traineeId,
      course_id: courseId,
      batch_id: body.batch_id ? String(body.batch_id).trim() : null,
      certificate_no: certNo,
      expires_at: body.expires_at || null,
      status: String(body.status || 'active').trim(),
      issued_by: String(auth.username || '').trim() || null,
      metadata: body.metadata != null ? body.metadata : null,
    };
    const { data, error } = await supabase.from('certificates').insert(row).select('*').single();
    if (error) return json({ error: error.message || 'Could not issue certificate' }, 500);
    return json({ ok: true, item: data });
  }

  if (resource === 'transcripts') {
    if (event.httpMethod === 'GET') {
      const traineeId = String(event.queryStringParameters?.trainee_id || '').trim();
      let q = supabase.from('transcript_entries').select('*').order('created_at', { ascending: false }).limit(500);
      if (traineeId) q = q.eq('trainee_id', traineeId);
      const { data, error } = await q;
      if (error) return json({ error: error.message || 'Could not load transcripts' }, 500);
      return json({ items: data || [] });
    }
    if (!canWrite(role)) return json({ error: 'Forbidden' }, 403);
    const body = bodyJson(event);
    if (!body) return json({ error: 'Invalid JSON' }, 400);
    const traineeId = String(body.trainee_id || '').trim();
    const courseId = String(body.course_id || '').trim();
    if (!traineeId || !courseId) return json({ error: 'trainee_id and course_id required' }, 400);
    const row = {
      trainee_id: traineeId,
      course_id: courseId,
      batch_id: body.batch_id ? String(body.batch_id).trim() : null,
      completion_status: String(body.completion_status || 'in_progress').trim(),
      final_score: body.final_score != null && body.final_score !== '' ? Number(body.final_score) : null,
      completed_at: body.completed_at || null,
      certificate_id: body.certificate_id ? String(body.certificate_id).trim() : null,
    };
    const { data, error } = await supabase.from('transcript_entries').insert(row).select('*').single();
    if (error) return json({ error: error.message || 'Could not create transcript entry' }, 500);
    return json({ ok: true, item: data });
  }

  return json({ error: 'Unknown resource' }, 400);
};
