const { cors, json, getSupabaseServiceClient } = require('../lib/_shared');
const { verifyTraineeAuth } = require('../lib/trainee-auth');
const { getEnrolledBatchIds } = require('../lib/trainee-portal');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors };
  if (event.httpMethod !== 'GET') return json({ error: 'Method not allowed' }, 405);

  const auth = verifyTraineeAuth(event);
  if (!auth) return json({ error: 'Unauthorized' }, 401);
  const traineeId = String(auth.trainee_id || '').trim();
  const traineeEmail = String(auth.email || '').trim().toLowerCase();

  const supabase = getSupabaseServiceClient();
  if (!supabase) return json({ error: 'Server config missing' }, 500);

  const batchIds = await getEnrolledBatchIds(supabase, traineeId);
  if (!batchIds.length) return json({ items: [] });
  const batchId = String(event.queryStringParameters?.batch_id || '').trim();
  if (!batchId) return json({ error: 'batch_id is required' }, 400);
  if (!batchIds.includes(batchId)) return json({ error: 'Forbidden' }, 403);

  const { data: batch, error: be } = await supabase
    .from('batches')
    .select('batch_id, batch_name, course_id, trainer, start_date, end_date')
    .eq('batch_id', batchId)
    .maybeSingle();
  if (be || !batch) return json({ error: 'Classroom not found' }, 404);

  let courseName = '';
  if (batch.course_id) {
    const { data: course } = await supabase.from('courses').select('course_name').eq('course_id', batch.course_id).maybeSingle();
    courseName = String(course?.course_name || '');
  }

  const { data: assignments, error: ae } = await supabase
    .from('classroom_assignments')
    .select('id, title, instructions, due_date, created_at')
    .eq('batch_id', batchId)
    .order('created_at', { ascending: false });
  if (ae) return json({ error: ae.message || 'Could not load assignments' }, 500);

  const asgIds = (assignments || []).map((a) => a.id);
  let submissionsByAssignment = {};
  if (asgIds.length) {
    const { data: subs } = await supabase
      .from('classroom_assignment_submissions')
      .select('id, assignment_id, submission_text, file_url, file_storage_key, status, submitted_at, updated_at')
      .in('assignment_id', asgIds)
      .eq('trainee_email', traineeEmail);
    (subs || []).forEach((s) => {
      submissionsByAssignment[s.assignment_id] = s;
    });
  }

  const { data: materials, error: me } = await supabase
    .from('classroom_materials')
    .select('id, chapter_id, title, url, description, sort_order, mime_type, storage_object_key')
    .eq('batch_id', batchId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (me) return json({ error: me.message || 'Could not load materials' }, 500);

  let courseLibrary = { chapters: [], uncategorized: [] };
  if (batch.course_id) {
    const { data: chRows } = await supabase
      .from('course_chapters')
      .select('id, title, sort_order')
      .eq('course_id', batch.course_id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    const { data: cmRows } = await supabase
      .from('course_materials')
      .select('id, chapter_id, title, url, description, sort_order, storage_object_key')
      .eq('course_id', batch.course_id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    const mats = cmRows || [];
    courseLibrary = {
      chapters: (chRows || []).map((ch) => ({
        id: ch.id,
        title: ch.title,
        sort_order: ch.sort_order,
        materials: mats.filter((m) => m.chapter_id === ch.id),
      })),
      uncategorized: mats.filter((m) => !m.chapter_id),
    };
  }

  return json({
    batch: {
      ...batch,
      course_name: courseName,
    },
    assignments: (assignments || []).map((a) => ({
      ...a,
      my_submission: submissionsByAssignment[a.id] || null,
    })),
    materials: materials || [],
    course_library: courseLibrary,
  });
};
