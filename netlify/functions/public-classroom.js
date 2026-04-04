const { cors, json, getSupabaseServiceClient } = require('../lib/_shared');

/**
 * Public read-only classroom for trainees (no JWT).
 * GET ?token=<uuid> → batch label, course name, assignments, materials (no grades).
 */
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors };
  if (event.httpMethod !== 'GET') return json({ error: 'Method not allowed' }, 405);

  const token = String(event.queryStringParameters?.token || '').trim();
  if (!token) return json({ error: 'token is required' }, 400);

  const supabase = getSupabaseServiceClient();
  if (!supabase) return json({ error: 'Server config missing' }, 500);

  const { data: link, error: le } = await supabase.from('classroom_public_links').select('batch_id').eq('token', token).maybeSingle();
  if (le) return json({ error: 'Could not validate link' }, 500);
  if (!link) return json({ error: 'Invalid link' }, 404);

  const batchId = link.batch_id;
  const { data: batch, error: be } = await supabase
    .from('batches')
    .select('batch_id, batch_name, course_id, trainer, start_date, end_date')
    .eq('batch_id', batchId)
    .maybeSingle();
  if (be || !batch) return json({ error: 'Classroom not found' }, 404);

  let courseName = '';
  if (batch.course_id) {
    const { data: crs } = await supabase.from('courses').select('course_name').eq('course_id', batch.course_id).maybeSingle();
    if (crs && crs.course_name) courseName = crs.course_name;
  }

  const { data: assignments, error: ae } = await supabase
    .from('classroom_assignments')
    .select('id, title, instructions, due_date, created_at')
    .eq('batch_id', batchId)
    .order('created_at', { ascending: false });
  if (ae) return json({ error: 'Could not load assignments' }, 500);

  const { data: materials, error: me } = await supabase
    .from('classroom_materials')
    .select('id, title, url, description, sort_order')
    .eq('batch_id', batchId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (me) return json({ error: 'Could not load materials' }, 500);

  let course_library = null;
  if (batch.course_id) {
    const cid = batch.course_id;
    const { data: chRows, error: che } = await supabase
      .from('course_chapters')
      .select('id, title, sort_order')
      .eq('course_id', cid)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (che) return json({ error: 'Could not load course content' }, 500);
    const { data: cmRows, error: cme } = await supabase
      .from('course_materials')
      .select('id, chapter_id, title, url, description, sort_order')
      .eq('course_id', cid)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (cme) return json({ error: 'Could not load course content' }, 500);
    const mats = cmRows || [];
    const uncategorized = mats.filter((m) => !m.chapter_id).map((m) => ({ id: m.id, title: m.title, url: m.url, description: m.description }));
    const chapters = (chRows || []).map((ch) => ({
      id: ch.id,
      title: ch.title,
      sort_order: ch.sort_order,
      materials: mats
        .filter((m) => m.chapter_id === ch.id)
        .map((m) => ({ id: m.id, title: m.title, url: m.url, description: m.description })),
    }));
    course_library = { chapters, uncategorized };
  }

  return json({
    ok: true,
    batch: {
      batch_id: batch.batch_id,
      batch_name: batch.batch_name,
      course_id: batch.course_id,
      course_name: courseName,
      trainer: batch.trainer,
      start_date: batch.start_date,
      end_date: batch.end_date,
    },
    assignments: assignments || [],
    materials: materials || [],
    course_library,
  });
};
