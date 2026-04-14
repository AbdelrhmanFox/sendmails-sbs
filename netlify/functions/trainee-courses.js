const { cors, json, getSupabaseServiceClient } = require('../lib/_shared');
const { verifyTraineeAuth } = require('../lib/trainee-auth');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors };
  if (event.httpMethod !== 'GET') return json({ error: 'Method not allowed' }, 405);

  const auth = verifyTraineeAuth(event);
  if (!auth) return json({ error: 'Unauthorized' }, 401);
  const traineeId = String(auth.trainee_id || '').trim();
  if (!traineeId) return json({ error: 'Unauthorized' }, 401);

  const supabase = getSupabaseServiceClient();
  if (!supabase) return json({ error: 'Server config missing' }, 500);

  const { data: enrollments, error: ee } = await supabase
    .from('enrollments')
    .select('id, enrollment_id, batch_id, enrollment_status, payment_status, amount_paid, enroll_date, created_at')
    .eq('trainee_id', traineeId)
    .order('created_at', { ascending: false });
  if (ee) return json({ error: ee.message || 'Could not load enrollments' }, 500);

  const batchIds = [...new Set((enrollments || []).map((e) => e.batch_id).filter(Boolean))];
  let batchMap = {};
  if (batchIds.length) {
    const { data: batches, error: be } = await supabase
      .from('batches')
      .select('batch_id, batch_name, course_id, trainer, start_date, end_date')
      .in('batch_id', batchIds);
    if (be) return json({ error: be.message || 'Could not load batches' }, 500);
    (batches || []).forEach((b) => {
      batchMap[b.batch_id] = b;
    });
  }

  const courseIds = [...new Set(Object.values(batchMap).map((b) => b.course_id).filter(Boolean))];
  let courseMap = {};
  if (courseIds.length) {
    const { data: courses, error: ce } = await supabase
      .from('courses')
      .select('course_id, course_name, category, duration_hours')
      .in('course_id', courseIds);
    if (ce) return json({ error: ce.message || 'Could not load courses' }, 500);
    (courses || []).forEach((c) => {
      courseMap[c.course_id] = c;
    });
  }

  const { data: links } = await supabase.from('classroom_public_links').select('batch_id, token').in('batch_id', batchIds);
  const tokenByBatch = {};
  (links || []).forEach((l) => {
    tokenByBatch[l.batch_id] = l.token;
  });

  const items = (enrollments || []).map((e) => {
    const b = batchMap[e.batch_id] || {};
    const c = courseMap[b.course_id] || {};
    return {
      ...e,
      batch_name: b.batch_name || null,
      trainer: b.trainer || null,
      start_date: b.start_date || null,
      end_date: b.end_date || null,
      course_id: b.course_id || null,
      course_name: c.course_name || null,
      course_category: c.category || null,
      course_duration_hours: c.duration_hours || null,
      classroom_token: tokenByBatch[e.batch_id] || null,
    };
  });

  return json({ items });
};
