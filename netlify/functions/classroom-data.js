const { cors, json, getSupabaseServiceClient, verifyAuth, normalizeDate } = require('../lib/_shared');

const TRAINER_ROLES = ['admin', 'trainer'];

async function assertBatchAccess(supabase, auth, batchId) {
  const bid = String(batchId || '').trim();
  if (!bid) return { ok: false, status: 400, error: 'batch_id required' };
  const { data: b, error } = await supabase.from('batches').select('batch_id, trainer, course_id').eq('batch_id', bid).maybeSingle();
  if (error) return { ok: false, status: 500, error: error.message || 'Batch lookup failed' };
  if (!b) return { ok: false, status: 404, error: 'Batch not found' };
  if (auth.role === 'admin') return { ok: true, batch: b };
  const uname = String(auth.username || '').trim();
  if (String(b.trainer || '').trim() === uname) return { ok: true, batch: b };
  if (b.course_id) {
    const { data: mapRows, error: me } = await supabase
      .from('trainer_course_access')
      .select('id')
      .eq('trainer_username', uname)
      .eq('course_id', b.course_id)
      .limit(1);
    if (me) return { ok: false, status: 500, error: me.message || 'Access check failed' };
    if (mapRows && mapRows.length) return { ok: true, batch: b };
  }
  return { ok: false, status: 403, error: 'Forbidden' };
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

  if (resource === 'classrooms' && event.httpMethod === 'GET') {
    let q = supabase
      .from('batches')
      .select('batch_id, batch_name, course_id, trainer, start_date, end_date')
      .order('start_date', { ascending: false, nullsFirst: false })
      .limit(500);
    if (auth.role !== 'admin') {
      const { data: maps, error: me } = await supabase.from('trainer_course_access').select('course_id').eq('trainer_username', username);
      if (me) return json({ error: me.message || 'Could not load course access' }, 500);
      const cids = [...new Set((maps || []).map((m) => m.course_id).filter(Boolean))];
      if (!cids.length) return json({ items: [] });
      q = q.in('course_id', cids);
    }
    const { data: batches, error } = await q;
    if (error) return json({ error: error.message || 'Could not load batches' }, 500);
    const courseIds = [...new Set((batches || []).map((b) => b.course_id).filter(Boolean))];
    const courseNames = {};
    if (courseIds.length) {
      const { data: crs } = await supabase.from('courses').select('course_id, course_name').in('course_id', courseIds);
      (crs || []).forEach((c) => {
        courseNames[c.course_id] = c.course_name;
      });
    }
    const { data: ens } = await supabase.from('enrollments').select('batch_id');
    const counts = {};
    (ens || []).forEach((e) => {
      const k = e.batch_id;
      if (!k) return;
      counts[k] = (counts[k] || 0) + 1;
    });
    const items = (batches || []).map((b) => ({
      batch_id: b.batch_id,
      batch_name: b.batch_name,
      course_id: b.course_id,
      course_name: b.course_id ? courseNames[b.course_id] || '' : '',
      trainer: b.trainer,
      start_date: b.start_date,
      end_date: b.end_date,
      enrolled_count: counts[b.batch_id] || 0,
    }));
    return json({ items });
  }

  if (resource === 'share-link' && event.httpMethod === 'GET') {
    const batchId = String(event.queryStringParameters?.batch_id || '').trim();
    const gate = await assertBatchAccess(supabase, auth, batchId);
    if (!gate.ok) return json({ error: gate.error }, gate.status);
    const { data: existing } = await supabase.from('classroom_public_links').select('token').eq('batch_id', batchId).maybeSingle();
    let token = existing && existing.token;
    if (!token) {
      const ins = await supabase.from('classroom_public_links').insert({ batch_id: batchId }).select('token').single();
      if (ins.error) return json({ error: ins.error.message || 'Could not create share link' }, 500);
      token = ins.data.token;
    }
    return json({ token, batch_id: batchId });
  }

  if (resource === 'assignments') {
    const batchId = String(event.queryStringParameters?.batch_id || '').trim();

    if (event.httpMethod === 'GET') {
      const gate = await assertBatchAccess(supabase, auth, batchId);
      if (!gate.ok) return json({ error: gate.error }, gate.status);
      const { data, error } = await supabase
        .from('classroom_assignments')
        .select('*')
        .eq('batch_id', batchId)
        .order('created_at', { ascending: false });
      if (error) return json({ error: error.message || 'Could not load assignments' }, 500);
      return json({ items: data || [] });
    }

    if (event.httpMethod === 'POST') {
      let body;
      try {
        body = JSON.parse(event.body || '{}');
      } catch (_) {
        return json({ error: 'Invalid JSON' }, 400);
      }
      const bid = String(body.batch_id || batchId || '').trim();
      const gate = await assertBatchAccess(supabase, auth, bid);
      if (!gate.ok) return json({ error: gate.error }, gate.status);
      const title = String(body.title || '').trim();
      if (!title) return json({ error: 'title required' }, 400);
      const row = {
        batch_id: bid,
        title,
        instructions: body.instructions != null ? String(body.instructions) : null,
        due_date: normalizeDate(body.due_date),
        created_by: username,
      };
      const { data, error } = await supabase.from('classroom_assignments').insert(row).select('*').single();
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
      const { data: row, error: fe } = await supabase.from('classroom_assignments').select('batch_id').eq('id', id).maybeSingle();
      if (fe || !row) return json({ error: 'Assignment not found' }, 404);
      const gate = await assertBatchAccess(supabase, auth, row.batch_id);
      if (!gate.ok) return json({ error: gate.error }, gate.status);
      const title = String(body.title || '').trim();
      if (!title) return json({ error: 'title required' }, 400);
      const updates = {
        title,
        instructions: body.instructions != null ? String(body.instructions) : null,
        due_date: normalizeDate(body.due_date),
      };
      const { data, error } = await supabase.from('classroom_assignments').update(updates).eq('id', id).select('*').single();
      if (error) return json({ error: error.message || 'Update failed' }, 500);
      return json({ ok: true, item: data });
    }

    if (event.httpMethod === 'DELETE') {
      const id = String(event.queryStringParameters?.id || '').trim();
      if (!id) return json({ error: 'id required' }, 400);
      const { data: row, error: fe } = await supabase.from('classroom_assignments').select('batch_id').eq('id', id).maybeSingle();
      if (fe || !row) return json({ error: 'Assignment not found' }, 404);
      const gate = await assertBatchAccess(supabase, auth, row.batch_id);
      if (!gate.ok) return json({ error: gate.error }, gate.status);
      const { error } = await supabase.from('classroom_assignments').delete().eq('id', id);
      if (error) return json({ error: error.message || 'Delete failed' }, 500);
      return json({ ok: true });
    }

    return json({ error: 'Method not allowed' }, 405);
  }

  if (resource === 'grades') {
    const assignmentId = String(event.queryStringParameters?.assignment_id || '').trim();

    if (event.httpMethod === 'GET') {
      if (!assignmentId) return json({ error: 'assignment_id required' }, 400);
      const { data: asg, error: ae } = await supabase.from('classroom_assignments').select('id, batch_id, title').eq('id', assignmentId).maybeSingle();
      if (ae || !asg) return json({ error: 'Assignment not found' }, 404);
      const gate = await assertBatchAccess(supabase, auth, asg.batch_id);
      if (!gate.ok) return json({ error: gate.error }, gate.status);

      const { data: enrollRows } = await supabase.from('enrollments').select('trainee_id').eq('batch_id', asg.batch_id);
      const traineeIds = [...new Set((enrollRows || []).map((e) => e.trainee_id).filter(Boolean))];
      const names = {};
      if (traineeIds.length) {
        const { data: trs } = await supabase.from('trainees').select('trainee_id, full_name').in('trainee_id', traineeIds);
        (trs || []).forEach((t) => {
          names[t.trainee_id] = t.full_name || t.trainee_id;
        });
      }
      const { data: gradeRows } = await supabase.from('classroom_grades').select('*').eq('assignment_id', assignmentId);
      const byTrainee = {};
      (gradeRows || []).forEach((g) => {
        byTrainee[g.trainee_id] = g;
      });
      const roster = traineeIds.map((tid) => {
        const g = byTrainee[tid];
        return {
          trainee_id: tid,
          full_name: names[tid] || tid,
          grade_id: g ? g.id : null,
          grade: g && g.grade != null ? g.grade : null,
          feedback: g && g.feedback != null ? g.feedback : '',
        };
      });
      return json({ assignment: asg, roster });
    }

    if (event.httpMethod === 'POST') {
      let body;
      try {
        body = JSON.parse(event.body || '{}');
      } catch (_) {
        return json({ error: 'Invalid JSON' }, 400);
      }
      const aid = String(body.assignment_id || assignmentId || '').trim();
      const traineeId = String(body.trainee_id || '').trim();
      if (!aid || !traineeId) return json({ error: 'assignment_id and trainee_id required' }, 400);

      const { data: asg, error: ae } = await supabase.from('classroom_assignments').select('batch_id').eq('id', aid).maybeSingle();
      if (ae || !asg) return json({ error: 'Assignment not found' }, 404);
      const gate = await assertBatchAccess(supabase, auth, asg.batch_id);
      if (!gate.ok) return json({ error: gate.error }, gate.status);

      const gradeVal = body.grade;
      const grade = gradeVal === '' || gradeVal == null ? null : Number(gradeVal);
      if (grade != null && Number.isNaN(grade)) return json({ error: 'Invalid grade' }, 400);
      const feedback = body.feedback != null ? String(body.feedback) : null;

      const upsertRow = {
        assignment_id: aid,
        trainee_id: traineeId,
        grade,
        feedback,
        graded_by: username,
        graded_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('classroom_grades')
        .upsert(upsertRow, { onConflict: 'assignment_id,trainee_id' })
        .select('*')
        .single();
      if (error) return json({ error: error.message || 'Save failed' }, 500);
      return json({ ok: true, item: data });
    }

    return json({ error: 'Method not allowed' }, 405);
  }

  if (resource === 'submissions') {
    const assignmentId = String(event.queryStringParameters?.assignment_id || '').trim();

    if (event.httpMethod === 'GET') {
      if (!assignmentId) return json({ error: 'assignment_id required' }, 400);
      const { data: asg, error: ae } = await supabase.from('classroom_assignments').select('id, batch_id, title').eq('id', assignmentId).maybeSingle();
      if (ae || !asg) return json({ error: 'Assignment not found' }, 404);
      const gate = await assertBatchAccess(supabase, auth, asg.batch_id);
      if (!gate.ok) return json({ error: gate.error }, gate.status);

      const { data: subs, error: se } = await supabase
        .from('classroom_assignment_submissions')
        .select('*')
        .eq('assignment_id', assignmentId)
        .order('submitted_at', { ascending: false });
      if (se) return json({ error: se.message || 'Could not load submissions' }, 500);

      const ids = (subs || []).map((s) => s.id);
      const reviewsById = {};
      if (ids.length) {
        const { data: revs } = await supabase.from('classroom_submission_reviews').select('*').in('submission_id', ids);
        (revs || []).forEach((r) => {
          reviewsById[r.submission_id] = r;
        });
      }

      const items = (subs || []).map((s) => ({
        ...s,
        review: reviewsById[s.id] || null,
      }));
      return json({ assignment: asg, items });
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
      const { data: sub, error: se } = await supabase
        .from('classroom_assignment_submissions')
        .select('id, assignment_id')
        .eq('id', id)
        .maybeSingle();
      if (se || !sub) return json({ error: 'Submission not found' }, 404);
      const { data: asg, error: ae } = await supabase.from('classroom_assignments').select('batch_id').eq('id', sub.assignment_id).maybeSingle();
      if (ae || !asg) return json({ error: 'Assignment not found' }, 404);
      const gate = await assertBatchAccess(supabase, auth, asg.batch_id);
      if (!gate.ok) return json({ error: gate.error }, gate.status);

      const gradeVal = body.grade;
      const grade = gradeVal === '' || gradeVal == null ? null : Number(gradeVal);
      if (grade != null && Number.isNaN(grade)) return json({ error: 'Invalid grade' }, 400);
      const feedback = body.feedback != null ? String(body.feedback) : null;

      const { data: review, error: re } = await supabase
        .from('classroom_submission_reviews')
        .upsert(
          {
            submission_id: id,
            grade,
            feedback,
            reviewed_by: username,
            reviewed_at: new Date().toISOString(),
          },
          { onConflict: 'submission_id' },
        )
        .select('*')
        .single();
      if (re) return json({ error: re.message || 'Review save failed' }, 500);

      const { data: subRow, error: ue } = await supabase
        .from('classroom_assignment_submissions')
        .update({ status: 'reviewed', updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .single();
      if (ue) return json({ error: ue.message || 'Submission update failed' }, 500);

      return json({ ok: true, item: subRow, review });
    }

    return json({ error: 'Method not allowed' }, 405);
  }

  if (resource === 'materials') {
    const batchId = String(event.queryStringParameters?.batch_id || '').trim();

    if (event.httpMethod === 'GET') {
      const gate = await assertBatchAccess(supabase, auth, batchId);
      if (!gate.ok) return json({ error: gate.error }, gate.status);
      const { data, error } = await supabase
        .from('classroom_materials')
        .select('*')
        .eq('batch_id', batchId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) return json({ error: error.message || 'Could not load materials' }, 500);
      return json({ items: data || [] });
    }

    if (event.httpMethod === 'POST') {
      let body;
      try {
        body = JSON.parse(event.body || '{}');
      } catch (_) {
        return json({ error: 'Invalid JSON' }, 400);
      }
      const bid = String(body.batch_id || batchId || '').trim();
      const gate = await assertBatchAccess(supabase, auth, bid);
      if (!gate.ok) return json({ error: gate.error }, gate.status);
      const title = String(body.title || '').trim();
      const url = String(body.url || '').trim();
      if (!title || !url) return json({ error: 'title and url required' }, 400);
      const row = {
        batch_id: bid,
        title,
        url,
        description: body.description != null ? String(body.description) : null,
        sort_order: body.sort_order != null ? Number(body.sort_order) : 0,
      };
      const { data, error } = await supabase.from('classroom_materials').insert(row).select('*').single();
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
      const { data: row, error: fe } = await supabase.from('classroom_materials').select('batch_id').eq('id', id).maybeSingle();
      if (fe || !row) return json({ error: 'Material not found' }, 404);
      const gate = await assertBatchAccess(supabase, auth, row.batch_id);
      if (!gate.ok) return json({ error: gate.error }, gate.status);
      const title = String(body.title || '').trim();
      const url = String(body.url || '').trim();
      if (!title || !url) return json({ error: 'title and url required' }, 400);
      const updates = {
        title,
        url,
        description: body.description != null ? String(body.description) : null,
      };
      if (body.sort_order != null && !Number.isNaN(Number(body.sort_order))) {
        updates.sort_order = Number(body.sort_order);
      }
      const { data, error } = await supabase.from('classroom_materials').update(updates).eq('id', id).select('*').single();
      if (error) return json({ error: error.message || 'Update failed' }, 500);
      return json({ ok: true, item: data });
    }

    if (event.httpMethod === 'DELETE') {
      const id = String(event.queryStringParameters?.id || '').trim();
      if (!id) return json({ error: 'id required' }, 400);
      const { data: row, error: fe } = await supabase.from('classroom_materials').select('batch_id').eq('id', id).maybeSingle();
      if (fe || !row) return json({ error: 'Material not found' }, 404);
      const gate = await assertBatchAccess(supabase, auth, row.batch_id);
      if (!gate.ok) return json({ error: gate.error }, gate.status);
      const { error } = await supabase.from('classroom_materials').delete().eq('id', id);
      if (error) return json({ error: error.message || 'Delete failed' }, 500);
      return json({ ok: true });
    }

    return json({ error: 'Method not allowed' }, 405);
  }

  if (resource === 'assignment-files') {
    const assignmentId = String(event.queryStringParameters?.assignment_id || '').trim();

    if (event.httpMethod === 'GET') {
      if (!assignmentId) return json({ error: 'assignment_id required' }, 400);
      const { data: asg, error: ae } = await supabase.from('classroom_assignments').select('id, batch_id').eq('id', assignmentId).maybeSingle();
      if (ae || !asg) return json({ error: 'Assignment not found' }, 404);
      const gate = await assertBatchAccess(supabase, auth, asg.batch_id);
      if (!gate.ok) return json({ error: gate.error }, gate.status);
      const { data, error } = await supabase
        .from('classroom_assignment_files')
        .select('*')
        .eq('assignment_id', assignmentId)
        .order('created_at', { ascending: true });
      if (error) return json({ error: error.message || 'Could not load files' }, 500);
      return json({ items: data || [] });
    }

    if (event.httpMethod === 'POST') {
      let body;
      try {
        body = JSON.parse(event.body || '{}');
      } catch (_) {
        return json({ error: 'Invalid JSON' }, 400);
      }
      const aid = String(body.assignment_id || assignmentId || '').trim();
      if (!aid) return json({ error: 'assignment_id required' }, 400);
      const { data: asg, error: ae } = await supabase.from('classroom_assignments').select('id, batch_id').eq('id', aid).maybeSingle();
      if (ae || !asg) return json({ error: 'Assignment not found' }, 404);
      const gate = await assertBatchAccess(supabase, auth, asg.batch_id);
      if (!gate.ok) return json({ error: gate.error }, gate.status);
      const fileUrl = String(body.file_url || '').trim();
      const fileStorageKey = String(body.file_storage_key || '').trim();
      if (!fileUrl || !fileStorageKey) return json({ error: 'file_url and file_storage_key required' }, 400);
      const row = {
        assignment_id: aid,
        title: body.title != null ? String(body.title).trim() || null : null,
        file_url: fileUrl,
        file_storage_key: fileStorageKey,
        mime_type: body.mime_type != null ? String(body.mime_type) : null,
        file_size_bytes: body.file_size_bytes != null && !Number.isNaN(Number(body.file_size_bytes)) ? Number(body.file_size_bytes) : null,
      };
      const { data, error } = await supabase.from('classroom_assignment_files').insert(row).select('*').single();
      if (error) return json({ error: error.message || 'Insert failed' }, 500);
      return json({ ok: true, item: data });
    }

    if (event.httpMethod === 'DELETE') {
      const id = String(event.queryStringParameters?.id || '').trim();
      if (!id) return json({ error: 'id required' }, 400);
      const { data: row, error: fe } = await supabase
        .from('classroom_assignment_files')
        .select('id, assignment_id, file_storage_key')
        .eq('id', id)
        .maybeSingle();
      if (fe || !row) return json({ error: 'File not found' }, 404);
      const { data: asg, error: ae } = await supabase.from('classroom_assignments').select('batch_id').eq('id', row.assignment_id).maybeSingle();
      if (ae || !asg) return json({ error: 'Assignment not found' }, 404);
      const gate = await assertBatchAccess(supabase, auth, asg.batch_id);
      if (!gate.ok) return json({ error: gate.error }, gate.status);
      const { error } = await supabase.from('classroom_assignment_files').delete().eq('id', id);
      if (error) return json({ error: error.message || 'Delete failed' }, 500);
      if (row.file_storage_key) {
        await supabase.storage.from('classroom-assignment-files').remove([row.file_storage_key]);
      }
      return json({ ok: true });
    }

    return json({ error: 'Method not allowed' }, 405);
  }

  return json({ error: 'Unknown resource' }, 400);
};
