const { cors, json, getSupabaseServiceClient, verifyAuth } = require('../lib/_shared');

function canRead(role) {
  return ['admin', 'staff', 'trainer'].includes(String(role || '').trim().toLowerCase());
}

function canWrite(role) {
  return ['admin', 'trainer'].includes(String(role || '').trim().toLowerCase());
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors };
  if (!['GET', 'POST', 'PATCH'].includes(event.httpMethod)) return json({ error: 'Method not allowed' }, 405);

  const auth = verifyAuth(event);
  if (!auth) return json({ error: 'Unauthorized' }, 401);
  const role = String(auth.role || '').trim().toLowerCase();
  if (!canRead(role)) return json({ error: 'Forbidden' }, 403);

  const supabase = getSupabaseServiceClient();
  if (!supabase) return json({ error: 'Server config missing' }, 500);

  const resource = String(event.queryStringParameters?.resource || 'assessments').trim().toLowerCase();

  if (resource === 'assessments') {
    if (event.httpMethod === 'GET') {
      const batchId = String(event.queryStringParameters?.batch_id || '').trim();
      const courseId = String(event.queryStringParameters?.course_id || '').trim();
      let q = supabase.from('assessments').select('*').order('created_at', { ascending: false }).limit(300);
      if (batchId) q = q.eq('batch_id', batchId);
      if (courseId) q = q.eq('course_id', courseId);
      const { data, error } = await q;
      if (error) return json({ error: error.message || 'Could not load assessments' }, 500);
      return json({ items: data || [] });
    }
    if (!canWrite(role)) return json({ error: 'Forbidden' }, 403);
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (_) {
      return json({ error: 'Invalid JSON' }, 400);
    }
    const title = String(body.title || '').trim();
    if (!title) return json({ error: 'title required' }, 400);
    const row = {
      batch_id: body.batch_id ? String(body.batch_id).trim() : null,
      course_id: body.course_id ? String(body.course_id).trim() : null,
      title,
      description: body.description != null ? String(body.description) : null,
      assessment_type: String(body.assessment_type || 'quiz').trim(),
      max_score: body.max_score != null && body.max_score !== '' ? Number(body.max_score) : null,
      pass_score: body.pass_score != null && body.pass_score !== '' ? Number(body.pass_score) : null,
      status: String(body.status || 'draft').trim(),
      due_at: body.due_at || null,
      created_by: String(auth.username || '').trim() || null,
    };
    const { data, error } = await supabase.from('assessments').insert(row).select('*').single();
    if (error) return json({ error: error.message || 'Create failed' }, 500);
    return json({ ok: true, item: data });
  }

  if (resource === 'questions') {
    const assessmentId = String(event.queryStringParameters?.assessment_id || '').trim();
    if (!assessmentId) return json({ error: 'assessment_id required' }, 400);
    if (event.httpMethod === 'GET') {
      const { data, error } = await supabase
        .from('assessment_questions')
        .select('*')
        .eq('assessment_id', assessmentId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) return json({ error: error.message || 'Could not load questions' }, 500);
      return json({ items: data || [] });
    }
    if (!canWrite(role)) return json({ error: 'Forbidden' }, 403);
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (_) {
      return json({ error: 'Invalid JSON' }, 400);
    }
    const prompt = String(body.prompt || '').trim();
    if (!prompt) return json({ error: 'prompt required' }, 400);
    const row = {
      assessment_id: assessmentId,
      question_type: String(body.question_type || 'mcq').trim(),
      prompt,
      options: body.options != null ? body.options : null,
      correct_answer: body.correct_answer != null ? body.correct_answer : null,
      points: body.points != null && body.points !== '' ? Number(body.points) : 1,
      sort_order: body.sort_order != null && body.sort_order !== '' ? Number(body.sort_order) : 0,
    };
    const { data, error } = await supabase.from('assessment_questions').insert(row).select('*').single();
    if (error) return json({ error: error.message || 'Create question failed' }, 500);
    return json({ ok: true, item: data });
  }

  if (resource === 'attempts') {
    const assessmentId = String(event.queryStringParameters?.assessment_id || '').trim();
    if (!assessmentId) return json({ error: 'assessment_id required' }, 400);
    if (event.httpMethod === 'GET') {
      const { data, error } = await supabase
        .from('assessment_attempts')
        .select('*')
        .eq('assessment_id', assessmentId)
        .order('started_at', { ascending: false })
        .limit(500);
      if (error) return json({ error: error.message || 'Could not load attempts' }, 500);
      return json({ items: data || [] });
    }
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (_) {
      return json({ error: 'Invalid JSON' }, 400);
    }
    const traineeId = String(body.trainee_id || '').trim();
    if (!traineeId) return json({ error: 'trainee_id required' }, 400);
    const row = {
      assessment_id: assessmentId,
      trainee_id: traineeId,
      attempt_no: body.attempt_no != null && body.attempt_no !== '' ? Number(body.attempt_no) : 1,
      status: String(body.status || 'submitted').trim(),
      answers: body.answers != null ? body.answers : null,
      score: body.score != null && body.score !== '' ? Number(body.score) : null,
      submitted_at: body.submitted_at || new Date().toISOString(),
      reviewed_by: canWrite(role) ? String(auth.username || '').trim() || null : null,
      reviewed_at: canWrite(role) ? new Date().toISOString() : null,
    };
    const { data, error } = await supabase
      .from('assessment_attempts')
      .upsert(row, { onConflict: 'assessment_id,trainee_id,attempt_no' })
      .select('*')
      .single();
    if (error) return json({ error: error.message || 'Save attempt failed' }, 500);
    return json({ ok: true, item: data });
  }

  if (resource === 'progress' && event.httpMethod === 'PATCH') {
    if (!canWrite(role)) return json({ error: 'Forbidden' }, 403);
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (_) {
      return json({ error: 'Invalid JSON' }, 400);
    }
    const traineeId = String(body.trainee_id || '').trim();
    const courseId = String(body.course_id || '').trim();
    if (!traineeId || !courseId) return json({ error: 'trainee_id and course_id required' }, 400);
    const row = {
      trainee_id: traineeId,
      course_id: courseId,
      batch_id: body.batch_id ? String(body.batch_id).trim() : null,
      progress_pct: body.progress_pct != null && body.progress_pct !== '' ? Number(body.progress_pct) : 0,
      status: String(body.status || 'in_progress').trim(),
      completed_at: body.completed_at || null,
      last_activity_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from('learner_course_progress')
      .upsert(row, { onConflict: 'trainee_id,course_id,batch_id' })
      .select('*')
      .single();
    if (error) return json({ error: error.message || 'Progress update failed' }, 500);
    return json({ ok: true, item: data });
  }

  return json({ error: 'Unknown resource' }, 400);
};

