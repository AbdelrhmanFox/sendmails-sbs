const { cors, json, getSupabaseServiceClient, verifyAuth } = require('../lib/_shared');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors };
  if (!['GET', 'POST', 'DELETE'].includes(event.httpMethod)) return json({ error: 'Method not allowed' }, 405);

  const auth = verifyAuth(event);
  if (!auth) return json({ error: 'Unauthorized' }, 401);
  if (!['admin', 'trainer'].includes(auth.role)) return json({ error: 'Trainer or admin role required' }, 403);

  const supabase = getSupabaseServiceClient();
  if (!supabase) return json({ error: 'Server config missing' }, 500);

  if (event.httpMethod === 'GET') {
    let q = supabase
      .from('training_sessions')
      .select('id, title, trainer_username, groups_count, whiteboard_enabled, created_at, training_groups(id, group_number, join_token)')
      .order('created_at', { ascending: false })
      .limit(50);
    if (auth.role === 'trainer') {
      q = q.eq('trainer_username', auth.username || '');
    }
    const { data, error } = await q;
    if (error) return json({ error: 'Could not load training sessions' }, 500);
    return json({ sessions: data || [] });
  }

  if (event.httpMethod === 'DELETE') {
    const sessionId = String(event.queryStringParameters?.id || '').trim();
    if (!sessionId) return json({ error: 'id is required' }, 400);
    const { data: row, error: loadErr } = await supabase
      .from('training_sessions')
      .select('id, trainer_username')
      .eq('id', sessionId)
      .maybeSingle();
    if (loadErr) return json({ error: 'Could not load session' }, 500);
    if (!row) return json({ error: 'Session not found' }, 404);
    if (auth.role !== 'admin' && row.trainer_username !== (auth.username || '')) {
      return json({ error: 'Not allowed to delete this session' }, 403);
    }
    const { error: delErr } = await supabase.from('training_sessions').delete().eq('id', sessionId);
    if (delErr) return json({ error: delErr.message || 'Could not delete session' }, 500);
    return json({ ok: true });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (_) {
    return json({ error: 'Invalid JSON' }, 400);
  }
  const title = String(body.title || '').trim();
  const groupsCount = Math.max(1, Math.min(12, Number(body.groupsCount || 1)));
  const whiteboardEnabled = body.whiteboardEnabled !== false;
  if (!title) return json({ error: 'Title is required' }, 400);

  const { data: session, error: sessionErr } = await supabase
    .from('training_sessions')
    .insert({
      trainer_username: auth.username || 'trainer',
      title,
      groups_count: groupsCount,
      whiteboard_enabled: whiteboardEnabled,
    })
    .select('*')
    .single();
  if (sessionErr) return json({ error: sessionErr.message || 'Could not create training session' }, 500);

  const groups = [];
  for (let i = 1; i <= groupsCount; i += 1) groups.push({ session_id: session.id, group_number: i });
  const { data: createdGroups, error: groupsErr } = await supabase
    .from('training_groups')
    .insert(groups)
    .select('id, group_number, join_token');
  if (groupsErr) return json({ error: groupsErr.message || 'Could not create training groups' }, 500);

  return json({
    ok: true,
    session,
    groups: (createdGroups || []).sort((a, b) => a.group_number - b.group_number),
  });
};
