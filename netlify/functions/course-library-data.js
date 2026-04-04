const { cors, json, getSupabaseServiceClient, verifyAuth } = require('../lib/_shared');

const TRAINER_ROLES = ['admin', 'trainer'];

async function assertCourseAccess(supabase, auth, courseId) {
  const cid = String(courseId || '').trim();
  if (!cid) return { ok: false, status: 400, error: 'course_id required' };
  const { data: course, error } = await supabase.from('courses').select('course_id').eq('course_id', cid).maybeSingle();
  if (error) return { ok: false, status: 500, error: error.message || 'Course lookup failed' };
  if (!course) return { ok: false, status: 404, error: 'Course not found' };
  if (auth.role === 'admin') return { ok: true, course_id: cid };
  const uname = String(auth.username || '').trim();
  const { data: rows, error: be } = await supabase
    .from('batches')
    .select('batch_id')
    .eq('course_id', cid)
    .eq('trainer', uname)
    .limit(1);
  if (be) return { ok: false, status: 500, error: be.message || 'Access check failed' };
  if (rows && rows.length) return { ok: true, course_id: cid };
  return { ok: false, status: 403, error: 'Forbidden' };
}

function materialPublicRow(m) {
  return {
    id: m.id,
    course_id: m.course_id,
    chapter_id: m.chapter_id != null ? m.chapter_id : null,
    title: m.title,
    url: m.url,
    description: m.description,
    sort_order: m.sort_order,
    storage_object_key: m.storage_object_key || null,
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors };

  const auth = verifyAuth(event);
  if (!auth) return json({ error: 'Unauthorized' }, 401);
  if (!TRAINER_ROLES.includes(auth.role)) return json({ error: 'Trainer or admin role required' }, 403);

  const supabase = getSupabaseServiceClient();
  if (!supabase) return json({ error: 'Server config missing' }, 500);

  const username = String(auth.username || '').trim();
  const resource = String(event.queryStringParameters?.resource || '').trim().toLowerCase();

  if (resource === 'courses' && event.httpMethod === 'GET') {
    if (auth.role === 'admin') {
      const { data: items, error } = await supabase.from('courses').select('course_id, course_name').order('course_name').limit(500);
      if (error) return json({ error: error.message || 'Could not load courses' }, 500);
      return json({ items: items || [] });
    }
    const { data: batches, error: be } = await supabase.from('batches').select('course_id').eq('trainer', username);
    if (be) return json({ error: be.message || 'Could not load batches' }, 500);
    const ids = [...new Set((batches || []).map((b) => b.course_id).filter(Boolean))];
    if (!ids.length) return json({ items: [] });
    const { data: items, error } = await supabase.from('courses').select('course_id, course_name').in('course_id', ids).order('course_name');
    if (error) return json({ error: error.message || 'Could not load courses' }, 500);
    return json({ items: items || [] });
  }

  if (resource === 'library' && event.httpMethod === 'GET') {
    const courseId = String(event.queryStringParameters?.course_id || '').trim();
    const gate = await assertCourseAccess(supabase, auth, courseId);
    if (!gate.ok) return json({ error: gate.error }, gate.status);
    const { data: crs } = await supabase.from('courses').select('course_id, course_name').eq('course_id', courseId).maybeSingle();
    const { data: chapters, error: ce } = await supabase
      .from('course_chapters')
      .select('id, course_id, title, sort_order, created_at')
      .eq('course_id', courseId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (ce) return json({ error: ce.message || 'Could not load chapters' }, 500);
    const { data: materials, error: me } = await supabase
      .from('course_materials')
      .select('id, course_id, chapter_id, title, url, description, sort_order, storage_object_key, created_at')
      .eq('course_id', courseId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (me) return json({ error: me.message || 'Could not load materials' }, 500);
    const mats = materials || [];
    const uncategorized = mats.filter((m) => !m.chapter_id).map(materialPublicRow);
    const chaptersOut = (chapters || []).map((ch) => ({
      id: ch.id,
      title: ch.title,
      sort_order: ch.sort_order,
      materials: mats.filter((m) => m.chapter_id === ch.id).map(materialPublicRow),
    }));
    return json({
      course_id: courseId,
      course_name: crs && crs.course_name ? crs.course_name : '',
      chapters: chaptersOut,
      uncategorized,
    });
  }

  if (resource === 'chapters') {
    if (event.httpMethod === 'POST') {
      let body;
      try {
        body = JSON.parse(event.body || '{}');
      } catch (_) {
        return json({ error: 'Invalid JSON' }, 400);
      }
      const courseId = String(body.course_id || '').trim();
      const gate = await assertCourseAccess(supabase, auth, courseId);
      if (!gate.ok) return json({ error: gate.error }, gate.status);
      const title = String(body.title || '').trim();
      if (!title) return json({ error: 'title required' }, 400);
      const sortOrder = body.sort_order != null && !Number.isNaN(Number(body.sort_order)) ? Number(body.sort_order) : 0;
      const { data, error } = await supabase
        .from('course_chapters')
        .insert({ course_id: courseId, title, sort_order: sortOrder })
        .select('*')
        .single();
      if (error) return json({ error: error.message || 'Insert failed' }, 500);
      return json({ ok: true, item: data });
    }

    if (event.httpMethod === 'PATCH') {
      const id = String(event.queryStringParameters?.id || '').trim();
      if (!id) return json({ error: 'id required' }, 400);
      let body;
      try {
        body = JSON.parse(event.body || '{}');
      } catch (_) {
        return json({ error: 'Invalid JSON' }, 400);
      }
      const { data: row, error: fe } = await supabase.from('course_chapters').select('course_id').eq('id', id).maybeSingle();
      if (fe || !row) return json({ error: 'Chapter not found' }, 404);
      const gate = await assertCourseAccess(supabase, auth, row.course_id);
      if (!gate.ok) return json({ error: gate.error }, gate.status);
      const updates = {};
      if (body.title != null) updates.title = String(body.title).trim();
      if (body.sort_order != null && !Number.isNaN(Number(body.sort_order))) updates.sort_order = Number(body.sort_order);
      if (!Object.keys(updates).length) return json({ error: 'No fields to update' }, 400);
      if (updates.title !== undefined && !updates.title) return json({ error: 'title cannot be empty' }, 400);
      const { data, error } = await supabase.from('course_chapters').update(updates).eq('id', id).select('*').single();
      if (error) return json({ error: error.message || 'Update failed' }, 500);
      return json({ ok: true, item: data });
    }

    if (event.httpMethod === 'DELETE') {
      const id = String(event.queryStringParameters?.id || '').trim();
      if (!id) return json({ error: 'id required' }, 400);
      const { data: row, error: fe } = await supabase.from('course_chapters').select('course_id').eq('id', id).maybeSingle();
      if (fe || !row) return json({ error: 'Chapter not found' }, 404);
      const gate = await assertCourseAccess(supabase, auth, row.course_id);
      if (!gate.ok) return json({ error: gate.error }, gate.status);
      const { error } = await supabase.from('course_chapters').delete().eq('id', id);
      if (error) return json({ error: error.message || 'Delete failed' }, 500);
      return json({ ok: true });
    }

    return json({ error: 'Method not allowed' }, 405);
  }

  if (resource === 'materials') {
    if (event.httpMethod === 'POST') {
      let body;
      try {
        body = JSON.parse(event.body || '{}');
      } catch (_) {
        return json({ error: 'Invalid JSON' }, 400);
      }
      const courseId = String(body.course_id || '').trim();
      const gate = await assertCourseAccess(supabase, auth, courseId);
      if (!gate.ok) return json({ error: gate.error }, gate.status);
      const title = String(body.title || '').trim();
      const url = String(body.url || '').trim();
      if (!title || !url) return json({ error: 'title and url required' }, 400);
      let chapterId = body.chapter_id != null ? String(body.chapter_id).trim() : null;
      if (chapterId) {
        const { data: ch, error: che } = await supabase.from('course_chapters').select('course_id').eq('id', chapterId).maybeSingle();
        if (che || !ch || ch.course_id !== courseId) return json({ error: 'Invalid chapter' }, 400);
      } else {
        chapterId = null;
      }
      const sortOrder = body.sort_order != null && !Number.isNaN(Number(body.sort_order)) ? Number(body.sort_order) : 0;
      const row = {
        course_id: courseId,
        chapter_id: chapterId,
        title,
        url,
        description: body.description != null ? String(body.description) : null,
        sort_order: sortOrder,
        storage_object_key: body.storage_object_key != null ? String(body.storage_object_key) : null,
      };
      const { data, error } = await supabase.from('course_materials').insert(row).select('*').single();
      if (error) return json({ error: error.message || 'Insert failed' }, 500);
      return json({ ok: true, item: data });
    }

    if (event.httpMethod === 'PATCH') {
      const id = String(event.queryStringParameters?.id || '').trim();
      if (!id) return json({ error: 'id required' }, 400);
      let body;
      try {
        body = JSON.parse(event.body || '{}');
      } catch (_) {
        return json({ error: 'Invalid JSON' }, 400);
      }
      const { data: row, error: fe } = await supabase.from('course_materials').select('course_id, storage_object_key').eq('id', id).maybeSingle();
      if (fe || !row) return json({ error: 'Material not found' }, 404);
      const gate = await assertCourseAccess(supabase, auth, row.course_id);
      if (!gate.ok) return json({ error: gate.error }, gate.status);
      const courseId = row.course_id;
      const oldStorageKey = row.storage_object_key || null;
      const updates = {};
      if (body.title != null) updates.title = String(body.title).trim();
      if (body.url != null) updates.url = String(body.url).trim();
      if (body.description !== undefined) updates.description = body.description != null ? String(body.description) : null;
      if (body.sort_order != null && !Number.isNaN(Number(body.sort_order))) updates.sort_order = Number(body.sort_order);
      if (body.chapter_id !== undefined) {
        const cid = body.chapter_id != null ? String(body.chapter_id).trim() : '';
        if (!cid) {
          updates.chapter_id = null;
        } else {
          const { data: ch, error: che } = await supabase.from('course_chapters').select('course_id').eq('id', cid).maybeSingle();
          if (che || !ch || ch.course_id !== courseId) return json({ error: 'Invalid chapter' }, 400);
          updates.chapter_id = cid;
        }
      }
      if (body.storage_object_key !== undefined) {
        updates.storage_object_key = body.storage_object_key != null ? String(body.storage_object_key) : null;
      }
      if (!Object.keys(updates).length) return json({ error: 'No fields to update' }, 400);
      if (updates.title !== undefined && !updates.title) return json({ error: 'title cannot be empty' }, 400);
      if (updates.url !== undefined && !updates.url) return json({ error: 'url cannot be empty' }, 400);
      const { data, error } = await supabase.from('course_materials').update(updates).eq('id', id).select('*').single();
      if (error) return json({ error: error.message || 'Update failed' }, 500);
      if (oldStorageKey && updates.storage_object_key && oldStorageKey !== updates.storage_object_key) {
        await supabase.storage.from('course-materials').remove([oldStorageKey]);
      }
      return json({ ok: true, item: data });
    }

    if (event.httpMethod === 'DELETE') {
      const id = String(event.queryStringParameters?.id || '').trim();
      if (!id) return json({ error: 'id required' }, 400);
      const { data: row, error: fe } = await supabase.from('course_materials').select('course_id, storage_object_key').eq('id', id).maybeSingle();
      if (fe || !row) return json({ error: 'Material not found' }, 404);
      const gate = await assertCourseAccess(supabase, auth, row.course_id);
      if (!gate.ok) return json({ error: gate.error }, gate.status);
      const { error } = await supabase.from('course_materials').delete().eq('id', id);
      if (error) return json({ error: error.message || 'Delete failed' }, 500);
      if (row.storage_object_key) {
        await supabase.storage.from('course-materials').remove([row.storage_object_key]);
      }
      return json({ ok: true, storage_object_key: row.storage_object_key || null });
    }

    return json({ error: 'Method not allowed' }, 405);
  }

  return json({ error: 'Unknown resource' }, 400);
};
