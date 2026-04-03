const { cors, json, getSupabaseServiceClient, verifyAuth, normalizeDate } = require('../lib/_shared');

const TRAINER_ROLES = ['admin', 'trainer'];

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors };
  if (!['GET', 'POST', 'PUT', 'DELETE'].includes(event.httpMethod)) return json({ error: 'Method not allowed' }, 405);

  const auth = verifyAuth(event);
  if (!auth) return json({ error: 'Unauthorized' }, 401);
  if (!TRAINER_ROLES.includes(auth.role)) return json({ error: 'Trainer or admin role required' }, 403);

  const supabase = getSupabaseServiceClient();
  if (!supabase) return json({ error: 'Server config missing' }, 500);

  const resource = String(event.queryStringParameters?.resource || '').trim().toLowerCase();

  if (resource === 'materials') {
    const sessionId = String(event.queryStringParameters?.session_id || '').trim();
    const groupId = String(event.queryStringParameters?.group_id || '').trim();

    if (event.httpMethod === 'GET') {
      if (!sessionId && !groupId) return json({ error: 'session_id or group_id required' }, 400);
      let q = supabase.from('training_materials').select('*').order('sort_order', { ascending: true }).limit(200);
      if (sessionId) q = q.eq('session_id', sessionId);
      if (groupId) q = q.eq('group_id', groupId);
      const { data, error } = await q;
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
      const title = String(body.title || '').trim();
      const url = String(body.url || '').trim();
      if (!title || !url) return json({ error: 'title and url required' }, 400);
      const row = {
        session_id: body.session_id || null,
        group_id: body.group_id || null,
        title,
        url,
        sort_order: body.sort_order != null ? Number(body.sort_order) : 0,
      };
      const { data, error } = await supabase.from('training_materials').insert(row).select('*').single();
      if (error) return json({ error: error.message || 'Insert failed' }, 500);
      return json({ ok: true, item: data });
    }

    if (event.httpMethod === 'DELETE') {
      const id = String(event.queryStringParameters?.id || '').trim();
      if (!id) return json({ error: 'id required' }, 400);
      const { error } = await supabase.from('training_materials').delete().eq('id', id);
      if (error) return json({ error: error.message || 'Delete failed' }, 500);
      return json({ ok: true });
    }
  }

  if (resource === 'attendance') {
    const groupId = String(event.queryStringParameters?.group_id || '').trim();

    if (event.httpMethod === 'GET') {
      if (!groupId) return json({ error: 'group_id required' }, 400);
      const { data, error } = await supabase
        .from('session_attendance')
        .select('*')
        .eq('group_id', groupId)
        .order('attendance_date', { ascending: false })
        .limit(500);
      if (error) return json({ error: error.message || 'Could not load attendance' }, 500);
      return json({ items: data || [] });
    }

    if (event.httpMethod === 'POST') {
      let body;
      try {
        body = JSON.parse(event.body || '{}');
      } catch (_) {
        return json({ error: 'Invalid JSON' }, 400);
      }
      const gid = String(body.group_id || groupId || '').trim();
      const participant_name = String(body.participant_name || '').trim();
      const attendance_date = normalizeDate(body.attendance_date) || new Date().toISOString().slice(0, 10);
      if (!gid || !participant_name) return json({ error: 'group_id and participant_name required' }, 400);
      const row = {
        group_id: gid,
        participant_name,
        attendance_date,
        status: String(body.status || 'present').trim(),
        notes: body.notes != null ? String(body.notes).trim() : null,
      };
      const { data: existing } = await supabase
        .from('session_attendance')
        .select('id')
        .eq('group_id', gid)
        .eq('participant_name', participant_name)
        .eq('attendance_date', attendance_date)
        .maybeSingle();
      if (existing) {
        const { data, error } = await supabase
          .from('session_attendance')
          .update({ status: row.status, notes: row.notes })
          .eq('id', existing.id)
          .select('*')
          .single();
        if (error) return json({ error: error.message || 'Update failed' }, 500);
        return json({ ok: true, item: data });
      }
      const { data, error } = await supabase.from('session_attendance').insert(row).select('*').single();
      if (error) return json({ error: error.message || 'Insert failed' }, 500);
      return json({ ok: true, item: data });
    }

    if (event.httpMethod === 'DELETE') {
      const id = String(event.queryStringParameters?.id || '').trim();
      if (!id) return json({ error: 'id required' }, 400);
      const { error } = await supabase.from('session_attendance').delete().eq('id', id);
      if (error) return json({ error: error.message || 'Delete failed' }, 500);
      return json({ ok: true });
    }
  }

  return json({ error: 'Unknown resource or method' }, 400);
};
